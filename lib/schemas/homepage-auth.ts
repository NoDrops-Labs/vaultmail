import { z } from 'zod';

export const homepageAuthSchema = z.object({
  password: z.string().min(1),
});

export type HomepageAuthPayload = z.infer<typeof homepageAuthSchema>;
