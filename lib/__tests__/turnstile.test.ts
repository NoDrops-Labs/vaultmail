import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  delete process.env.TURNSTILE_SECRET_KEY;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

const mockFetchSuccess = (success: boolean) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success })
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('verifyTurnstileToken', () => {
  it('returns true when Cloudflare API reports success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = mockFetchSuccess(true);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    const body = (init?.body as URLSearchParams).toString();
    expect(body).toContain('secret=test-secret');
    expect(body).toContain('response=valid-token');
  });

  it('returns false when Cloudflare API reports failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    mockFetchSuccess(false);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('some-token');
    expect(result).toBe(false);
  });

  it('returns true when TURNSTILE_SECRET_KEY is not set (dev mode)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('any-token');
    expect(result).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns true when TURNSTILE_SECRET_KEY is empty string (dev mode)', async () => {
    process.env.TURNSTILE_SECRET_KEY = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('any-token');
    expect(result).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns true when TURNSTILE_SECRET_KEY is whitespace-only (dev mode)', async () => {
    process.env.TURNSTILE_SECRET_KEY = '   ';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('any-token');
    expect(result).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false when token is empty and secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('');
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false when token is whitespace-only and secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('   ');
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false when fetch throws', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(false);
  });

  it('returns false when fetch response is not ok', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: true })
    });
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(false);
  });

  it('returns false when response json lacks success field', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    vi.stubGlobal('fetch', fetchMock);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token');
    expect(result).toBe(false);
  });

  it('trims whitespace from the configured secret before sending', async () => {
    process.env.TURNSTILE_SECRET_KEY = '  test-secret  ';
    const fetchMock = mockFetchSuccess(true);
    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    await verifyTurnstileToken('valid-token');
    const [, init] = fetchMock.mock.calls[0];
    const body = (init?.body as URLSearchParams).toString();
    expect(body).toContain('secret=test-secret');
  });
});
