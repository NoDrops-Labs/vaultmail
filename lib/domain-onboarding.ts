import 'server-only';

import { storage } from '@/lib/storage';
import { withPrefix } from '@/lib/storage-keys';
import {
  CloudflareApiError,
  type CfZone,
  createZone,
  enableEmailRouting,
  findZoneByName,
  getZone,
  setCatchAllRule,
  triggerActivationCheck,
} from '@/lib/cloudflare-zones';
import { DOMAINS_SETTINGS_KEY } from '@/lib/admin-auth';
import { normalizeDomains, parseDomains } from '@/lib/domains';

export type OnboardingStep =
  | 'pending_ns'
  | 'active'
  | 'email_routing_enabled'
  | 'catch_all_configured'
  | 'added_to_app'
  | 'failed_retryable'
  | 'failed_terminal';

export type OnboardingRecord = {
  domain: string;
  zoneId: string | null;
  nameservers: string[] | null;
  cfStatus: string | null;
  step: OnboardingStep;
  error?: { code: number; message: string; retryable: boolean };
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
};

const ONBOARDING_PREFIX = withPrefix('domain:onboarding:');
const onboardingKey = (domain: string) => `${ONBOARDING_PREFIX}${domain}`;
const lockKey = (domain: string) => `${withPrefix('domain:onboarding-lock:')}${domain}`;
const DOMAINS_GLOBAL_LOCK_KEY = withPrefix('domain:settings-domains-lock');
const LOCK_TTL_SECONDS = 60;
const WORKER_NAME = 'dispomail-forwarder';

const nowIso = () => new Date().toISOString();

const HOSTNAME_REGEX = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const normalizeDomain = (domain: string): string =>
  domain.toLowerCase().trim().replace(/\.+$/, '');

const isValidDomain = (domain: string): boolean => {
  if (!domain || domain.length > 253) return false;
  if (domain.includes('://') || domain.includes('/') || domain.includes('?')) return false;
  if (domain.includes(' ') || domain.includes('\t')) return false;
  return HOSTNAME_REGEX.test(domain);
};

const readRecord = async (domain: string): Promise<OnboardingRecord | null> => {
  const raw = await storage.get(onboardingKey(domain));
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as OnboardingRecord;
    } catch {
      return null;
    }
  }
  return raw as OnboardingRecord;
};

const writeRecord = async (record: OnboardingRecord): Promise<void> => {
  await storage.set(onboardingKey(record.domain), record);
};

const releaseLock = async (domain: string): Promise<void> => {
  await storage.del(lockKey(domain));
};

const fromCfError = (err: unknown): OnboardingRecord['error'] => {
  if (err instanceof CloudflareApiError) {
    return {
      code: err.cfError.code,
      message: err.cfError.message,
      retryable: err.cfError.retryable,
    };
  }
  if (err instanceof Error) {
    return { code: 0, message: err.message, retryable: true };
  }
  return { code: 0, message: 'Unknown error', retryable: true };
};

const isTerminal = (err: unknown): boolean => {
  if (err instanceof CloudflareApiError) {
    return !err.cfError.retryable;
  }
  return false;
};

const TERMINAL_CF_STATUSES = new Set(['moved', 'deleted']);

const stepFromZoneStatus = (status: string): OnboardingStep => {
  if (status === 'active') return 'active';
  if (TERMINAL_CF_STATUSES.has(status)) return 'failed_terminal';
  return 'pending_ns';
};

const buildRecordFromZone = (zone: CfZone): OnboardingRecord => {
  const ts = nowIso();
  return {
    domain: zone.name,
    zoneId: zone.id,
    nameservers: zone.name_servers,
    cfStatus: zone.status,
    step: stepFromZoneStatus(zone.status),
    createdAt: ts,
    updatedAt: ts,
    lastCheckedAt: ts,
  };
};

const canRetryStart = (record: OnboardingRecord | null): boolean => {
  if (!record) return true;
  if (record.step === 'added_to_app') return false;
  if (record.step === 'failed_terminal') return false;
  if (record.step === 'failed_retryable' && !record.zoneId) return true;
  return false;
};

export async function startOnboarding(domainInput: string): Promise<OnboardingRecord> {
  const domain = normalizeDomain(domainInput);
  if (!isValidDomain(domain)) {
    throw new Error('Invalid domain. Use a valid hostname like example.com (no scheme, path, or query).');
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
  }

  const existing = await readRecord(domain);
  if (existing && !canRetryStart(existing)) {
    return existing;
  }

  const acquired = await storage.setIfAbsent(lockKey(domain), '1', { ex: LOCK_TTL_SECONDS });
  if (!acquired) {
    const locked = await readRecord(domain);
    if (locked) return locked;
    throw new Error('Another onboarding is in progress. Try again in a minute.');
  }

  try {
    const existingZone = await findZoneByName(domain);
    let zone: CfZone;
    if (existingZone) {
      zone = existingZone;
    } else {
      zone = await createZone(domain, accountId);
    }

    const record = buildRecordFromZone(zone);
    const prev = await readRecord(domain);
    if (prev) {
      record.createdAt = prev.createdAt;
    }
    await writeRecord(record);
    return record;
  } catch (err) {
    const prev = await readRecord(domain);
    const record: OnboardingRecord = {
      domain,
      zoneId: prev?.zoneId ?? null,
      nameservers: prev?.nameservers ?? null,
      cfStatus: prev?.cfStatus ?? null,
      step: isTerminal(err) ? 'failed_terminal' : 'failed_retryable',
      error: fromCfError(err),
      createdAt: prev?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      lastCheckedAt: nowIso(),
    };
    await writeRecord(record);
    return record;
  } finally {
    await releaseLock(domain);
  }
}

export async function syncOnboarding(domainInput: string): Promise<OnboardingRecord> {
  const domain = normalizeDomain(domainInput);
  const record = await readRecord(domain);
  if (!record) {
    throw new Error(`No onboarding record for ${domain}`);
  }
  if (record.step === 'added_to_app' || record.step === 'failed_terminal') {
    return record;
  }

  const acquired = await storage.setIfAbsent(lockKey(domain), '1', { ex: LOCK_TTL_SECONDS });
  if (!acquired) {
    throw new Error('Another sync is in progress. Try again in a minute.');
  }

  try {
    if (!record.zoneId) {
      throw new Error('Missing zoneId — cannot sync. Re-add the domain to retry.');
    }

    // On retry, re-check from the beginning. All CF operations are idempotent.
    if (record.step === 'failed_retryable') {
      record.step = 'pending_ns';
      record.error = undefined;
    }

    if (record.step === 'pending_ns') {
      const zone = await getZone(record.zoneId);
      record.cfStatus = zone.status;
      record.lastCheckedAt = nowIso();

      if (TERMINAL_CF_STATUSES.has(zone.status)) {
        record.step = 'failed_terminal';
        record.error = {
          code: 0,
          message: `Zone status is "${zone.status}". Manual intervention required.`,
          retryable: false,
        };
        record.updatedAt = nowIso();
        await writeRecord(record);
        return record;
      }

      if (zone.status === 'active') {
        record.step = 'active';
        record.error = undefined;
      } else {
        try {
          await triggerActivationCheck(record.zoneId);
        } catch {
          // Activation check is rate-limited (1/hr free, 1/5min paid); ignore failures.
        }
      }
      await writeRecord(record);
      if (record.step !== 'active') return record;
    }

    if (record.step === 'active') {
      await enableEmailRouting(record.zoneId);
      record.step = 'email_routing_enabled';
      record.error = undefined;
      record.updatedAt = nowIso();
      await writeRecord(record);
    }

    if (record.step === 'email_routing_enabled') {
      await setCatchAllRule(record.zoneId, WORKER_NAME);
      record.step = 'catch_all_configured';
      record.error = undefined;
      record.updatedAt = nowIso();
      await writeRecord(record);
    }

    if (record.step === 'catch_all_configured') {
      const globalAcquired = await storage.setIfAbsent(DOMAINS_GLOBAL_LOCK_KEY, '1', { ex: LOCK_TTL_SECONDS });
      if (!globalAcquired) {
        throw new Error('Settings are being updated by another operation. Try sync again.');
      }
      try {
        const storedRaw = await storage.get(DOMAINS_SETTINGS_KEY);
        const current = normalizeDomains(parseDomains(storedRaw));
        const next = normalizeDomains([...current, record.domain]);
        await storage.set(DOMAINS_SETTINGS_KEY, { domains: next });
      } finally {
        await storage.del(DOMAINS_GLOBAL_LOCK_KEY);
      }
      record.step = 'added_to_app';
      record.updatedAt = nowIso();
      record.error = undefined;
      await writeRecord(record);
    }

    return record;
  } catch (err) {
    record.step = isTerminal(err) ? 'failed_terminal' : 'failed_retryable';
    record.error = fromCfError(err);
    record.updatedAt = nowIso();
    await writeRecord(record);
    return record;
  } finally {
    await releaseLock(domain);
  }
}

export async function getOnboarding(domainInput: string): Promise<OnboardingRecord | null> {
  return readRecord(normalizeDomain(domainInput));
}

export async function listOnboarding(): Promise<OnboardingRecord[]> {
  const pattern = `${ONBOARDING_PREFIX}*`;
  const keys = await storage.kvKeys(pattern);
  const records: OnboardingRecord[] = [];
  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      continue;
    }
    records.push(parsed as OnboardingRecord);
  }
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
