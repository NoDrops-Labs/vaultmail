import { z } from 'zod';

export const webhookJsonSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().optional().default(''),
  text: z.string().optional().default(''),
  html: z.string().optional().default(''),
  attachments: z
    .array(
      z.object({
        filename: z.string().optional(),
        contentType: z.string().optional(),
        size: z.number().optional(),
        contentBase64: z.string().optional(),
        contentId: z.string().optional(),
      }).passthrough()
    )
    .optional()
    .default([]),
});

export type WebhookJsonPayload = z.infer<typeof webhookJsonSchema>;
