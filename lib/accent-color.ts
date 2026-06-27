import { storage } from '@/lib/storage';
import { ACCENT_COLOR_SETTINGS_KEY, ACCENT_PALETTE_SETTINGS_KEY } from '@/lib/admin-auth';

export const getAccentColor = async (): Promise<string | null> => {
  const color = await storage.get(ACCENT_COLOR_SETTINGS_KEY);
  return typeof color === 'string' ? color : null;
};

export const setAccentColor = async (color: string): Promise<void> => {
  await storage.set(ACCENT_COLOR_SETTINGS_KEY, color);
};

export const deleteAccentColor = async (): Promise<void> => {
  await storage.del(ACCENT_COLOR_SETTINGS_KEY);
};

export const getAccentPalette = async (): Promise<string[] | null> => {
  const palette = await storage.get(ACCENT_PALETTE_SETTINGS_KEY);
  if (!palette) return null;
  try {
    return Array.isArray(palette) ? palette : JSON.parse(palette as string);
  } catch {
    return null;
  }
};

export const setAccentPalette = async (palette: string[]): Promise<void> => {
  await storage.set(ACCENT_PALETTE_SETTINGS_KEY, JSON.stringify(palette));
};
