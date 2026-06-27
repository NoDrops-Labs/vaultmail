'use client';

import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf';

function getCookie(name: string): string | null {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1] ?? null;
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Vaultmail-UI', '1');

  const method = init.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie(CSRF_COOKIE);
    if (csrf) {
      headers.set(CSRF_HEADER, decodeURIComponent(csrf));
    }
  }

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}
