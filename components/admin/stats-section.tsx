'use client';

import { AdminStats } from './types';

interface StatsSectionProps {
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: boolean;
  latestActivityLabel: string;
}

export function StatsSection({
  stats,
  latestActivityLabel
}: StatsSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Real-time Statistics
          </p>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Inbox Activity
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </div>
      </div>
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            Active Inboxes
          </p>
          <p className="mt-2 text-xl md:text-2xl font-semibold text-white">
            {stats?.inboxCount ?? 0}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            Total Messages
          </p>
          <p className="mt-2 text-xl md:text-2xl font-semibold text-white">
            {stats?.messageCount ?? 0}
          </p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            Latest Received
          </p>
          <p className="mt-2 text-base font-semibold text-white">
            {latestActivityLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
