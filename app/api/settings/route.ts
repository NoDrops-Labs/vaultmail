import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { RETENTION_SETTINGS_KEY } from '@/lib/admin-auth';
import { settingsPostSchema } from '@/lib/schemas/settings';
import { requireAdminRequest } from '@/lib/admin-request';

export async function POST(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  try {

    const parsed = settingsPostSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { retentionSeconds } = parsed.data;

    await storage.set(
      RETENTION_SETTINGS_KEY,
      JSON.stringify({
        seconds: retentionSeconds,
        updatedAt: new Date().toISOString()
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
