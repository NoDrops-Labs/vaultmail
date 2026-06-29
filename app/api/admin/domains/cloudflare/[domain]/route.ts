import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/admin-request';
import { getOnboarding } from '@/lib/domain-onboarding';

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
