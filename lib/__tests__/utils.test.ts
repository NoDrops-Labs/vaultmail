import { describe, it, expect } from 'vitest';
import { cn, extractEmail, getSenderInfo } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'no', true && 'yes', null, undefined, 0)).toBe('base yes');
  });

  it('dedupes tailwind-merge conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays and objects', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});

describe('extractEmail', () => {
  it('extracts a bare email', () => {
    expect(extractEmail('user@example.com')).toBe('user@example.com');
  });

  it('extracts from angle brackets', () => {
    expect(extractEmail('Sender <sender@example.com>')).toBe('sender@example.com');
  });

  it('lowercases the result', () => {
    expect(extractEmail('User@EXAMPLE.COM')).toBe('user@example.com');
  });

  it('extracts the first email from a body of text', () => {
    expect(extractEmail('hello User@a.com and admin@b.com')).toBe('user@a.com');
  });

  it('returns null when no email present', () => {
    expect(extractEmail('no email here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractEmail('')).toBeNull();
  });

  it('handles dots, dashes, underscores in local part', () => {
    expect(extractEmail('first.last_name-1@example.org')).toBe('first.last_name-1@example.org');
  });
});

describe('getSenderInfo', () => {
  it('parses "Name <email>" format', () => {
    const result = getSenderInfo('Alice <alice@example.com>');
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
    expect(result.label).toBe('Alice <alice@example.com>');
  });

  it('parses quoted name', () => {
    const result = getSenderInfo('"Alice Smith" <alice@example.com>');
    expect(result.name).toBe('Alice Smith');
    expect(result.email).toBe('alice@example.com');
    expect(result.label).toBe('Alice Smith <alice@example.com>');
  });

  it('handles bare email', () => {
    const result = getSenderInfo('alice@example.com');
    expect(result.email).toBe('alice@example.com');
    expect(result.name).toBe('alice@example.com');
    expect(result.label).toBe('alice@example.com');
  });

  it('falls back to trimmed input when no email and no name', () => {
    const result = getSenderInfo('  Unknown Sender  ');
    expect(result.email).toBeNull();
    expect(result.name).toBe('Unknown Sender');
    expect(result.label).toBe('Unknown Sender');
  });

  it('handles name without angle brackets but with email', () => {
    const result = getSenderInfo('Alice alice@example.com');
    expect(result.email).toBe('alice@example.com');
    expect(result.name).toBe('Alice alice@example.com');
    expect(result.label).toBe('Alice alice@example.com <alice@example.com>');
  });

  it('lowercases the email', () => {
    const result = getSenderInfo('Alice <ALICE@EXAMPLE.COM>');
    expect(result.email).toBe('alice@example.com');
  });
});
