import { describe, it, expect } from 'vitest';
import { withPrefix, inboxKey, inboxPattern, domainExpirationKey } from '@/lib/storage-keys';

describe('withPrefix', () => {
  it('returns the key unchanged (identity no-op)', () => {
    expect(withPrefix('hello')).toBe('hello');
    expect(withPrefix('inbox:user@example.com')).toBe('inbox:user@example.com');
  });
});

describe('inboxKey', () => {
  it('builds inbox: prefix with lowercased address', () => {
    expect(inboxKey('User@Example.COM')).toBe('inbox:user@example.com');
  });

  it('handles already-lowercased input', () => {
    expect(inboxKey('user@example.com')).toBe('inbox:user@example.com');
  });

  it('preserves special characters in local part', () => {
    expect(inboxKey('first.last+tag@example.org')).toBe('inbox:first.last+tag@example.org');
  });
});

describe('inboxPattern', () => {
  it('returns the glob pattern for all inboxes', () => {
    expect(inboxPattern()).toBe('inbox:*');
  });
});

describe('domainExpirationKey', () => {
  it('builds domain:expiration: prefix with lowercased domain', () => {
    expect(domainExpirationKey('Example.COM')).toBe('domain:expiration:example.com');
  });

  it('handles already-lowercased input', () => {
    expect(domainExpirationKey('example.com')).toBe('domain:expiration:example.com');
  });
});
