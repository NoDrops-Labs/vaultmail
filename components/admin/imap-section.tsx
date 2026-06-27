'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface ImapSectionProps {
  enabled: boolean;
  setEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  host: string;
  setHost: (v: string) => void;
  port: number;
  setPort: (v: number) => void;
  user: string;
  setUser: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  tls: boolean;
  setTls: (v: boolean) => void;
  rejectUnauthorized: boolean;
  setRejectUnauthorized: (v: boolean) => void;
  maxFetch: number;
  setMaxFetch: (v: number) => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}

export function ImapSection({
  enabled,
  setEnabled,
  host,
  setHost,
  port,
  setPort,
  user,
  setUser,
  password,
  setPassword,
  tls,
  setTls,
  rejectUnauthorized,
  setRejectUnauthorized,
  maxFetch,
  setMaxFetch,
  onSave,
  onTest,
  saving,
  testing
}: ImapSectionProps) {
  return (
    <>
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">IMAP Fetch</h2>
            <p className="text-xs md:text-sm text-white/60">
              Alternative to webhook: fetch email from IMAP (e.g. Gmail).
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
              IMAP Host
            </label>
            <Input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="imap.gmail.com"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Port
            </label>
            <Input
              value={String(port)}
              onChange={(event) => setPort(Number(event.target.value || 993))}
              placeholder="993"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              User / Email
            </label>
            <Input
              value={user}
              onChange={(event) => setUser(event.target.value)}
              placeholder="gmail@domain.com"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Password / App Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="App Password"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Max Fetch per Poll
            </label>
            <Input
              value={String(maxFetch)}
              onChange={(event) => setMaxFetch(Number(event.target.value || 30))}
              placeholder="30"
              className="mt-3 bg-black/30 text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs md:text-sm text-white/80">
              <input
                type="checkbox"
                className="h-4 w-4 accent-purple-400"
                checked={tls}
                onChange={() => setTls(!tls)}
              />
              <span>Use TLS</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs md:text-sm text-white/80">
              <input
                type="checkbox"
                className="h-4 w-4 accent-purple-400"
                checked={rejectUnauthorized}
                onChange={() => setRejectUnauthorized(!rejectUnauthorized)}
              />
              <span>Reject Unauthorized (certificate verification)</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onTest}
            disabled={testing || saving}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test IMAP'}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save IMAP'}
          </Button>
        </div>
      </div>
    </>
  );
}
