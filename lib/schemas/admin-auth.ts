import { z } from 'zod';

export const adminLoginSchema = z.object({
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
});

export type AdminLoginPayload = z.infer<typeof adminLoginSchema>;

export const domainsPostSchema = z.object({
  domains: z.array(z.string()).default([]),
});

export type DomainsPostPayload = z.infer<typeof domainsPostSchema>;

export const retentionPostSchema = z.object({
  seconds: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export type RetentionPostPayload = z.infer<typeof retentionPostSchema>;

export const brandingPostSchema = z.object({
  appName: z.string().optional(),
});

export type BrandingPostPayload = z.infer<typeof brandingPostSchema>;

export const homepageLockPostSchema = z.object({
  enabled: z.boolean(),
  password: z.string().optional(),
});

export type HomepageLockPostPayload = z.infer<typeof homepageLockPostSchema>;

export const telegramPostSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().optional().default(''),
  chatId: z.string().optional().default(''),
  allowedDomains: z.array(z.string()).optional().default([]),
});

export type TelegramPostPayload = z.infer<typeof telegramPostSchema>;

export const cloudflareDomainPostSchema = z.object({
  domain: z.string().min(1).max(253),
});

export type CloudflareDomainPostPayload = z.infer<typeof cloudflareDomainPostSchema>;
