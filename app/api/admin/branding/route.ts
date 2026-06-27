import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { BRANDING_SETTINGS_KEY } from '@/lib/admin-auth';
import { DEFAULT_APP_NAME, normalizeAppName } from '@/lib/branding';
import { brandingPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

type BrandingSettings = {
  appName: string;
  updatedAt: string;
};

const parseSettings = (value: unknown): BrandingSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as BrandingSettings;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as BrandingSettings;
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

  const settingsRaw = await storage.get(BRANDING_SETTINGS_KEY);
  const settings = parseSettings(settingsRaw);
  const appName = normalizeAppName(settings?.appName) || DEFAULT_APP_NAME;

  return NextResponse.json({
    appName,
    updatedAt: settings?.updatedAt || new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = brandingPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const appName = normalizeAppName(parsed.data.appName) || DEFAULT_APP_NAME;

  const settings: BrandingSettings = {
    appName,
    updatedAt: new Date().toISOString()
  };

  await storage.set(BRANDING_SETTINGS_KEY, settings);

  return NextResponse.json(settings);
}
