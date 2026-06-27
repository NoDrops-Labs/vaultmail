import { z } from 'zod';

export const retentionSettingsSchema = z.object({
  seconds: z.number().int().positive(),
});

export type RetentionSettingsInput = z.infer<typeof retentionSettingsSchema>;

export const settingsPostSchema = z.object({
  retentionSeconds: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export type SettingsPostPayload = z.infer<typeof settingsPostSchema>;

export const brandingSettingsSchema = z.object({
  appName: z.string().optional(),
});

export type BrandingSettingsInput = z.infer<typeof brandingSettingsSchema>;
