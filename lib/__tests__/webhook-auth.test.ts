import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateWebhookSecret, WEBHOOK_SECRET_HEADER } from '@/lib/webhook-auth';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  delete process.env.WEBHOOK_SECRET;
  delete process.env.ALLOW_UNAUTHENTICATED_WEBHOOK;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

const makeRequest = (secret?: string): Request => {
  const headers = new Headers();
  if (secret !== undefined) {
    headers.set(WEBHOOK_SECRET_HEADER, secret);
  }
  return new Request('https://example.com/api/webhook', { headers });
};

describe('validateWebhookSecret', () => {
  it('returns true when secret matches', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    expect(validateWebhookSecret(makeRequest('my-secret'))).toBe(true);
  });

  it('returns false when secret does not match', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    expect(validateWebhookSecret(makeRequest('wrong-secret'))).toBe(false);
  });

  it('returns false when header is missing but secret is configured', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    expect(validateWebhookSecret(makeRequest())).toBe(false);
  });

  it('returns false when header is empty string', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    expect(validateWebhookSecret(makeRequest(''))).toBe(false);
  });

  it('FAILS CLOSED: returns false when secret not configured and no bypass', () => {
    expect(validateWebhookSecret(makeRequest('anything'))).toBe(false);
  });

  it('FAILS CLOSED: returns false when secret not configured, no bypass, no header', () => {
    expect(validateWebhookSecret(makeRequest())).toBe(false);
  });

  it('allows bypass when ALLOW_UNAUTHENTICATED_WEBHOOK=true and no secret configured', () => {
    process.env.ALLOW_UNAUTHENTICATED_WEBHOOK = 'true';
    expect(validateWebhookSecret(makeRequest())).toBe(true);
  });

  it('allows bypass even with wrong header when bypass is active', () => {
    process.env.ALLOW_UNAUTHENTICATED_WEBHOOK = 'true';
    expect(validateWebhookSecret(makeRequest('wrong'))).toBe(true);
  });

  it('does NOT allow bypass when secret IS configured (secret takes precedence)', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    process.env.ALLOW_UNAUTHENTICATED_WEBHOOK = 'true';
    expect(validateWebhookSecret(makeRequest('wrong'))).toBe(false);
    expect(validateWebhookSecret(makeRequest('my-secret'))).toBe(true);
  });

  it('trims whitespace from configured secret', () => {
    process.env.WEBHOOK_SECRET = '  my-secret  ';
    expect(validateWebhookSecret(makeRequest('my-secret'))).toBe(true);
  });

  it('trims whitespace from provided header', () => {
    process.env.WEBHOOK_SECRET = 'my-secret';
    expect(validateWebhookSecret(makeRequest('  my-secret  '))).toBe(true);
  });

  it('bypass value must be exactly "true" (not "yes" or "1")', () => {
    process.env.ALLOW_UNAUTHENTICATED_WEBHOOK = 'yes';
    expect(validateWebhookSecret(makeRequest())).toBe(false);
  });
});
