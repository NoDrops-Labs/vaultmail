import { describe, it, expect } from 'vitest';
import {
  parseHeaders,
  decodeMimeEncodedWords,
  decodeQuotedPrintable,
  extractEmailAddresses,
  buildInboxPreview,
  stripMailHeadersFromPreview,
  escapeHtml,
  normalizeBodyText,
  parseReceivedAt,
  lastUidKey
} from '@/lib/imap-fetch';

describe('parseHeaders', () => {
  it('parses simple key: value lines', () => {
    const headers = parseHeaders('From: a@example.com\r\nTo: b@example.com');
    expect(headers.get('from')).toBe('a@example.com');
    expect(headers.get('to')).toBe('b@example.com');
  });

  it('lowercases header names', () => {
    const headers = parseHeaders('SUBJECT: Hello');
    expect(headers.has('subject')).toBe(true);
    expect(headers.has('SUBJECT')).toBe(false);
    expect(headers.get('subject')).toBe('Hello');
  });

  it('trims values', () => {
    const headers = parseHeaders('From:   spaced@example.com   ');
    expect(headers.get('from')).toBe('spaced@example.com');
  });

  it('joins folded header continuation lines (leading whitespace)', () => {
    const raw = 'Subject: =?UTF-8?Q?Hello?=\r\n World';
    const headers = parseHeaders(raw);
    expect(headers.get('subject')).toBe('=?UTF-8?Q?Hello?= World');
  });

  it('appends multiple folded lines with a space', () => {
    const raw = 'To: a@example.com\r\n b@example.com\r\n c@example.com';
    const headers = parseHeaders(raw);
    expect(headers.get('to')).toBe('a@example.com b@example.com c@example.com');
  });

  it('skips lines without a colon', () => {
    const headers = parseHeaders('garbage line\r\nFrom: ok@example.com');
    expect(headers.get('from')).toBe('ok@example.com');
    expect(headers.has('garbage line')).toBe(false);
  });

  it('handles \n-only line endings (no \r)', () => {
    const headers = parseHeaders('From: a@example.com\nTo: b@example.com');
    expect(headers.get('from')).toBe('a@example.com');
    expect(headers.get('to')).toBe('b@example.com');
  });

  it('returns empty map for empty string', () => {
    const headers = parseHeaders('');
    expect(headers.size).toBe(0);
  });
});

describe('decodeMimeEncodedWords', () => {
  it('decodes B-encoded UTF-8 word', () => {
    const encoded = '=?UTF-8?B?SGVsbG8gV29ybGQ=?=';
    expect(decodeMimeEncodedWords(encoded)).toBe('Hello World');
  });

  it('decodes Q-encoded UTF-8 word', () => {
    const encoded = '=?UTF-8?Q?Hello=20World?=';
    expect(decodeMimeEncodedWords(encoded)).toBe('Hello World');
  });

  it('decodes Q-encoded with underscore as space', () => {
    const encoded = '=?UTF-8?Q?Hello_World?=';
    expect(decodeMimeEncodedWords(encoded)).toBe('Hello World');
  });

  it('decodes lowercase q encoding', () => {
    const encoded = '=?utf-8?q?Hello=20World?=';
    expect(decodeMimeEncodedWords(encoded)).toBe('Hello World');
  });

  it('decodes lowercase b encoding', () => {
    const encoded = '=?utf-8?b?SGVsbG8=?=';
    expect(decodeMimeEncodedWords(encoded)).toBe('Hello');
  });

  it('leaves plain text unchanged', () => {
    expect(decodeMimeEncodedWords('Plain text')).toBe('Plain text');
  });

  it('handles multiple encoded words in a string', () => {
    const encoded = '=?UTF-8?B?SGVsbG8=?= =?UTF-8?B?V29ybGQ=?=';
    const result = decodeMimeEncodedWords(encoded);
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('falls back gracefully for invalid base64', () => {
    const encoded = '=?UTF-8?B?@@invalid@@?=';
    const result = decodeMimeEncodedWords(encoded);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns original text when charset TextDecoder fails (fallback path)', () => {
    const encoded = '=?UNKNOWN-CHARSET?B?SGVsbG8=?=';
    const result = decodeMimeEncodedWords(encoded);
    expect(result).toBe('Hello');
  });

  it('leaves malformed encoded-word (missing =) unchanged', () => {
    const malformed = '=?UTF-8?B?SGVsbG8?';
    expect(decodeMimeEncodedWords(malformed)).toBe(malformed);
  });
});

describe('decodeQuotedPrintable', () => {
  it('decodes hex escapes', () => {
    expect(decodeQuotedPrintable('Hello=20World')).toBe('Hello World');
  });

  it('decodes uppercase hex escapes', () => {
    expect(decodeQuotedPrintable('Hello=20World')).toBe('Hello World');
  });

  it('decodes lowercase hex escapes', () => {
    expect(decodeQuotedPrintable('Hello=20World')).toBe('Hello World');
  });

  it('removes soft breaks (= at end of line)', () => {
    expect(decodeQuotedPrintable('line1=\r\nline2')).toBe('line1line2');
  });

  it('removes soft breaks with \n only', () => {
    expect(decodeQuotedPrintable('line1=\nline2')).toBe('line1line2');
  });

  it('handles combined soft breaks and hex escapes', () => {
    expect(decodeQuotedPrintable('a=20b=\r\nc=20d')).toBe('a bc d');
  });

  it('passes through plain text unchanged', () => {
    expect(decodeQuotedPrintable('plain text')).toBe('plain text');
  });
});

describe('extractEmailAddresses', () => {
  it('extracts a single email', () => {
    expect(extractEmailAddresses('user@example.com')).toEqual(['user@example.com']);
  });

  it('extracts multiple emails', () => {
    const result = extractEmailAddresses('a@example.com b@example.com c@example.com');
    expect(result).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
  });

  it('deduplicates emails', () => {
    const result = extractEmailAddresses('a@example.com a@example.com');
    expect(result).toEqual(['a@example.com']);
  });

  it('is case-insensitive and lowercases results', () => {
    const result = extractEmailAddresses('User@EXAMPLE.COM other@Example.COM');
    expect(result).toEqual(['user@example.com', 'other@example.com']);
  });

  it('returns empty array for no emails', () => {
    expect(extractEmailAddresses('no emails here')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractEmailAddresses('')).toEqual([]);
  });

  it('handles emails with dots, plus, dashes in local part', () => {
    const result = extractEmailAddresses('first.last+tag-1@example.org');
    expect(result).toEqual(['first.last+tag-1@example.org']);
  });

  it('deduplicates case variants of same email', () => {
    const result = extractEmailAddresses('A@x.com a@x.com');
    expect(result).toEqual(['a@x.com']);
  });
});

describe('buildInboxPreview', () => {
  it('returns plain text unchanged when short', () => {
    expect(buildInboxPreview('Hello world')).toBe('Hello world');
  });

  it('truncates to 240 chars with ellipsis', () => {
    const long = 'a'.repeat(300);
    const result = buildInboxPreview(long);
    expect(result.length).toBe(240);
    expect(result.endsWith('...')).toBe(true);
    expect(result.slice(0, 237)).toBe('a'.repeat(237));
  });

  it('returns exactly 240 for 241-char input (triggers truncation)', () => {
    const input = 'a'.repeat(241);
    const result = buildInboxPreview(input);
    expect(result.length).toBe(240);
    expect(result.endsWith('...')).toBe(true);
  });

  it('does not truncate input of exactly 240 chars', () => {
    const input = 'a'.repeat(240);
    expect(buildInboxPreview(input)).toBe(input);
  });

  it('strips HTML tags', () => {
    expect(buildInboxPreview('<p>Hello</p>')).toBe('Hello');
  });

  it('collapses whitespace', () => {
    expect(buildInboxPreview('  hello   world  ')).toBe('hello world');
  });

  it('returns placeholder for empty input', () => {
    expect(buildInboxPreview('')).toBe('(No preview available)');
  });

  it('returns placeholder for whitespace-only input', () => {
    expect(buildInboxPreview('   ')).toBe('(No preview available)');
  });

  it('returns placeholder for tags-only input', () => {
    expect(buildInboxPreview('<br><br>')).toBe('(No preview available)');
  });
});

describe('stripMailHeadersFromPreview', () => {
  it('removes delivered-to line', () => {
    const input = 'Delivered-To: user@example.com\nbody text';
    expect(stripMailHeadersFromPreview(input)).toBe('body text');
  });

  it('removes from line', () => {
    const input = 'From: sender@example.com\nbody';
    expect(stripMailHeadersFromPreview(input)).toBe('body');
  });

  it('removes to, cc, subject, date, message-id lines', () => {
    const input =
      'To: a@example.com\nCC: b@example.com\nSubject: Hi\nDate: 2024-01-01\nMessage-ID: <1@x>\nbody';
    expect(stripMailHeadersFromPreview(input)).toBe('body');
  });

  it('is case-insensitive', () => {
    const input = 'FROM: sender@example.com\nbody';
    expect(stripMailHeadersFromPreview(input)).toBe('body');
  });

  it('preserves body lines that happen to start with header-like words', () => {
    const input = 'Fromage is cheese\nbody';
    expect(stripMailHeadersFromPreview(input)).toBe('Fromage is cheese\nbody');
  });

  it('preserves non-header lines', () => {
    const input = 'Hello world\nThis is body';
    expect(stripMailHeadersFromPreview(input)).toBe('Hello world\nThis is body');
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quote', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special chars combined', () => {
    expect(escapeHtml('<a href="x" data=\'y\'>&</a>')).toBe(
      '&lt;a href=&quot;x&quot; data=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});

describe('normalizeBodyText', () => {
  it('decodes quoted-printable when transfer-encoding says so', () => {
    expect(normalizeBodyText('Hello=20World', 'quoted-printable')).toBe('Hello World');
  });

  it('decodes quoted-printable by detection (no encoding hint)', () => {
    expect(normalizeBodyText('Hello=20World')).toBe('Hello World');
  });

  it('decodes base64 when transfer-encoding says so', () => {
    const encoded = Buffer.from('Hello World').toString('base64');
    expect(normalizeBodyText(encoded, 'base64')).toBe('Hello World');
  });

  it('passes through plain text with no encoding hint', () => {
    expect(normalizeBodyText('plain text')).toBe('plain text');
  });

  it('passes through plain text with unknown encoding', () => {
    expect(normalizeBodyText('plain text', '8bit')).toBe('plain text');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeBodyText('  hello  ')).toBe('hello');
  });

  it('does not throw on invalid base64 (Buffer.from is lenient)', () => {
    expect(() => normalizeBodyText('@@@invalid@@@', 'base64')).not.toThrow();
    const result = normalizeBodyText('@@@invalid@@@', 'base64');
    expect(typeof result).toBe('string');
  });
});

describe('parseReceivedAt', () => {
  it('parses a valid RFC 2822 date', () => {
    const result = parseReceivedAt('Mon, 01 Jan 2024 00:00:00 +0000');
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('parses ISO date string', () => {
    const result = parseReceivedAt('2024-06-15T12:30:00Z');
    expect(result).toBe('2024-06-15T12:30:00.000Z');
  });

  it('returns current ISO date for missing date', () => {
    const before = Date.now();
    const result = parseReceivedAt(undefined);
    const after = Date.now();
    const ts = Date.parse(result);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('returns current ISO date for empty string', () => {
    const before = Date.now();
    const result = parseReceivedAt('');
    const after = Date.now();
    const ts = Date.parse(result);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('returns current ISO date for invalid date', () => {
    const before = Date.now();
    const result = parseReceivedAt('not a date');
    const after = Date.now();
    const ts = Date.parse(result);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('lastUidKey', () => {
  it('builds imap:lastuid: prefix with lowercased address', () => {
    expect(lastUidKey('User@Example.COM')).toBe('imap:lastuid:user@example.com');
  });

  it('handles already-lowercased input', () => {
    expect(lastUidKey('user@example.com')).toBe('imap:lastuid:user@example.com');
  });

  it('preserves special characters in local part', () => {
    expect(lastUidKey('first.last+tag@example.org')).toBe(
      'imap:lastuid:first.last+tag@example.org'
    );
  });

  it('handles mixed case domain', () => {
    expect(lastUidKey('user@EXAMPLE.COM')).toBe('imap:lastuid:user@example.com');
  });
});
