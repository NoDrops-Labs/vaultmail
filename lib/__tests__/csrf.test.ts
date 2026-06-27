import { describe, it, expect } from 'vitest';
import { requireCsrf, CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf';

function makeRequest(
  method: string,
  cookieValue: string | null,
  headerValue: string | null,
  isUrlEncoded = false
): Request {
  const headers = new Headers();
  const cookies: string[] = [];
  if (cookieValue !== null) {
    cookies.push(`${CSRF_COOKIE}=${isUrlEncoded ? cookieValue : encodeURIComponent(cookieValue)}`);
  }
  if (headerValue !== null) {
    headers.set(CSRF_HEADER, isUrlEncoded ? headerValue : headerValue);
  }
  if (cookies.length > 0) {
    headers.set('Cookie', cookies.join('; '));
  }
  return new Request('http://localhost:3000/api/test', { method, headers });
}

describe('requireCsrf', () => {
  it('allows safe methods', () => {
    const req = new Request('http://localhost:3000/api/test', { method: 'GET' });
    expect(requireCsrf(req).ok).toBe(true);
  });

  it('rejects missing cookie', () => {
    const req = makeRequest('POST', null, 'token');
    expect(requireCsrf(req).ok).toBe(false);
  });

  it('rejects missing header', () => {
    const req = makeRequest('POST', 'token', null);
    expect(requireCsrf(req).ok).toBe(false);
  });

  it('rejects mismatched token', () => {
    const req = makeRequest('POST', 'a', 'b');
    expect(requireCsrf(req).ok).toBe(false);
  });

  it('accepts matching token', () => {
    const req = makeRequest('POST', 'matching-token', 'matching-token');
    expect(requireCsrf(req).ok).toBe(true);
  });

  it('accepts url-encoded cookie', () => {
    const req = makeRequest('POST', 'matching token', 'matching token', true);
    expect(requireCsrf(req).ok).toBe(true);
  });

  it('rejects malformed cookie value without throwing', () => {
    const headers = new Headers();
    headers.set('Cookie', `${CSRF_COOKIE}=%`);
    headers.set(CSRF_HEADER, '%');
    const req = new Request('http://localhost:3000/api/test', { method: 'POST', headers });
    const result = requireCsrf(req);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toBe('Invalid CSRF token');
  });

  it('rejects malformed header value without throwing', () => {
    const headers = new Headers();
    headers.set('Cookie', `${CSRF_COOKIE}=valid`);
    headers.set(CSRF_HEADER, '%');
    const req = new Request('http://localhost:3000/api/test', { method: 'POST', headers });
    const result = requireCsrf(req);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toBe('Invalid CSRF token');
  });
});
