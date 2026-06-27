import crypto from 'crypto';

export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

export const validateWebhookSecret = (request: Request): boolean => {
  const secret = process.env.WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.ALLOW_UNAUTHENTICATED_WEBHOOK === 'true') {
      return true;
    }
    console.error(
      'WEBHOOK_SECRET is not set; webhook rejected. Set ALLOW_UNAUTHENTICATED_WEBHOOK=true for local dev.'
    );
    return false;
  }
  const provided = request.headers.get(WEBHOOK_SECRET_HEADER)?.trim();
  if (!provided) return false;
  try {
    const a = Buffer.from(secret);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
