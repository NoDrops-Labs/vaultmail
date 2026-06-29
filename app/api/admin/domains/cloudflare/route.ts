import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-request';
import { isCloudflareConfigured } from '@/lib/cloudflare-zones';
import { listOnboarding, startOnboarding } from '@/lib/domain-onboarding';
import { cloudflareDomainPostSchema } from '@/lib/schemas/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const records = await listOnboarding();
  return NextResponse.json({ records, configured: isCloudflareConfigured() });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  if (!isCloudflareConfigured()) {
    return NextResponse.json(
      { error: 'Cloudflare domain onboarding is not configured. Set CLOUDFLARE_ADMIN_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = cloudflareDomainPostSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const record = await startOnboarding(parsed.data.domain);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
