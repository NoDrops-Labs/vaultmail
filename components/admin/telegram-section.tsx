'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface TelegramSectionProps {
  enabled: boolean;
  setEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  botToken: string;
  setBotToken: (v: string) => void;
  chatId: string;
  setChatId: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function TelegramSection({
  enabled,
  setEnabled,
  botToken,
  setBotToken,
  chatId,
  setChatId,
  onSave,
  saving
}: TelegramSectionProps) {
  return (
    <>
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">
              Notification Status
            </h2>
            <p className="text-xs md:text-sm text-white/60">
              Enable Telegram notifications for domain requests.
            </p>
          </div>
          <Button
            variant={enabled ? 'default' : 'secondary'}
            onClick={() => setEnabled((prev) => !prev)}
          >
            {enabled ? (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Enabled
              </>
            ) : (
              <>
                <ShieldOff className="mr-2 h-4 w-4" />
                Disabled
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Bot Token
            </label>
            <Input
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="123456:ABCDEF..."
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Chat ID / Channel ID
            </label>
            <Input
              value={chatId}
              onChange={(event) => setChatId(event.target.value)}
              placeholder="-100xxxxxxxxxx"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-white/50">
          Make sure the bot has been added as an admin to the channel.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Telegram Settings'}
          </Button>
        </div>
      </div>
    </>
  );
}
