import 'server-only';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export type CfZoneStatus = 'initializing' | 'pending' | 'active' | 'moved' | 'deleted';

export type CfZone = {
  id: string;
  name: string;
  status: CfZoneStatus;
  name_servers: string[];
};

export type CfError = {
  status: number;
  code: number;
  message: string;
  retryable: boolean;
};

export class CloudflareApiError extends Error {
  readonly cfError: CfError;

  constructor(cfError: CfError) {
    super(cfError.message);
    this.name = 'CloudflareApiError';
    this.cfError = cfError;
  }
}

type CfEnvelope<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: T;
};

const getToken = (): string => {
  const token = process.env.CLOUDFLARE_ADMIN_API_TOKEN;
  if (!token) {
    throw new CloudflareApiError({
      status: 500,
      code: 0,
      message: 'CLOUDFLARE_ADMIN_API_TOKEN is not configured',
      retryable: false,
    });
  }
  return token;
};

const normalizeError = (status: number, body: unknown): CfError => {
  let code = 0;
  let message = 'Unknown Cloudflare API error';
  if (body && typeof body === 'object') {
    const envelope = body as Partial<CfEnvelope<unknown>>;
    if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
      code = envelope.errors[0].code ?? 0;
      message = envelope.errors[0].message ?? message;
    }
  }
  const retryable = status === 429 || status >= 500;
  return { status, code, message, retryable };
};

const CF_TIMEOUT_MS = 15_000;

const cfFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${CF_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CloudflareApiError({
        status: 408,
        code: 0,
        message: 'Cloudflare API request timed out',
        retryable: true,
      });
    }
    throw err;
  }
  clearTimeout(timeout);

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CloudflareApiError(normalizeError(response.status, body));
  }

  const envelope = body as CfEnvelope<T>;
  if (!envelope.success || !envelope.result) {
    throw new CloudflareApiError({
      status: response.status,
      code: 0,
      message: 'Cloudflare API returned success=false without result',
      retryable: false,
    });
  }
  return envelope.result as T;
};

type RawZone = {
  id: string;
  name: string;
  status: string;
  name_servers?: string[];
};

const toZone = (raw: RawZone): CfZone => ({
  id: raw.id,
  name: raw.name,
  status: raw.status as CfZoneStatus,
  name_servers: raw.name_servers ?? [],
});

export async function findZoneByName(name: string): Promise<CfZone | null> {
  const result = await cfFetch<RawZone[]>(`/zones?name=${encodeURIComponent(name)}`);
  if (!Array.isArray(result) || result.length === 0) return null;
  return toZone(result[0]);
}

export async function createZone(name: string, accountId: string): Promise<CfZone> {
  const result = await cfFetch<RawZone>(`/zones`, {
    method: 'POST',
    body: JSON.stringify({
      account: { id: accountId },
      name,
      type: 'full',
    }),
  });
  return toZone(result);
}

export async function getZone(zoneId: string): Promise<CfZone> {
  const result = await cfFetch<RawZone>(`/zones/${encodeURIComponent(zoneId)}`);
  return toZone(result);
}

export async function triggerActivationCheck(zoneId: string): Promise<void> {
  await cfFetch<{ id: string }>(
    `/zones/${encodeURIComponent(zoneId)}/activation_check`,
    { method: 'PUT' }
  );
}

export async function enableEmailRouting(zoneId: string): Promise<void> {
  await cfFetch<{ id: string; enabled: boolean }>(
    `/zones/${encodeURIComponent(zoneId)}/email/routing/enable`,
    { method: 'POST', body: '{}' }
  );
}

export async function setCatchAllRule(zoneId: string, workerName: string): Promise<void> {
  await cfFetch<unknown>(
    `/zones/${encodeURIComponent(zoneId)}/email/routing/rules/catch_all`,
    {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        actions: [{ type: 'worker', value: [workerName] }],
        matchers: [{ type: 'all' }],
        name: 'Catch-all to Vaultmail Worker',
      }),
    }
  );
}

export function isCloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_ADMIN_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

export async function deleteZone(zoneId: string): Promise<void> {
  await cfFetch<{ id: string }>(
    `/zones/${encodeURIComponent(zoneId)}`,
    { method: 'DELETE' }
  );
}
