import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { BRANDING_SETTINGS_KEY } from '@/lib/admin-auth';
import { DEFAULT_APP_NAME, normalizeAppName } from '@/lib/branding';
import { getAccentColor } from '@/lib/accent-color';
import { checkApiRateLimit } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

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
  const rateLimit = await checkApiRateLimit(req, 'config.read', { browserOnly: true, allowApiKeyBypassBrowserGuard: true });
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401 });
  }

  const [settingsRaw, accentColor] = await Promise.all([
    storage.get(BRANDING_SETTINGS_KEY),
    getAccentColor()
  ]);
  const settings = parseSettings(settingsRaw);
  const appName = normalizeAppName(settings?.appName) || DEFAULT_APP_NAME;

  return NextResponse.json({ appName, accentColor });
}
