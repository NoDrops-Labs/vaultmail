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

export const isAdminSessionValid = async (token?: string | null) => {
  if (!token) return false;
  const exists = await storage.exists(`${ADMIN_SESSION_PREFIX}${token}`);
  return Boolean(exists);
};
