import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { RETENTION_SETTINGS_KEY } from '@/lib/admin-auth';
import { checkApiRateLimit } from '@/lib/api-key-middleware';

export const dynamic = 'force-dynamic';

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
  const rateLimit = await checkApiRateLimit(req, 'config.read', { browserOnly: true, allowApiKeyBypassBrowserGuard: true });
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401 });
  }

  const settingsRaw = await storage.get(RETENTION_SETTINGS_KEY);
  const settings = parseSettings(settingsRaw) || {
    seconds: 86400,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json(settings);
}
