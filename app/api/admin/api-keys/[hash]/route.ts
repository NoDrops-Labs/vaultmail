import { NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/api-key';
import { requireAdminRequest } from '@/lib/admin-request';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const { hash } = await params;
  const revoked = await revokeApiKey(hash);
  if (!revoked) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
