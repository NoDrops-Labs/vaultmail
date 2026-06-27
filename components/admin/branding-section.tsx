'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { DEFAULT_APP_NAME } from '@/lib/branding';

interface BrandingSectionProps {
  appName: string;
  setAppName: (v: string) => void;
  saveBranding: () => void;
  brandingSaving: boolean;
}

export function BrandingSection({
  appName,
  setAppName,
  saveBranding,
  brandingSaving
}: BrandingSectionProps) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Site Name
          </h2>
          <p className="text-xs md:text-sm text-white/60">
            This name appears in the header and footer.
          </p>
        </div>
        <Button onClick={saveBranding} disabled={brandingSaving}>
          {brandingSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Save Name'
          )}
        </Button>
      </div>
      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
          Site Name
        </label>
        <Input
          value={appName}
          onChange={(event) => setAppName(event.target.value)}
          placeholder={DEFAULT_APP_NAME}
          className="mt-3 bg-black/30 text-white placeholder:text-white/40"
        />
      </div>
    </div>
  );
}
