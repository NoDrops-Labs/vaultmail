'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Code2, Shield, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTranslations } from '@/lib/i18n';
import { DEFAULT_APP_NAME } from '@/lib/branding';
import { apiFetch } from '@/lib/client/api-fetch';
import { NavMenu } from '@/components/nav-menu';

const STORAGE_KEY = 'vaultmail_locale';

export function UrlCodecPage() {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [outputValue, setOutputValue] = useState('');
  const [error, setError] = useState('');

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

  const handleEncode = () => {
    setError('');
    setOutputValue(encodeURIComponent(inputValue));
  };

  const handleDecode = () => {
    try {
      const decoded = decodeURIComponent(inputValue);
      setOutputValue(decoded);
      setError('');
    } catch {
      setError(t.urlCodecInvalid);
      setOutputValue('');
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
              <Code2 className="h-5 w-5" style={{ color: 'var(--accent, #93c5fd)' }} />
              <h1 className="text-xl md:text-2xl font-semibold">{t.urlCodecTitle}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base">{t.urlCodecSubtitle}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {t.urlCodecInputLabel}
            </label>
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={t.urlCodecInputPlaceholder}
              className="w-full min-h-[120px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
            />
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button onClick={handleEncode} className="w-full sm:w-auto">{t.urlCodecEncode}</Button>
              <Button variant="secondary" onClick={handleDecode} className="w-full sm:w-auto">
                {t.urlCodecDecode}
              </Button>
            </div>
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {t.urlCodecResultLabel}
            </p>
            <textarea
              value={outputValue}
              readOnly
              className="w-full min-h-[120px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
