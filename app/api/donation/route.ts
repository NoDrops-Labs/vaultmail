import { NextResponse } from 'next/server';
import { getDonationSettings } from '@/lib/donation-settings';
import { checkApiRateLimit } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rateLimit = await checkApiRateLimit(req, 'config.read', { browserOnly: true, allowApiKeyBypassBrowserGuard: true });
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401 });
  }

  const settings = await getDonationSettings();

  if (!settings || !settings.enabled || !settings.evmAddress) {
    return NextResponse.json(
      { enabled: false, evmAddress: '', message: '' },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    );
  }

  return NextResponse.json(
    { enabled: true, evmAddress: settings.evmAddress, message: settings.message },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  );
}
