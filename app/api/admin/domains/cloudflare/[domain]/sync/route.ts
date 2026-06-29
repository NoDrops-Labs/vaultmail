import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-request';
import { CloudflareApiError } from '@/lib/cloudflare-zones';
import { syncOnboarding } from '@/lib/domain-onboarding';

export const dynamic = 'force-dynamic';

export async function POST(
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
  try {
    const record = await syncOnboarding(decodeURIComponent(domain));
    const status = record.step === 'failed_terminal' ? 502
      : record.step === 'failed_retryable' ? 202
      : record.step === 'added_to_app' ? 200
      : 200;
    return NextResponse.json({ record }, { status });
  } catch (err) {
    if (err instanceof CloudflareApiError) {
      const status = err.cfError.retryable ? 502 : 503;
      return NextResponse.json(
        { error: err.cfError.message, retryable: err.cfError.retryable },
        { status }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
