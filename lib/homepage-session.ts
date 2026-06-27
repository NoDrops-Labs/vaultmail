import crypto from 'crypto';
import { storage } from '@/lib/storage';
import { RETENTION_SETTINGS_KEY } from '@/lib/admin-auth';

export const HOMEPAGE_SESSION_COOKIE = 'vaultmail_homepage_session';
export const HOMEPAGE_LOCK_COOKIE = 'vaultmail_homepage_auth';

const SESSION_PREFIX = 'homepage:session:';

const generateToken = () => {
  const random = crypto.randomBytes(24).toString('hex');
  return `sess_${random}`;
};

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const getRetentionSeconds = async (): Promise<number> => {
  const raw = await storage.get(RETENTION_SETTINGS_KEY);
  if (!raw) return 86400;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.seconds === 'number' ? parsed.seconds : 86400;
    } catch {
      return 86400;
    }
  }
  if (typeof raw === 'object' && raw) {
    const obj = raw as { seconds?: number };
    return typeof obj.seconds === 'number' ? obj.seconds : 86400;
  }
  return 86400;
};

export const createHomepageSession = async (): Promise<string> => {
  const token = generateToken();
  const hash = hashToken(token);
  const ttl = await getRetentionSeconds();
  await storage.set(SESSION_PREFIX + hash, { createdAt: new Date().toISOString() }, { ex: ttl });
  return token;
};

export const validateHomepageSession = async (token: string): Promise<boolean> => {
  if (!token || !token.startsWith('sess_')) return false;
  const hash = hashToken(token);
  const stored = await storage.get(SESSION_PREFIX + hash);
  return Boolean(stored);
};

export const deleteHomepageSession = async (token: string): Promise<void> => {
  if (!token || !token.startsWith('sess_')) return;
  const hash = hashToken(token);
  await storage.del(SESSION_PREFIX + hash);
};

export const migrateOldCookie = async (): Promise<string | null> => {
  return await createHomepageSession();
};
