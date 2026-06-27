'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Key, Shield, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getTranslations } from '@/lib/i18n';
import { DEFAULT_APP_NAME } from '@/lib/branding';
import { apiFetch } from '@/lib/client/api-fetch';
import { NavMenu } from '@/components/nav-menu';

const STORAGE_KEY = 'vaultmail_locale';

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?/~',
};

export function TokenGeneratorPage() {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [length, setLength] = useState('32');
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [token, setToken] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

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

  const generateToken = () => {
    const size = Math.max(Number(length) || 0, 1);
    let pool = '';
    if (useUpper) pool += CHARSETS.upper;
    if (useLower) pool += CHARSETS.lower;
    if (useNumbers) pool += CHARSETS.numbers;
    if (useSymbols) pool += CHARSETS.symbols;
    if (!pool) {
      setToken('');
      return;
    }
    let result = '';
    for (let i = 0; i < size; i += 1) {
      result += pool[Math.floor(Math.random() * pool.length)];
    }
    setToken(result);
    setCopyStatus('idle');
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 1200);
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

      <section className="max-w-4xl mx-auto px-4 py-8 md:py-16 w-full">
        <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-4 md:p-8 space-y-6">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5" style={{ color: 'var(--accent, #c4b5fd)' }} />
              <h1 className="text-xl md:text-2xl font-semibold">{t.tokenTitle}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base">{t.tokenSubtitle}</p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.tokenLengthLabel}
              </label>
              <Input
                value={length}
                onChange={(event) => setLength(event.target.value)}
                type="number"
                min="1"
                className="bg-black/40 border-white/10 text-sm"
              />
              <div className="grid gap-2 text-xs md:text-sm text-white/80">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useUpper}
                    onChange={(event) => setUseUpper(event.target.checked)}
                    className="accent-blue-500"
                  />
                  {t.tokenUppercase}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useLower}
                    onChange={(event) => setUseLower(event.target.checked)}
                    className="accent-blue-500"
                  />
                  {t.tokenLowercase}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useNumbers}
                    onChange={(event) => setUseNumbers(event.target.checked)}
                    className="accent-blue-500"
                  />
                  {t.tokenNumbers}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useSymbols}
                    onChange={(event) => setUseSymbols(event.target.checked)}
                    className="accent-blue-500"
                  />
                  {t.tokenSymbols}
                </label>
              </div>
              <Button onClick={generateToken} className="w-full">
                {t.tokenGenerate}
              </Button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.tokenResultLabel}
              </p>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 font-mono text-xs md:text-sm text-white/80 break-all min-h-[96px]">
                {token || t.tokenEmpty}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!token}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold',
                  token ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/40'
                )}
              >
                <Copy className="h-3 w-3" />
                {copyStatus === 'copied' ? t.tokenCopied : t.tokenCopy}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
