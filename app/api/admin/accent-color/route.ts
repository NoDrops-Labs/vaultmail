import { NextResponse } from 'next/server';
import { getAccentColor, setAccentColor, getAccentPalette, setAccentPalette, deleteAccentColor } from '@/lib/accent-color';
import { requireAdminRequest } from '@/lib/admin-request';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  color: z.string().optional(),
  palette: z.array(z.string()).optional()
});

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const [color, palette] = await Promise.all([
    getAccentColor(),
    getAccentPalette()
  ]);
  
  return NextResponse.json({ color, palette });
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
    
    if (result.data.color) {
      await setAccentColor(result.data.color);
    }
    if (result.data.palette) {
      await setAccentPalette(result.data.palette);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accent Color API Error:', error);
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

  await deleteAccentColor();
  return NextResponse.json({ success: true });
}
