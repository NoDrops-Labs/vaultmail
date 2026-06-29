import { NextResponse } from 'next/server';
import { getFaviconSettings } from '@/lib/favicon';
import { checkApiRateLimit } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" version="1.2" viewBox="385 65 510 510"><circle cx="640" cy="320" r="250" fill="#c5eaf4" stroke="#6ecde4" stroke-width="10"/><path fill="#0155dd" d="M593.434 439.105 503.1 318.286l89.827-117.39-17.336-23.659-101.235 132.395-.14 16.943 101.712 136.188Z"/><path fill="#fff" d="M462.81 247.537h222.149v148.099H462.81z"/><path fill="#f38020" d="M683.209 237.242H461.387l-9.242 9.243v147.03l9.242 9.243H683.21l9.243-9.243v-147.03Zm-110.91 94.866-86.474-76.38h172.984ZM530.705 320l-60.076 53.052v-106.29Zm13.864 12.348 21.536 18.984h12.237l21.442-18.984 59.024 51.943H485.825ZM613.89 320l60.076-53.052v106.29z"/><path fill="#0155dd" d="M624.959 151.416h-34.756l125.37 171.394-122.42 165.774h34.981l122.364-165.718Z"/><path fill="#0155dd" d="M692.196 151.416H656.99l127.366 169.343L656.99 488.584h35.262l120.904-159.312V312.33z"/></svg>`;

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=31536000',
};

export async function GET(req: Request) {
  const rateLimit = await checkApiRateLimit(req, 'favicon.read');
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403, headers: SECURITY_HEADERS });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401, headers: SECURITY_HEADERS });
  }

  try {
    const settings = await getFaviconSettings();

    if (settings && settings.data && settings.contentType) {
      const buffer = Buffer.from(settings.data, 'base64');
      const etag = settings.hash ? `"${settings.hash}"` : undefined;

      if (etag) {
        const ifNoneMatch = req.headers.get('if-none-match');
        if (ifNoneMatch && ifNoneMatch === etag) {
          return new NextResponse(null, { status: 304, headers: SECURITY_HEADERS });
        }
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': settings.contentType,
          ...SECURITY_HEADERS,
          ...(etag ? { 'ETag': etag } : {}),
        },
      });
    }

    return new NextResponse(FALLBACK_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return new NextResponse(FALLBACK_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        ...SECURITY_HEADERS,
      },
    });
  }
}
