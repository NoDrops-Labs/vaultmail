'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Coins, Shield, ArrowLeft } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { getTranslations } from '@/lib/i18n';
import { DEFAULT_APP_NAME } from '@/lib/branding';
import { apiFetch } from '@/lib/client/api-fetch';
import { NavMenu } from '@/components/nav-menu';

const STORAGE_KEY = 'vaultmail_locale';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function RefundCalculatorPage() {
  const [locale, setLocale] = useState<'en' | 'id'>('en');
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [totalDays, setTotalDays] = useState('30');
  const [refundRate, setRefundRate] = useState(0.7);

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

  const priceValue = Math.max(Number(purchasePrice) || 0, 0);
  const totalValue = Math.max(Number(totalDays) || 0, 0);
  const resolvedPurchaseDate = purchaseDate ? new Date(purchaseDate) : null;
  const resolvedIssueDate = issueDate ? new Date(issueDate) : null;
  const elapsedDays =
    resolvedPurchaseDate && resolvedIssueDate
      ? Math.max(
          0,
          Math.ceil(
            (resolvedIssueDate.getTime() - resolvedPurchaseDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const remainingValue = clamp(totalValue - elapsedDays, 0, totalValue || 0);
  const rateValue = clamp(refundRate, 0.5, 1);
  const usageRatio = totalValue > 0 ? remainingValue / totalValue : 0;
  const refundAmount = priceValue * usageRatio * rateValue;
  const refundPercentage = priceValue > 0 ? (refundAmount / priceValue) * 100 : 0;
  const retainedAmount = Math.max(priceValue - refundAmount, 0);
  const formatCurrency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });

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
              <Coins className="h-5 w-5 text-emerald-300" />
              <h1 className="text-xl md:text-2xl font-semibold">{t.refundTitle}</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base">{t.refundSubtitle}</p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.refundPurchaseLabel}
              </label>
              <Input
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.target.value)}
                type="number"
                min="0"
                className="bg-black/40 border-white/10 text-sm"
                placeholder="0"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.refundPurchaseDateLabel}
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.refundIssueDateLabel}
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {t.refundTotalLabel}
              </label>
              <Input
                value={totalDays}
                onChange={(event) => setTotalDays(event.target.value)}
                type="number"
                min="1"
                className="bg-black/40 border-white/10 text-sm"
                placeholder="30"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <label className="font-semibold uppercase tracking-[0.2em] text-white/50">
                  {t.refundRateLabel}
                </label>
                <span>{rateValue.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                value={refundRate}
                onChange={(event) => setRefundRate(Number(event.target.value))}
                className="w-full accent-emerald-400"
              />
              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>0.50</span>
                <span>1.00</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
            <div className="flex items-center justify-between text-xs md:text-sm text-white/80">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" style={{ color: 'var(--accent, #93c5fd)' }} />
                <span>{t.refundPreviewTitle}</span>
              </div>
              <span>{t.refundPreviewRate.replace('{rate}', `${rateValue.toFixed(2)}`)}</span>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className="h-32 w-32 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#34d399 ${refundPercentage}%, rgba(255,255,255,0.1) 0)`,
                  }}
                >
                  <div className="h-24 w-24 rounded-full bg-slate-950/80 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-white/60">{t.refundRefundLabel}</span>
                    <span className="text-base md:text-lg font-semibold text-white">
                      {refundPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-white/60">
                  {t.refundRemainingDays.replace('{days}', `${remainingValue}`)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs md:text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>{t.refundAmountLabel}</span>
                  <span>{formatCurrency.format(refundAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-white/60 text-xs">
                  <span>{t.refundRetainedLabel}</span>
                  <span>{formatCurrency.format(retainedAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-white/60 text-xs">
                  <span>{t.refundElapsedLabel}</span>
                  <span>{elapsedDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
