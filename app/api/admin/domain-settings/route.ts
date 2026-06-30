import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { DOMAIN_AUTO_APPROVE_KEY } from '@/lib/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) return new NextResponse('Unauthorized', { status: 401 });
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const raw = await storage.get(DOMAIN_AUTO_APPROVE_KEY);
  const enabled = raw && typeof raw === 'object' ? (raw as { enabled?: boolean }).enabled === true : false;
  return NextResponse.json({ enabled });
}

export async function POST(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) return new NextResponse('Unauthorized', { status: 401 });
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { enabled } = payload as { enabled?: unknown };
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }

  await storage.set(DOMAIN_AUTO_APPROVE_KEY, { enabled });
  return NextResponse.json({ enabled });
}
