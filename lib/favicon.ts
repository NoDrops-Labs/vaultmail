import { storage } from '@/lib/storage';
import { FAVICON_SETTINGS_KEY } from '@/lib/admin-auth';

export type FaviconSettings = {
  contentType: string;
  data: string;
  hash: string;
  updatedAt: string;
};

const parseFaviconSettings = (value: unknown): FaviconSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as FaviconSettings; } catch { return null; }
  }
  if (typeof value === 'object') return value as FaviconSettings;
  return null;
};

export const getFaviconSettings = async (): Promise<FaviconSettings | null> => {
  const raw = await storage.get(FAVICON_SETTINGS_KEY);
  return parseFaviconSettings(raw);
};

export const setFaviconSettings = async (settings: FaviconSettings): Promise<void> => {
  await storage.set(FAVICON_SETTINGS_KEY, settings);
};

export const deleteFaviconSettings = async (): Promise<void> => {
  await storage.del(FAVICON_SETTINGS_KEY);
};
