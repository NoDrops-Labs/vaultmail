'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Copy, KeyRound, Shield, ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { DEFAULT_APP_NAME } from '@/lib/branding';
import { apiFetch } from '@/lib/client/api-fetch';
import { NavMenu } from '@/components/nav-menu';

const STORAGE_KEY = 'vaultmail_locale';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32ToBytes = (value: string) => {
  const cleaned = value.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) continue;
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
};

const formatTotp = (value: number, digits: number) =>
  value.toString().padStart(digits, '0');

const generateTotp = async (secret: string, timestamp: number) => {
  if (!secret.trim()) return '';
  const keyData = base32ToBytes(secret);
  if (!keyData.length) return '';
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, counter);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const bytes = new Uint8Array(signature);
  const offset = bytes[bytes.length - 1] & 0x0f;
  const binary =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return formatTotp(otp, TOTP_DIGITS);
};

interface TwoFactorPageProps {
  initialSecret?: string;
}

export function TwoFactorPage({ initialSecret = '' }: TwoFactorPageProps) {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState(initialSecret);
  const [totpCode, setTotpCode] = useState('');
  const [previousCode, setPreviousCode] = useState('');
  const [nextCode, setNextCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(TOTP_STEP_SECONDS);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKeyParam = searchParams?.get('key') ?? '';

  useEffect(() => {
    function handleStorageChange() {
      const storedLocale = localStorage.getItem(STORAGE_KEY);
      if (storedLocale === 'en' || storedLocale === 'id') {
        setLocale(storedLocale);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const updateSecret = () => setTotpSecret(initialSecret);
    updateSecret();
  }, [initialSecret]);

  useEffect(() => {
    if (totpSecret === currentKeyParam) return;
    const params = new URLSearchParams(searchParams?.toString());
    if (totpSecret.trim()) {
      params.set('key', totpSecret);
    } else {
      params.delete('key');
    }
    const nextQuery = params.toString();
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ''}`, { scroll: false });
  }, [currentKeyParam, pathname, router, searchParams, totpSecret]);

  useEffect(() => {
    let isActive = true;

    const updateCode = async () => {
      const now = Date.now();
      const secondsRemaining =
        TOTP_STEP_SECONDS - (Math.floor(now / 1000) % TOTP_STEP_SECONDS);
      if (isActive) {
        setRemainingSeconds(secondsRemaining);
      }
      try {
        const [prev, current, next] = await Promise.all([
          generateTotp(totpSecret, now - TOTP_STEP_SECONDS * 1000),
          generateTotp(totpSecret, now),
          generateTotp(totpSecret, now + TOTP_STEP_SECONDS * 1000),
        ]);
        if (isActive) {
          setPreviousCode(prev);
          setTotpCode(current);
          setNextCode(next);
          setTotpError(current ? '' : 'Invalid secret');
        }
      } catch {
        if (isActive) {
          setPreviousCode('');
          setTotpCode('');
          setNextCode('');
          setTotpError('Failed to generate code');
        }
      }
    };

    updateCode();
    const timer = setInterval(updateCode, 1000);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [totpSecret]);

  const t = useMemo(() => getTranslations(locale), [locale]);
  const resolvedAppName = customAppName || t.appName;

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await apiFetch('/api/branding');
        if (!response.ok) return;
        const data = (await response.json()) as { appName?: string };
        const value = data?.appName?.trim();
        setCustomAppName(value || DEFAULT_APP_NAME);
      } catch (error) {
        console.error(error);
      }
    };

    loadBranding();
  }, []);

  useEffect(() => {
    let active = true;

    const buildQrCode = async () => {
      if (!totpSecret.trim()) {
        if (active) setQrCodeDataUrl('');
        return;
      }
      const issuer = resolvedAppName || 'NoDrops Mail';
      const encodedIssuer = encodeURIComponent(issuer);
      const encodedSecret = encodeURIComponent(totpSecret.replace(/\s+/g, ''));
      const otpAuth = `otpauth://totp/${encodedIssuer}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
      try {
        const url = await QRCode.toDataURL(otpAuth, { margin: 1, width: 200 });
        if (active) setQrCodeDataUrl(url);
      } catch {
        if (active) setQrCodeDataUrl('');
      }
    };

    buildQrCode();

    return () => {
      active = false;
    };
  }, [resolvedAppName, totpSecret]);

  const handleCopy = async () => {
    if (!totpCode) return;
    try {
      await navigator.clipboard.writeText(totpCode);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      setCopyStatus('idle');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--accent, #3b82f6)', opacity: 0.1 }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--accent, #8b5cf6)', opacity: 0.1 }} />

      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--accent, #3b82f6), var(--accent, #8b5cf6))' }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span>{resolvedAppName}</span>
          </Link>
          <div className="flex items-center gap-4">
            <NavMenu />
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-8 md:py-16 w-full">
        <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-4 md:p-8 space-y-6">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <KeyRound className="h-5 w-5" style={{ color: 'var(--accent, #fbbf24)' }} />
                <h1 className="text-xl md:text-2xl font-semibold">{t.toolsTwoFaTitle}</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
                {t.toolsTwoFaDesc}
              </p>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-[1.3fr_1fr_0.9fr]">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.twoFaSecretLabel}
              </label>
              <input
                value={totpSecret}
                onChange={(event) => setTotpSecret(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white outline-none transition focus:border-white/30"
                placeholder={t.twoFaSecretPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {t.twoFaSecretHint}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.twoFaCodeLabel}
              </p>
              <div className="space-y-3">
                <CodeRow label={t.twoFaPrevious} value={previousCode} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      {t.twoFaCurrent}
                    </p>
                    <p className="text-3xl font-bold text-white tracking-[0.3em]">
                      {totpCode || '------'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold transition',
                      totpCode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/5 text-white/40'
                    )}
                    disabled={!totpCode}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copyStatus === 'copied' ? t.twoFaCopied : t.twoFaCopy}
                  </button>
                </div>
                <CodeRow label={t.twoFaNext} value={nextCode} />
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r transition-[width]" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--accent, #60a5fa), var(--accent, #a855f7))',  width: `${(remainingSeconds / TOTP_STEP_SECONDS) * 100}%` }}
                />
              </div>
              <p className="text-xs text-white/60">
                {totpError
                  ? t.twoFaInvalid
                  : t.twoFaCountdown.replace('{seconds}', `${remainingSeconds}`)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.twoFaQrLabel}
              </p>
              {qrCodeDataUrl ? (
                <Image
                  src={qrCodeDataUrl}
                  alt={t.twoFaQrLabel}
                  width={128}
                  height={128}
                  className="rounded-lg border border-white/10 bg-white/5 p-2"
                  unoptimized
                />
              ) : (
                <div className="h-32 w-32 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-xs text-white/50">
                  {t.twoFaQrEmpty}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span>{t.twoFaNotice}</span>
            <Link
              href="/tools"
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              {t.menuTools}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CodeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-white/60">
      <span>{label}</span>
      <span className="font-mono text-xs md:text-sm text-white/80 tracking-[0.2em]">
        {value || '------'}
      </span>
    </div>
  );
}
