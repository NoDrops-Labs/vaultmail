import { NextResponse } from 'next/server';
import { getFaviconSettings } from '@/lib/favicon';
import { checkApiRateLimit } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rateLimit = await checkApiRateLimit(req, 'favicon.read');
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401 });
  }

  try {
    const settings = await getFaviconSettings();
    
    if (!settings || !settings.data || !settings.contentType) {
      return NextResponse.redirect(new URL('/favicon.svg', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

    const buffer = Buffer.from(settings.data, 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': settings.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=31536000',
      },
    });
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return NextResponse.redirect(new URL('/favicon.svg', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
