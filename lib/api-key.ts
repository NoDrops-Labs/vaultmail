import crypto from 'crypto';
import { storage } from '@/lib/storage';
import { API_KEYS_SETTINGS_KEY } from '@/lib/admin-auth';

export const API_KEY_COOKIE = 'vaultmail_api_key';

export type ApiKeyEntry = {
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
};

const PREFIX = 'vmail_';

export const generateApiKey = () => {
  const random = crypto.randomBytes(24).toString('hex');
  return `${PREFIX}${random}`;
};

export const hashApiKey = (key: string) =>
  crypto.createHash('sha256').update(key).digest('hex');

const parseApiKeys = (value: unknown): ApiKeyEntry[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ApiKeyEntry[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value as ApiKeyEntry[];
  return [];
};

export const getApiKeys = async (): Promise<ApiKeyEntry[]> => {
  const raw = await storage.get(API_KEYS_SETTINGS_KEY);
  return parseApiKeys(raw);
};

export const addApiKey = async (label: string): Promise<string> => {
  const plainKey = generateApiKey();
  const entry: ApiKeyEntry = {
    hash: hashApiKey(plainKey),
    label: label.slice(0, 50),
    createdAt: new Date().toISOString(),
  };
  const keys = await getApiKeys();
  keys.push(entry);
  await storage.set(API_KEYS_SETTINGS_KEY, keys);
  return plainKey;
};

export const revokeApiKey = async (hash: string): Promise<boolean> => {
  const keys = await getApiKeys();
  const filtered = keys.filter((k) => k.hash !== hash);
  if (filtered.length === keys.length) return false;
  await storage.set(API_KEYS_SETTINGS_KEY, filtered);
  return true;
};

export const validateApiKey = async (plainKey: string): Promise<boolean> => {
  if (!plainKey || !plainKey.startsWith(PREFIX)) return false;
  const keys = await getApiKeys();
  const hash = hashApiKey(plainKey);
  const found = keys.find((k) => k.hash === hash);
  if (!found) return false;
  found.lastUsedAt = new Date().toISOString();
  await storage.set(API_KEYS_SETTINGS_KEY, keys);
  return true;
};

export const isApiKeyConfigured = async (): Promise<boolean> => {
  const keys = await getApiKeys();
  return keys.length > 0;
};
