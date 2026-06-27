'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Shield, ArrowLeft } from 'lucide-react';

import { getTranslations } from '@/lib/i18n';
import { DEFAULT_APP_NAME } from '@/lib/branding';
import { apiFetch } from '@/lib/client/api-fetch';
import { NavMenu } from '@/components/nav-menu';

const STORAGE_KEY = 'vaultmail_locale';

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

export function DayCounterPage() {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateInput(new Date()));

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

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

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
              <Calendar className="h-5 w-5" style={{ color: 'var(--accent, #93c5fd)' }} />
              <h1 className="text-xl md:text-2xl font-semibold">{t.dayCounterTitle}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base">{t.dayCounterSubtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.dayCounterStart}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.dayCounterEnd}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {t.dayCounterResultLabel}
            </p>
            <p className="mt-3 text-3xl font-bold text-white">
              {Number.isNaN(days) ? '--' : t.dayCounterResult.replace('{days}', `${days}`)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
