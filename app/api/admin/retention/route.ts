import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { RETENTION_SETTINGS_KEY } from '@/lib/admin-auth';
import { retentionPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

type RetentionSettings = {
  seconds: number;
  updatedAt: string;
};

const parseSettings = (value: unknown): RetentionSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as RetentionSettings;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as RetentionSettings;
  }
  return null;
};

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const settingsRaw = await storage.get(RETENTION_SETTINGS_KEY);
  const settings = parseSettings(settingsRaw) || {
    seconds: 86400,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = retentionPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const seconds = parsed.data.seconds;

  const settings: RetentionSettings = {
    seconds,
    updatedAt: new Date().toISOString()
  };

  await storage.set(RETENTION_SETTINGS_KEY, settings);

  return NextResponse.json(settings);
}
