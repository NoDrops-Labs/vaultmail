import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
  },
}));

import {
  normalizeDomains,
  parseDomains,
  getStoredDomains,
  getDomains,
  getMasterDomains,
  isAddressSupported,
} from '@/lib/domains';
import { storage } from '@/lib/storage';

const mockedStorageGet = vi.mocked(storage.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizeDomains', () => {
  it('lowercases domains', () => {
    expect(normalizeDomains(['Foo.COM', 'Bar.ORG'])).toEqual([
      'foo.com',
      'bar.org',
    ]);
  });

  it('trims whitespace', () => {
    expect(normalizeDomains(['  foo.com  ', 'bar.org'])).toEqual([
      'foo.com',
      'bar.org',
    ]);
  });

  it('filters empty strings', () => {
    expect(normalizeDomains(['foo.com', '', '   ', 'bar.org'])).toEqual([
      'foo.com',
      'bar.org',
    ]);
  });

  it('deduplicates', () => {
    expect(normalizeDomains(['foo.com', 'foo.com', 'bar.org'])).toEqual([
      'foo.com',
      'bar.org',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeDomains([])).toEqual([]);
  });
});

describe('parseDomains', () => {
  it('returns empty array for null/undefined', () => {
    expect(parseDomains(null)).toEqual([]);
    expect(parseDomains(undefined)).toEqual([]);
  });

  it('parses JSON string array', () => {
    expect(parseDomains('["a.com","b.com"]')).toEqual(['a.com', 'b.com']);
  });

  it('returns empty for invalid JSON string', () => {
    expect(parseDomains('not json')).toEqual([]);
  });

  it('returns array directly', () => {
    expect(parseDomains(['a.com', 'b.com'])).toEqual(['a.com', 'b.com']);
  });

  it('extracts .domains from object', () => {
    expect(parseDomains({ domains: ['a.com', 'b.com'] })).toEqual(['a.com', 'b.com']);
  });

  it('returns empty for object without domains field', () => {
    expect(parseDomains({ other: 'value' })).toEqual([]);
  });

  it('returns empty for number', () => {
    expect(parseDomains(42)).toEqual([]);
  });
});

describe('getStoredDomains', () => {
  it('returns normalized domains from storage', async () => {
    mockedStorageGet.mockResolvedValueOnce(['Foo.COM', 'bar.org']);
    const result = await getStoredDomains();
    expect(result).toEqual(['foo.com', 'bar.org']);
  });

  it('returns empty array when storage is empty', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    const result = await getStoredDomains();
    expect(result).toEqual([]);
  });

  it('parses JSON string from storage', async () => {
    mockedStorageGet.mockResolvedValueOnce('["foo.com"]');
    const result = await getStoredDomains();
    expect(result).toEqual(['foo.com']);
  });
});

describe('getDomains', () => {
  it('returns expanded domains when master config exists', async () => {
    mockedStorageGet.mockResolvedValueOnce([
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ]);
    const result = await getDomains();
    expect(result).toEqual(['example.com', 'sub1.example.com']);
  });

  it('falls back to flat stored domains when no master config', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    mockedStorageGet.mockResolvedValueOnce(['foo.com']);
    const result = await getDomains();
    expect(result).toEqual(['foo.com']);
  });

  it('returns empty array when no config and no flat domains', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    mockedStorageGet.mockResolvedValueOnce(null);
    const result = await getDomains();
    expect(result).toEqual([]);
  });

  it('does NOT fall back to any hardcoded domain', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    mockedStorageGet.mockResolvedValueOnce(null);
    const result = await getDomains();
    expect(result).toEqual([]);
  });
});

describe('getMasterDomains', () => {
  it('returns structured config from storage', async () => {
    const config = [
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ];
    mockedStorageGet.mockResolvedValueOnce(config);
    const result = await getMasterDomains();
    expect(result).toEqual(config);
  });

  it('returns empty array when storage empty', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    const result = await getMasterDomains();
    expect(result).toEqual([]);
  });

  it('parses JSON string config', async () => {
    const config = [
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: [] },
    ];
    mockedStorageGet.mockResolvedValueOnce(JSON.stringify(config));
    const result = await getMasterDomains();
    expect(result).toEqual(config);
  });
});

describe('isAddressSupported', () => {
  it('returns true for root domain in config', async () => {
    mockedStorageGet.mockResolvedValueOnce([
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ]);
    expect(await isAddressSupported('user@example.com')).toBe(true);
  });

  it('returns true for configured subdomain', async () => {
    mockedStorageGet.mockResolvedValueOnce([
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ]);
    expect(await isAddressSupported('user@sub1.example.com')).toBe(true);
  });

  it('returns false for unconfigured subdomain', async () => {
    mockedStorageGet.mockResolvedValueOnce([
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ]);
    expect(await isAddressSupported('user@unknown.example.com')).toBe(false);
  });

  it('returns false for completely unknown domain', async () => {
    mockedStorageGet.mockResolvedValueOnce([
      { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1'] },
    ]);
    expect(await isAddressSupported('user@notrelated.io')).toBe(false);
  });

  it('falls back to flat domain check when no master config', async () => {
    mockedStorageGet.mockResolvedValueOnce(null);
    mockedStorageGet.mockResolvedValueOnce(['foo.com']);
    expect(await isAddressSupported('user@foo.com')).toBe(true);
    expect(await isAddressSupported('user@bar.org')).toBe(false);
  });

  it('returns false for email without @', async () => {
    mockedStorageGet.mockResolvedValueOnce([]);
    expect(await isAddressSupported('notanemail')).toBe(false);
  });
});
