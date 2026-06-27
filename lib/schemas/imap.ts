import { z } from 'zod';

export const imapSettingsFieldsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional().default(''),
  port: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  user: z.string().optional().default(''),
  password: z.string().optional().default(''),
  tls: z.boolean().optional().default(true),
  rejectUnauthorized: z.boolean().optional().default(true),
  maxFetch: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export const imapPostSchema = imapSettingsFieldsSchema.extend({
  action: z.literal('test').optional(),
});

export type ImapPostPayload = z.infer<typeof imapPostSchema>;

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
