import crypto from 'crypto';

export const CSRF_COOKIE = 'vaultmail_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function requireCsrf(req: Request): { ok: true } | { ok: false; reason: string } {
  const method = req.method.toUpperCase();

  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { ok: true };
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const cookieToken = parseCookieValue(cookieHeader, CSRF_COOKIE);
  const headerToken = safeDecode(req.headers.get(CSRF_HEADER));

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return { ok: false, reason: 'Invalid CSRF token' };
  }

  return { ok: true };
}

function safeDecode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseCookieValue(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() === name) {
      return safeDecode(trimmed.slice(eq + 1).trim());
    }
  }
  return null;
}
