import { NextResponse } from 'next/server';
import { getFaviconSettings, setFaviconSettings, deleteFaviconSettings } from '@/lib/favicon';
import { requireAdminRequest } from '@/lib/admin-request';
import crypto from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
]);

const MAX_DECODED_BYTES = 2 * 1024 * 1024;

type MagicMatch = { contentType: string } | null;

const detectMagicType = (buf: Buffer): MagicMatch => {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { contentType: 'image/png' };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: 'image/jpeg' };
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { contentType: 'image/gif' };
  }
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return { contentType: 'image/webp' };
  }
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) {
    return { contentType: 'image/x-icon' };
  }
  if (buf.length >= 5 && buf.slice(0, 5).toString('latin1') === '<?xml') {
    return { contentType: 'image/svg+xml' };
  }
  if (buf.length >= 4 && buf.slice(0, 4).toString('latin1') === '<svg') {
    return { contentType: 'image/svg+xml' };
  }
  return null;
};

const SVG_SCRIPT_PATTERN = /<script[\s>]/i;

const sanitizeSvg = (svgText: string): boolean => {
  return !SVG_SCRIPT_PATTERN.test(svgText);
};

const schema = z.object({
  contentType: z.string(),
  data: z.string()
});

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const settings = await getFaviconSettings();
  return NextResponse.json(settings || { data: null });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (result.data.data.length > MAX_DECODED_BYTES * 1.4) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(result.data.data, 'base64');
    } catch {
      return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 });
    }

    if (buffer.length > MAX_DECODED_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(result.data.contentType)) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    const magic = detectMagicType(buffer);
    if (!magic) {
      return NextResponse.json({ error: 'Unrecognized image format' }, { status: 400 });
    }

    if (magic.contentType !== result.data.contentType) {
      return NextResponse.json({ error: 'Content type does not match file data' }, { status: 400 });
    }

    if (magic.contentType === 'image/svg+xml') {
      const svgText = buffer.toString('utf8');
      if (!sanitizeSvg(svgText)) {
        return NextResponse.json({ error: 'SVG with <script> tags is not allowed' }, { status: 400 });
      }
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    await setFaviconSettings({
      contentType: result.data.contentType,
      data: result.data.data,
      hash,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, hash });
  } catch (error) {
    console.error('Favicon API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  await deleteFaviconSettings();
  return NextResponse.json({ success: true });
}
