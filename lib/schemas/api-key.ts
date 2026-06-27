import { z } from 'zod';

export const apiKeyGenerateSchema = z.object({
  label: z.string().min(1).max(50),
});

export type ApiKeyGeneratePayload = z.infer<typeof apiKeyGenerateSchema>;

export const apiKeyRevokeSchema = z.object({
  hash: z.string().min(1),
});

export type ApiKeyRevokePayload = z.infer<typeof apiKeyRevokeSchema>;
