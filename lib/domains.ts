import { storage } from '@/lib/storage';
import { DOMAINS_SETTINGS_KEY, DOMAINS_CONFIG_SETTINGS_KEY } from '@/lib/admin-auth';
import {
  expandDomains,
  isDomainInConfig,
  type MasterDomainConfig,
} from '@/lib/domain-config';

type DomainsPayload = {
  domains: string[];
};

export const normalizeDomains = (domains: string[]) => {
  const normalized = domains
    .map((domain) => domain.toLowerCase().trim())
    .filter(Boolean);
  return [...new Set(normalized)];
};

export const parseDomains = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object' && value) {
    const payload = value as DomainsPayload;
    if (Array.isArray(payload.domains)) {
      return payload.domains;
    }
  }
  return [];
};

const parseMasterDomainConfig = (value: unknown): MasterDomainConfig[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as MasterDomainConfig[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value as MasterDomainConfig[];
  }
  return [];
};

export const getStoredDomains = async () => {
  const storedRaw = await storage.get(DOMAINS_SETTINGS_KEY);
  return normalizeDomains(parseDomains(storedRaw));
};

export const getMasterDomains = async (): Promise<MasterDomainConfig[]> => {
  const storedRaw = await storage.get(DOMAINS_CONFIG_SETTINGS_KEY);
  return parseMasterDomainConfig(storedRaw);
};

export const getDomains = async (): Promise<string[]> => {
  const config = await getMasterDomains();
  if (config.length > 0) {
    return expandDomains(config);
  }
  return getStoredDomains();
};

export const isAddressSupported = async (email: string): Promise<boolean> => {
  const domain = email.split('@').pop();
  if (!domain) return false;
  const config = await getMasterDomains();
  if (config.length === 0) {
    const flat = await getStoredDomains();
    return flat.includes(domain.toLowerCase().trim());
  }
  return isDomainInConfig(domain, config);
};
