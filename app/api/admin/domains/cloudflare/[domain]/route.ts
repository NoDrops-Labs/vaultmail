import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-request';
import { CloudflareApiError } from '@/lib/cloudflare-zones';
import {
  cancelOnboarding,
  DomainStateError,
  fullRemoveFromCloudflare,
  getOnboarding,
  removeFromApp,
  restoreToApp,
} from '@/lib/domain-onboarding';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const { domain } = await params;
  const record = await getOnboarding(decodeURIComponent(domain));
  if (!record) {
    return NextResponse.json({ error: 'Onboarding record not found' }, { status: 404 });
  }
  return NextResponse.json({ record });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  const VALID_ACTIONS = new Set([null, 'full', 'cancel', 'restore']);
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    if (action === 'full') {
      await fullRemoveFromCloudflare(decodedDomain);
      return NextResponse.json({ success: true });
    }
    if (action === 'cancel') {
      const confirmZone = url.searchParams.get('confirmZone') === 'true';
      await cancelOnboarding(decodedDomain, confirmZone);
      return NextResponse.json({ success: true });
    }
    if (action === 'restore') {
      const record = await restoreToApp(decodedDomain);
      return NextResponse.json({ record });
    }
    const record = await removeFromApp(decodedDomain);
    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof DomainStateError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof CloudflareApiError) {
      return NextResponse.json(
        { error: err.cfError.message, retryable: err.cfError.retryable },
        { status: err.cfError.retryable ? 502 : 503 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
