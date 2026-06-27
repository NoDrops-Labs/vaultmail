export type TelegramSettings = {
  enabled: boolean;
  botToken: string;
  chatId: string;
  allowedDomains?: string[];
};

export type RetentionSettings = {
  seconds: number;
};

export type BrandingSettings = {
  appName: string;
};

export type HomepageLockSettings = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt?: string;
};

export type DomainsSettings = {
  domains: string[];
};

export type AdminStats = {
  inboxCount: number;
  messageCount: number;
  latestReceivedAt: string | null;
};

export type ImapSettings = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  rejectUnauthorized: boolean;
  maxFetch: number;
  updatedAt?: string;
};

export type ApiKeyView = {
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
};
