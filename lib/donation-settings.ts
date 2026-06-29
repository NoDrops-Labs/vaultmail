import { storage } from '@/lib/storage';
import { DONATION_SETTINGS_KEY } from '@/lib/admin-auth';

export type DonationSettings = {
  enabled: boolean;
  evmAddress: string;
  message: string;
};

const DEFAULT_MESSAGE = 'If this project helped you, consider supporting with a donation';

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const parseDonationSettings = (value: unknown): DonationSettings | null => {
  if (!value) return null;
  let obj: unknown = value;
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof obj !== 'object' || obj === null) return null;
  const raw = obj as Partial<DonationSettings>;
  const enabled = raw.enabled === true;
  const evmAddress = typeof raw.evmAddress === 'string' ? raw.evmAddress.trim() : '';
  const message = typeof raw.message === 'string' && raw.message.trim() ? raw.message.trim() : DEFAULT_MESSAGE;

  if (enabled && !evmAddressRegex.test(evmAddress)) return null;

  return { enabled, evmAddress, message };
};

export const getDonationSettings = async (): Promise<DonationSettings | null> => {
  if (!process.env.MONGODB_URI) return null;
  const stored = await storage.get(DONATION_SETTINGS_KEY);
  return parseDonationSettings(stored);
};
