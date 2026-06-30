import crypto from 'node:crypto';
import { storage } from '@/lib/storage';
import { withPrefix } from '@/lib/storage-keys';

export const ADMIN_SESSION_COOKIE = 'vaultmail_admin_session';
export const ADMIN_SESSION_PREFIX = withPrefix('admin:session:');
export const TELEGRAM_SETTINGS_KEY = withPrefix('settings:telegram');
export const DOMAINS_SETTINGS_KEY = withPrefix('settings:domains');
export const DOMAINS_CONFIG_SETTINGS_KEY = withPrefix('settings:domains-config');
export const RETENTION_SETTINGS_KEY = withPrefix('settings:retention');
export const BRANDING_SETTINGS_KEY = withPrefix('settings:branding');
export const HOMEPAGE_LOCK_SETTINGS_KEY = withPrefix('settings:homepage-lock');
export const IMAP_SETTINGS_KEY = withPrefix('settings:imap');
export const API_KEYS_SETTINGS_KEY = withPrefix('settings:api-keys');
export const FAVICON_SETTINGS_KEY = withPrefix('settings:favicon');
export const ACCENT_COLOR_SETTINGS_KEY = withPrefix('settings:accent-color');
export const ACCENT_PALETTE_SETTINGS_KEY = withPrefix('settings:accent-palette');
export const DONATION_SETTINGS_KEY = withPrefix('settings:donation');
export const DOMAIN_AUTO_APPROVE_KEY = withPrefix('settings:domain-auto-approve');

export const isAdminSessionValid = async (token?: string | null) => {
  if (!token) return false;
  const exists = await storage.exists(`${ADMIN_SESSION_PREFIX}${token}`);
  return Boolean(exists);
};

/**
 * Timing-safe admin password verification using SHA-256 hash comparison.
 *
 * The ADMIN_PASSWORD env var is hashed once per process (lazy module-level cache).
 * Submitted passwords are hashed per-request and compared with crypto.timingSafeEqual()
 * to prevent timing side-channel attacks.
 *
 * Note: SHA-256 is sufficient here because the secret is env-provided (not user-chosen).
 * If admin passwords move to MongoDB, switch to scrypt/argon2 KDF.
 */
let cachedAdminHash: Buffer | null = null;
let cachedAdminHashSource: string | null = null;

const getAdminHash = (): Buffer | null => {
  const envPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!envPassword) return null;

  // Re-hash if the env var changed (edge case: hot-reload in dev)
  if (cachedAdminHash && cachedAdminHashSource === envPassword) {
    return cachedAdminHash;
  }

  cachedAdminHash = crypto.createHash('sha256').update(envPassword).digest();
  cachedAdminHashSource = envPassword;
  return cachedAdminHash;
};

export const verifyAdminPassword = (submitted: string): boolean => {
  const expected = getAdminHash();
  if (!expected) return false;

  const submittedHash = crypto.createHash('sha256').update(submitted).digest();
  if (submittedHash.length !== expected.length) return false;

  return crypto.timingSafeEqual(submittedHash, expected);
};
