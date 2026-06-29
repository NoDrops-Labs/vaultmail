import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { DONATION_SETTINGS_KEY } from '@/lib/admin-auth';
import { donationPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';
import type { DonationSettings } from '@/lib/donation-settings';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const raw = await storage.get(DONATION_SETTINGS_KEY);
  let settings: DonationSettings = { enabled: false, evmAddress: '', message: '' };
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<DonationSettings>;
    settings = {
      enabled: obj.enabled === true,
      evmAddress: typeof obj.evmAddress === 'string' ? obj.evmAddress : '',
      message: typeof obj.message === 'string' ? obj.message : '',
    };
  }

  return NextResponse.json({ ...settings, updatedAt: (raw as { updatedAt?: string })?.updatedAt || new Date().toISOString() });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = donationPostSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const settings = {
    enabled: parsed.data.enabled,
    evmAddress: parsed.data.evmAddress,
    message: parsed.data.message,
    updatedAt: new Date().toISOString(),
  };

  await storage.set(DONATION_SETTINGS_KEY, settings);
  return NextResponse.json(settings);
}
