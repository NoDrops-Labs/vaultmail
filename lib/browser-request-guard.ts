export type BrowserGuardResult = { ok: true } | { ok: false; reason: string };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function sameOrigin(url: string, value: string | null): boolean {
  if (!value) return false;
  try {
    const expected = new URL(url).origin;
    const actual = new URL(value).origin;
    return actual === expected;
  } catch {
    return false;
  }
}

function forbidden(reason: string): BrowserGuardResult {
  return { ok: false, reason };
}

export function requireBrowserUiRequest(req: Request): BrowserGuardResult {
  const method = req.method.toUpperCase();

  const secFetchSite = req.headers.get('sec-fetch-site');
  const secFetchMode = req.headers.get('sec-fetch-mode');
  const secFetchDest = req.headers.get('sec-fetch-dest');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const uiHeader = req.headers.get('x-vaultmail-ui');

  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return forbidden('Cross-site browser request');
  }

  if (secFetchDest && secFetchDest !== 'empty') {
    return forbidden('Invalid fetch destination');
  }

  if (secFetchMode && !['cors', 'same-origin'].includes(secFetchMode)) {
    const safeGetNavigate = SAFE_METHODS.has(method) && secFetchMode === 'navigate';
    if (!safeGetNavigate) {
      return forbidden('Invalid fetch mode');
    }
  }

  if (!SAFE_METHODS.has(method)) {
    if (!sameOrigin(req.url, origin)) {
      return forbidden('Missing or invalid Origin');
    }
    if (uiHeader !== '1') {
      return forbidden('Missing UI request header');
    }
  } else {
    if (origin && !sameOrigin(req.url, origin)) {
      return forbidden('Invalid Origin');
    }
    if (referer && !sameOrigin(req.url, referer)) {
      return forbidden('Invalid Referer');
    }
  }

  return { ok: true };
}
