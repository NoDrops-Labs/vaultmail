import { NextResponse } from 'next/server';
import { getFaviconSettings, setFaviconSettings, deleteFaviconSettings } from '@/lib/favicon';
import { requireAdminRequest } from '@/lib/admin-request';
import crypto from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
    
    if (result.data.data.length > 512 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 512KB)' }, { status: 400 });
    }

    const hash = crypto.createHash('sha256').update(result.data.data).digest('hex');
    
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
