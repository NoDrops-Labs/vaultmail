import { NextResponse } from 'next/server';
import { HOMEPAGE_LOCK_SETTINGS_KEY } from '@/lib/admin-auth';
import {
  getHomepageLockSettings,
  hashHomepagePassword
} from '@/lib/homepage-lock';
import { storage } from '@/lib/storage';
import { homepageLockPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

type HomepageLockPayload = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string;
};

const ensureMongoAvailable = () => {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: 'MONGODB_URI is not set. Configure MongoDB to use homepage lock.' },
      { status: 500 }
    );
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
  const mongoGuard = ensureMongoAvailable();
  if (mongoGuard) {
    return mongoGuard;
  }

  const settings = await getHomepageLockSettings();

  return NextResponse.json({
    enabled: Boolean(settings.enabled),
    hasPassword: Boolean(settings.passwordHash),
    updatedAt: settings.updatedAt || new Date().toISOString()
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
  const mongoGuard = ensureMongoAvailable();
  if (mongoGuard) {
    return mongoGuard;
  }

  const parsed = homepageLockPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const { enabled, password } = parsed.data;
  const trimmedPassword = password?.trim();

  const settings = await getHomepageLockSettings();
  const nextPasswordHash = trimmedPassword
    ? hashHomepagePassword(trimmedPassword)
    : settings.passwordHash;

  if (enabled && !nextPasswordHash) {
    return NextResponse.json(
      { error: 'Password is required when enabling the lock.' },
      { status: 400 }
    );
  }

  const nextSettings = {
    enabled,
    passwordHash: nextPasswordHash,
    updatedAt: new Date().toISOString()
  };

  await storage.set(HOMEPAGE_LOCK_SETTINGS_KEY, nextSettings);

  const responsePayload: HomepageLockPayload = {
    enabled: nextSettings.enabled,
    hasPassword: Boolean(nextSettings.passwordHash),
    updatedAt: nextSettings.updatedAt
  };

  return NextResponse.json(responsePayload);
}
