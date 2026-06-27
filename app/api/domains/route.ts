import { NextResponse } from 'next/server';
import { getDomains, getMasterDomains } from '@/lib/domains';
import { expandDomains } from '@/lib/domain-config';
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

  const masterDomains = await getMasterDomains();
  if (masterDomains.length > 0) {
    return NextResponse.json({
      domains: expandDomains(masterDomains),
      masterDomains,
    });
  }
  const domains = await getDomains();
  return NextResponse.json({ domains, masterDomains: [] });
}
