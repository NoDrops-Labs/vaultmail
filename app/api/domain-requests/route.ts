import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/api-key-middleware';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { hashIp, getRequestIp } from '@/lib/ip-hash';
import { createDomainRequest, updateDomainRequest, getDomainRequest } from '@/lib/domain-requests';
import { sendTelegramMessage } from '@/lib/telegram';
import { storage } from '@/lib/storage';
import { withPrefix } from '@/lib/storage-keys';
import { getAutoApproveEnabled } from '@/lib/domain-auto-approve';
import { isCloudflareConfigured } from '@/lib/cloudflare-zones';
import { startOnboarding, getOnboarding } from '@/lib/domain-onboarding';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_KEY = withPrefix('domain-request:rate');

const schema = z.object({
  domain: z.string().min(1).max(253),
  type: z.enum(['add', 'remove']),
  turnstileToken: z.string().optional(),
});

export async function POST(req: Request) {
  const rateLimit = await checkApiRateLimit(req, 'domain.request');
  if (rateLimit.blocked) {
    if (rateLimit.reason) {
      return NextResponse.json({ error: 'Forbidden', reason: rateLimit.reason }, { status: 403 });
    }
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken ?? '', {
    expectedAction: 'domain-request',
  });
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Bot verification failed. Please try again.' }, { status: 403 });
  }

  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);

  const ipRateKey = `${RATE_LIMIT_KEY}:${ipHash}`;
  const ipRateAcquired = await storage.setIfAbsent(ipRateKey, '1', { ex: 60 });
  if (!ipRateAcquired) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  try {
    const { request, created } = await createDomainRequest(
      parsed.data.domain,
      parsed.data.type,
      ipHash,
      turnstileOk
    );

    if (parsed.data.type === 'remove') {
      if (created) {
        await sendTelegramMessage(`🔔 New Domain Removal Request\nDomain: ${request.domain}\nID: ${request.id}`);
      }
      return NextResponse.json({
        token: request.id,
        domain: request.domain,
        status: 'pending',
        nameservers: null,
        autoApproved: false,
      });
    }

    const autoApprove = await getAutoApproveEnabled();

    if (!autoApprove || !isCloudflareConfigured()) {
      if (created) {
        await sendTelegramMessage(`🔔 New Domain Request (Add)\nDomain: ${request.domain}\nID: ${request.id}`);
      }
      return NextResponse.json({
        token: request.id,
        domain: request.domain,
        status: 'pending',
        nameservers: null,
        autoApproved: false,
      });
    }

    const existingOnboarding = await getOnboarding(request.domain);
    if (existingOnboarding?.source === 'admin') {
      return NextResponse.json({
        token: request.id,
        domain: request.domain,
        status: 'pending',
        nameservers: null,
        autoApproved: false,
      });
    }

    if (!created) {
      const existing = await getDomainRequest(request.id);
      if (existing?.status === 'approved') {
        return NextResponse.json({
          token: request.id,
          domain: request.domain,
          status: 'approved',
          nameservers: existingOnboarding?.nameservers ?? null,
          autoApproved: true,
        });
      }
    }

    try {
      const record = await startOnboarding(request.domain, { source: 'user-request' });
      if (record.step === 'failed_retryable' || record.step === 'failed_terminal') {
        await updateDomainRequest(request.id, {
          onboardingStatus: 'failed',
          onboardingError: record.error?.message || 'Onboarding failed',
        });
        return NextResponse.json({
          token: request.id,
          domain: request.domain,
          status: 'failed',
          nameservers: null,
          autoApproved: true,
        });
      }
      await updateDomainRequest(request.id, {
        status: 'approved',
        onboardingStatus: 'started',
      });

      return NextResponse.json({
        token: request.id,
        domain: request.domain,
        status: 'approved',
        nameservers: record.nameservers ?? null,
        autoApproved: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Onboarding failed';
      await updateDomainRequest(request.id, {
        onboardingStatus: 'failed',
        onboardingError: message,
      });
      return NextResponse.json({
        token: request.id,
        domain: request.domain,
        status: 'failed',
        nameservers: null,
        autoApproved: true,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
