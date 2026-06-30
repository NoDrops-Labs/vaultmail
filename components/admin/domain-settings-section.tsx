'use client';

import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DomainSettingsSectionProps {
  autoApprove: boolean;
  setAutoApprove: (v: boolean) => void;
  onSave: () => void;
  saving: boolean;
}

export function DomainSettingsSection({
  autoApprove,
  setAutoApprove,
  onSave,
  saving,
}: DomainSettingsSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: 'var(--accent, #fbbf24)' }} />
            Domain Request Settings
          </h2>
          <p className="text-xs md:text-sm text-white/60">
            Control how domain add requests are processed.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30"
          />
          <span className="text-xs text-white/70">Auto-approve adds</span>
        </label>
      </div>

      {autoApprove && (
        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <p className="text-[11px] text-yellow-300/80">
            When enabled, new domain add requests will automatically create a Cloudflare zone and return nameservers to the user without admin review. Requires CLOUDFLARE_ADMIN_API_TOKEN to be configured.
          </p>
        </div>
      )}

      <Button onClick={onSave} disabled={saving} size="sm" className="mt-3">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
      </Button>
    </div>
  );
}
