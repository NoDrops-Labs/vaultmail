import { NextResponse } from 'next/server';
import { apiKeyGenerateSchema } from '@/lib/schemas/api-key';
import { addApiKey, getApiKeys } from '@/lib/api-key';
import { requireAdminRequest } from '@/lib/admin-request';

export const dynamic = 'force-dynamic';

type ApiKeyView = {
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
};

const toView = (entry: {
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}): ApiKeyView => ({
  hash: entry.hash,
  label: entry.label,
  createdAt: entry.createdAt,
  lastUsedAt: entry.lastUsedAt
});

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }
  const keys = await getApiKeys();
  return NextResponse.json({ keys: keys.map(toView) });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = apiKeyGenerateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const plainKey = await addApiKey(parsed.data.label);
  return NextResponse.json({ apiKey: plainKey }, { status: 201 });
}
