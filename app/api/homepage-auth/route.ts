import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getHomepageLockSettings,
  hashHomepagePassword,
} from '@/lib/homepage-lock';
import {
  createHomepageSession,
  HOMEPAGE_SESSION_COOKIE,
  HOMEPAGE_LOCK_COOKIE,
} from '@/lib/homepage-session';
import {
  checkRateLimit,
  registerRateLimitFailure,
  resetRateLimit
} from '@/lib/auth-rate-limit';
import { homepageAuthSchema } from '@/lib/schemas/homepage-auth';
import { checkApiRateLimit } from '@/lib/api-key-middleware';
import { createCsrfToken, CSRF_COOKIE } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 'homepage-lock');
  if (rateLimit.blocked) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 5 minutes.' },
      { status: 429 }
    );
  }

  const guard = await checkApiRateLimit(req, 'homepage.auth', { browserOnly: true, allowApiKeyBypassBrowserGuard: false, skipHomepageLockDenial: true });
  if (guard.blocked) {
    if (guard.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized or rate limited' }, { status: 401 });
  }

  const settings = await getHomepageLockSettings();
  if (!settings.enabled || !settings.passwordHash) {
    return NextResponse.json(
      { error: 'Homepage lock is not enabled.' },
      { status: 400 }
    );
  }

  const parsed = homepageAuthSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const provided = parsed.data.password.trim();

  if (!provided) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  const expectedHash = settings.passwordHash;
  const providedHash = hashHomepagePassword(provided);

  if (expectedHash !== providedHash) {
    const failure = await registerRateLimitFailure(req, 'homepage-lock');
    if (failure.blocked) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 5 minutes.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  await resetRateLimit(req, 'homepage-lock');

  const token = await createHomepageSession();
  const cookieStore = await cookies();
  const isHttps = process.env.NODE_ENV === 'production';
  cookieStore.set(HOMEPAGE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 60 * 60 * 24,
    path: '/'
  });
  cookieStore.delete(HOMEPAGE_LOCK_COOKIE);
  cookieStore.set(CSRF_COOKIE, createCsrfToken(), {
    httpOnly: false,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 60 * 60 * 24,
    path: '/'
  });

  return NextResponse.json({ success: true });
}
