import { describe, it, expect } from 'vitest';
import {
  expandDomains,
  isDomainInConfig,
  type MasterDomainConfig,
} from '@/lib/domain-config';

const sampleConfig: MasterDomainConfig[] = [
  { owner: 'Test', domain: 'example.com', allowRoot: true, subdomains: ['sub1', 'sub2'] },
  { owner: 'Test', domain: 'other.org', allowRoot: false, subdomains: ['a', 'b'] },
];

describe('expandDomains', () => {
  it('includes root domain when allowRoot is true', () => {
    const result = expandDomains(sampleConfig);
    expect(result).toContain('example.com');
  });

  it('excludes root domain when allowRoot is false', () => {
    const result = expandDomains(sampleConfig);
    expect(result).not.toContain('other.org');
  });

  it('expands subdomains as label.domain', () => {
    const result = expandDomains(sampleConfig);
    expect(result).toContain('sub1.example.com');
    expect(result).toContain('sub2.example.com');
    expect(result).toContain('a.other.org');
    expect(result).toContain('b.other.org');
  });

  it('returns empty array for empty config', () => {
    expect(expandDomains([])).toEqual([]);
  });

  it('handles domain with no subdomains and allowRoot true', () => {
    const config: MasterDomainConfig[] = [
      { owner: 'Test', domain: 'bare.com', allowRoot: true, subdomains: [] },
    ];
    expect(expandDomains(config)).toEqual(['bare.com']);
  });

  it('handles domain with no subdomains and allowRoot false (returns empty)', () => {
    const config: MasterDomainConfig[] = [
      { owner: 'Test', domain: 'bare.com', allowRoot: false, subdomains: [] },
    ];
    expect(expandDomains(config)).toEqual([]);
  });
});

describe('isDomainInConfig', () => {
  it('returns true for root domain when allowRoot is true', () => {
    expect(isDomainInConfig('example.com', sampleConfig)).toBe(true);
  });

  it('returns false for root domain when allowRoot is false', () => {
    expect(isDomainInConfig('other.org', sampleConfig)).toBe(false);
  });

  it('returns true for configured subdomain', () => {
    expect(isDomainInConfig('sub1.example.com', sampleConfig)).toBe(true);
    expect(isDomainInConfig('a.other.org', sampleConfig)).toBe(true);
  });

  it('returns false for unconfigured subdomain', () => {
    expect(isDomainInConfig('unknown.example.com', sampleConfig)).toBe(false);
    expect(isDomainInConfig('sub1.other.org', sampleConfig)).toBe(false);
  });

  it('returns false for completely unknown domain', () => {
    expect(isDomainInConfig('notrelated.io', sampleConfig)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isDomainInConfig('EXAMPLE.COM', sampleConfig)).toBe(true);
    expect(isDomainInConfig('Sub1.Example.COM', sampleConfig)).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isDomainInConfig('  example.com  ', sampleConfig)).toBe(true);
  });

  it('returns false for empty config', () => {
    expect(isDomainInConfig('example.com', [])).toBe(false);
  });

  it('returns false for similar-looking but unconfigured domain', () => {
    expect(isDomainInConfig('fakeexample.com', sampleConfig)).toBe(false);
    expect(isDomainInConfig('sub1.fakeexample.com', sampleConfig)).toBe(false);
  });
});
