'use client';

import { Clock } from 'lucide-react';

interface RetentionSectionProps {
  retentionSeconds: number;
  retentionOptions: { label: string; value: number }[];
  saveRetention: (v: number) => void;
  retentionSaving: boolean;
}

export function RetentionSection({
  retentionSeconds,
  retentionOptions,
  saveRetention,
  retentionSaving
}: RetentionSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Global Inbox Retention
          </h2>
          <p className="text-xs md:text-sm text-white/60">
            All inboxes follow this duration.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Clock className="h-4 w-4" />
          {retentionOptions.find((option) => option.value === retentionSeconds)
            ?.label || '24 Hours'}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {retentionOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => saveRetention(option.value)}
            disabled={retentionSaving}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
              retentionSeconds === option.value
                ? 'text-white'
                : 'border-white/5 bg-white/[0.02] text-white/70 hover:border-white/10 hover:bg-white/[0.05]'
            }`}
            style={{
              ...(retentionSeconds === option.value ? { borderColor: 'var(--accent, #a78bfa)', backgroundColor: 'var(--accent, #8b5cf6)', opacity: 0.5 } : {})
            }}
          >
            <span className="font-medium">{option.label}</span>
            {retentionSeconds === option.value && (
              <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: 'var(--accent, #8b5cf6)', color: 'var(--accent, #c4b5fd)' }}>
                ACTIVE
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
