import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { IMAP_SETTINGS_KEY } from '@/lib/admin-auth';
import { imapPostSchema, type ImapSettings } from '@/lib/schemas/imap';
import { testImapConnection } from '@/lib/imap-fetch';
import { requireAdminRequest } from '@/lib/admin-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const parseSettings = (value: unknown): ImapSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as ImapSettings; } catch { return null; }
  }
  if (typeof value === 'object') return value as ImapSettings;
  return null;
};

const defaultSettings = (): ImapSettings => ({
  enabled: false,
  host: '',
  port: 993,
  user: '',
  password: '',
  tls: true,
  rejectUnauthorized: true,
  maxFetch: 30,
  updatedAt: new Date().toISOString()
});

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) return new NextResponse('Unauthorized', { status: 401 });
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }
  const settingsRaw = await storage.get(IMAP_SETTINGS_KEY);
  const settings = parseSettings(settingsRaw) || defaultSettings();
  return NextResponse.json({
    ...settings,
    password: settings.password ? '••••••••' : '',
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) return new NextResponse('Unauthorized', { status: 401 });
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = imapPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (body.action === 'test') {
    try {
      await testImapConnection({
        host: body.host,
        port: body.port,
        user: body.user,
        password: body.password,
        tls: body.tls,
        rejectUnauthorized: body.rejectUnauthorized
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'IMAP test failed' },
        { status: 400 }
      );
    }
  }

  const settings: ImapSettings = {
    enabled: body.enabled,
    host: body.host.trim(),
    port: body.port || 993,
    user: body.user.trim(),
    password: body.password.trim(),
    tls: body.tls,
    rejectUnauthorized: body.rejectUnauthorized,
    maxFetch: Math.max(1, Math.min(200, body.maxFetch || 30)),
    updatedAt: new Date().toISOString()
  };
  await storage.set(IMAP_SETTINGS_KEY, settings);
  return NextResponse.json(settings);
}
