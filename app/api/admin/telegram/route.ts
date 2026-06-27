import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { TELEGRAM_SETTINGS_KEY } from '@/lib/admin-auth';
import { telegramPostSchema } from '@/lib/schemas/admin-auth';
import { requireAdminRequest } from '@/lib/admin-request';

type TelegramSettings = {
  enabled: boolean;
  botToken: string;
  chatId: string;
  allowedDomains: string[];
  updatedAt: string;
};

const parseSettings = (value: unknown): TelegramSettings | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as TelegramSettings;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as TelegramSettings;
  }
  return null;
};

export async function GET(req: Request) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const settingsRaw = await storage.get(TELEGRAM_SETTINGS_KEY);
  const settings = parseSettings(settingsRaw) || {
    enabled: false,
    botToken: '',
    chatId: '',
    allowedDomains: [],
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json({
    ...settings,
    botToken: settings.botToken ? '••••••••' : '',
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminRequest(request);
  if (!guard.ok) {
    if (guard.status === 401) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden', reason: guard.reason }, { status: 403 });
  }

  const parsed = telegramPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const enabled = body.enabled;
  const botToken = body.botToken.trim();
  const chatId = body.chatId.trim();
  const allowedDomains = body.allowedDomains
    .map((domain) => domain.toLowerCase().trim())
    .filter(Boolean);

  const settings: TelegramSettings = {
    enabled,
    botToken,
    chatId,
    allowedDomains,
    updatedAt: new Date().toISOString()
  };

  await storage.set(TELEGRAM_SETTINGS_KEY, settings);

  return NextResponse.json(settings);
}
