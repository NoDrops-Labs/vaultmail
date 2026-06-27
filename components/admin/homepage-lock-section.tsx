'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface HomepageLockSectionProps {
  enabled: boolean;
  setEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  password: string;
  setPassword: (v: string) => void;
  hasPassword: boolean;
  save: () => void;
  saving: boolean;
}

export function HomepageLockSection({
  enabled,
  setEnabled,
  password,
  setPassword,
  save,
  saving
}: HomepageLockSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Private Homepage
          </h2>
          <p className="text-xs md:text-sm text-white/60">
            Lock the homepage with a password so only authorized users
            can access the site.
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
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Homepage Password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter new password"
            className="mt-3 bg-black/30 text-white placeholder:text-white/40"
          />
          <p className="mt-2 text-xs text-white/50">
            Leave empty to keep the current password.
          </p>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save Homepage Lock'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
