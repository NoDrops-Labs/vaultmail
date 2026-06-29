import { storage } from '@/lib/storage';
import { DOMAINS_SETTINGS_KEY, DOMAINS_CONFIG_SETTINGS_KEY } from '@/lib/admin-auth';
import {
  type MasterDomainConfig,
} from '@/lib/domain-config';

type DomainsPayload = {
  domains: string[];
};

export const normalizeDomains = (domains: string[]) => {
  const normalized = domains
    .map((domain) => domain.toLowerCase().trim())
    .filter(Boolean);
  return [...new Set(normalized)];
};

export const parseDomains = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object' && value) {
    const payload = value as DomainsPayload;
    if (Array.isArray(payload.domains)) {
      return payload.domains;
    }
  }
  return [];
};

const parseMasterDomainConfig = (value: unknown): MasterDomainConfig[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as MasterDomainConfig[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value as MasterDomainConfig[];
  }
  return [];
};

export const getStoredDomains = async () => {
  const storedRaw = await storage.get(DOMAINS_SETTINGS_KEY);
  return normalizeDomains(parseDomains(storedRaw));
};

export const getMasterDomains = async (): Promise<MasterDomainConfig[]> => {
  const storedRaw = await storage.get(DOMAINS_CONFIG_SETTINGS_KEY);
  return parseMasterDomainConfig(storedRaw);
};

export const getDomains = async (): Promise<string[]> => {
  const [config, flatDomains] = await Promise.all([
    getMasterDomains(),
    getStoredDomains(),
  ]);

  const active = new Set<string>();
  const configDomains = new Set<string>();

  for (const entry of config) {
    configDomains.add(entry.domain.toLowerCase().trim());
    if (entry.enabled !== false) {
      const subs = entry.subdomains.map((label) => `${label}.${entry.domain}`);
      const all = entry.allowRoot ? [entry.domain, ...subs] : subs;
      for (const d of all) active.add(d.toLowerCase().trim());
    }
  }

  for (const domain of flatDomains) {
    if (!configDomains.has(domain.toLowerCase().trim())) {
      active.add(domain.toLowerCase().trim());
    }
  }

  return [...active];
};

export const isAddressSupported = async (email: string): Promise<boolean> => {
  const domain = email.split('@').pop();
  if (!domain) return false;
  const allDomains = await getDomains();
  return allDomains.includes(domain.toLowerCase().trim());
};
