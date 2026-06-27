import { NextResponse } from 'next/server';
import { refreshDomainExpiration } from '@/lib/domain-expiration';
import { getStoredDomains } from '@/lib/domains';
import { authorizeCronRequest } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.ALLOW_UNAUTHENTICATED_CRON === 'true') return;
    return new NextResponse('CRON_SECRET not configured', { status: 500 });
  }
  const header = req.headers.get('x-cron-secret');
  if (header !== secret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const cronRateLimit = await authorizeCronRequest();
  if (cronRateLimit.blocked) {
    return new NextResponse('Cron rate limited', { status: 429 });
  }

  const domains = await getStoredDomains();
  const results = await Promise.all(
    domains.map((domain) => refreshDomainExpiration(domain))
  );

  return NextResponse.json({
    updated: results.length,
    domains: results
  });
}
