import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { extractEmail } from '@/lib/utils';
import { RETENTION_SETTINGS_KEY } from '@/lib/admin-auth';
import { inboxKey } from '@/lib/storage-keys';
import { validateWebhookSecret } from '@/lib/webhook-auth';
import { authorizeWebhookRequest } from '@/lib/api-key-middleware';
import { webhookJsonSchema } from '@/lib/schemas/webhook';
import { isAddressSupported } from '@/lib/domains';
import crypto from 'crypto';

type RetentionSettings = {
  seconds: number;
};

const DEFAULT_MAX_ATTACHMENT_BYTES = 2_000_000;
const MAX_ATTACHMENT_BYTES =
  Number(process.env.ATTACHMENT_MAX_BYTES) || DEFAULT_MAX_ATTACHMENT_BYTES;

const estimateBase64Bytes = (value?: string) => {
  if (!value) return 0;
  const normalized = value.trim().replace(/\s+/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};

const extractAttachmentsFromFormData = async (formData: FormData) => {
  const attachments = [];
  for (const [, value] of formData.entries()) {
    if (value instanceof File) {
      if (value.size > MAX_ATTACHMENT_BYTES) {
        attachments.push({
          filename: value.name,
          contentType: value.type || 'application/octet-stream',
          size: value.size,
          omitted: true
        });
        continue;
      }
      const buffer = Buffer.from(await value.arrayBuffer());
      attachments.push({
        filename: value.name,
        contentType: value.type || 'application/octet-stream',
        size: value.size,
        contentBase64: buffer.toString('base64'),
        omitted: false
      });
    }
  }
  return attachments;
};

const parseRetentionSettings = (value: unknown): RetentionSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as RetentionSettings;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as RetentionSettings;
  }
  return null;
};

const getRetentionSeconds = async () => {
  const settingsRaw = await storage.get(RETENTION_SETTINGS_KEY);
  const settings = parseRetentionSettings(settingsRaw);
  return settings?.seconds || 86400;
};

export async function POST(req: Request) {
  if (!validateWebhookSecret(req)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const webhookRateLimit = await authorizeWebhookRequest(req);
  if (webhookRateLimit.blocked) {
    return new NextResponse('Too many requests', { status: 429 });
  }
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let from, to, subject, text, html, attachments;

    if (contentType.includes('application/json')) {
      const parsed = webhookJsonSchema.safeParse(await req.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid JSON payload', details: parsed.error.format() },
          { status: 400 }
        );
      }
      const body = parsed.data;
      from = body.from;
      to = body.to;
      subject = body.subject;
      text = body.text;
      html = body.html;
      attachments = body.attachments;
      if (Array.isArray(attachments)) {
        attachments = attachments.map((attachment) => {
          const base64 = typeof attachment.contentBase64 === 'string' ? attachment.contentBase64 : '';
          const size =
            typeof attachment.size === 'number'
              ? attachment.size
              : estimateBase64Bytes(base64);
          if (size > MAX_ATTACHMENT_BYTES) {
            return {
              ...attachment,
              size,
              contentBase64: undefined,
              omitted: true
            };
          }
          return {
            ...attachment,
            size,
            omitted: false
          };
        });
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('from') as string;
      to = formData.get('to') as string || formData.get('recipient') as string;
      subject = formData.get('subject') as string;
      text = formData.get('text') as string || formData.get('body-plain') as string;
      html = formData.get('html') as string || formData.get('body-html') as string;
      attachments = await extractAttachmentsFromFormData(formData);
    } else {
       return new NextResponse('Unsupported Content-Type', { status: 415 });
    }

    if (!to || !from) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const cleanTo = extractEmail(to);
    
    if (!cleanTo) {
      return new NextResponse('Invalid recipient', { status: 400 });
    }

    const supported = await isAddressSupported(cleanTo);
    if (!supported) {
      return new NextResponse('Domain not supported', { status: 400 });
    }

    const emailId = crypto.randomUUID();
    const emailData = {
      id: emailId,
      from,
      to,
      subject: subject || '(No Subject)',
      text: text || '',
      html: html || text || '', // Fallback
      attachments: Array.isArray(attachments) ? attachments : [],
      receivedAt: new Date().toISOString(),
      read: false
    };

    const key = inboxKey(cleanTo);
    
    const retention = await getRetentionSeconds();
    
    // Store email in a list (LIFO usually better for email? No, Redis list is generic. lpush = prepend)
    // lpush puts new emails at index 0.
    await storage.lpush(key, emailData);
    
    // Set expiry based on global retention setting.
    await storage.expire(key, retention);

    return NextResponse.json({ success: true, id: emailId });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
