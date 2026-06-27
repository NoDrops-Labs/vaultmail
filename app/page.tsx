import { HomePage } from "@/components/home-page";
import { HomepageLock } from "@/components/homepage-lock";
import { cookies } from "next/headers";
import {
  getHomepageLockSettings,
} from "@/lib/homepage-lock";
import {
  HOMEPAGE_SESSION_COOKIE,
  validateHomepageSession,
  HOMEPAGE_LOCK_COOKIE,
  createHomepageSession,
} from "@/lib/homepage-session";
import { getStoredAppName } from "@/lib/branding-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, appName] = await Promise.all([
    getHomepageLockSettings(),
    getStoredAppName(),
  ]);

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(HOMEPAGE_SESSION_COOKIE);

  if (sessionCookie?.value) {
    const valid = await validateHomepageSession(sessionCookie.value);
    if (valid) return <HomePage />;
  }

  if (!settings.enabled || !settings.passwordHash) {
    return <HomePage />;
  }

  const oldCookie = cookieStore.get(HOMEPAGE_LOCK_COOKIE);
  if (oldCookie?.value === settings.passwordHash) {
    const newToken = await createHomepageSession();
    cookieStore.set(HOMEPAGE_SESSION_COOKIE, newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    cookieStore.delete(HOMEPAGE_LOCK_COOKIE);
    return <HomePage />;
  }

  return <HomepageLock appName={appName} />;
}
