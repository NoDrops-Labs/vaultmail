import { NextResponse } from 'next/server';
import { DOMAINS_SETTINGS_KEY } from '@/lib/admin-auth';
import { storage } from '@/lib/storage';
import { getStoredDomains, normalizeDomains } from '@/lib/domains';
import { domainsPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const storedDomains = await getStoredDomains();

  return NextResponse.json({ domains: storedDomains });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = domainsPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const normalized = normalizeDomains(parsed.data.domains);

  await storage.set(DOMAINS_SETTINGS_KEY, { domains: normalized });

  return NextResponse.json({ domains: normalized });
}
