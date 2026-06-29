'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Coffee } from 'lucide-react';

interface DonationSectionProps {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  evmAddress: string;
  setEvmAddress: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function DonationSection({
  enabled,
  setEnabled,
  evmAddress,
  setEvmAddress,
  message,
  setMessage,
  onSave,
  saving,
}: DonationSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Coffee className="h-4 w-4" style={{ color: 'var(--accent, #fbbf24)' }} />
            Donation Settings
          </h2>
          <p className="text-xs md:text-sm text-white/60">
            Show a floating coffee button on all pages with your EVM donation address and QR code.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30"
          />
          <span className="text-xs text-white/70">Enabled</span>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            EVM Address
          </label>
          <Input
            value={evmAddress}
            onChange={(e) => setEvmAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 h-9 bg-black/30 font-mono text-sm"
          />
          <p className="mt-1 text-[10px] text-white/40">
            Public EVM address shown to users. Do not enter a private key or seed phrase.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Donation Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="If this project helped you, consider supporting with a donation"
            maxLength={240}
            rows={2}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <p className="mt-1 text-[10px] text-white/40">{message.length}/240 characters</p>
        </div>

        <Button onClick={onSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Donation Settings'}
        </Button>
      </div>
    </div>
  );
}
