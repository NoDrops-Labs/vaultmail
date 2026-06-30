import { storage } from '@/lib/storage';
import { DOMAIN_AUTO_APPROVE_KEY } from '@/lib/admin-auth';

export const getAutoApproveEnabled = async (): Promise<boolean> => {
  const raw = await storage.get(DOMAIN_AUTO_APPROVE_KEY);
  if (!raw) return false;
  if (typeof raw === 'object') {
    const val = raw as { enabled?: boolean };
    return val.enabled === true;
  }
  return false;
};
