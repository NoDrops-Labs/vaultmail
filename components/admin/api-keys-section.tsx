'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/api-fetch';

export type ApiKeyView = {
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
};

interface ApiKeysSectionProps {
  keys: ApiKeyView[];
  onGenerate: (label: string) => Promise<void>;
  onRevoke: (hash: string) => Promise<void>;
}

const formatDate = (iso: string | undefined): string => {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};

export function ApiKeysSection({
  keys,
  onGenerate,
  onRevoke
}: ApiKeysSectionProps) {
  const [label, setLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [revokingHash, setRevokingHash] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error('Label is required.');
      return;
    }
    setGenerating(true);
    try {
      const response = await apiFetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed })
      });
      if (!response.ok) {
        throw new Error('Failed to generate API key.');
      }
      const data = (await response.json()) as { apiKey?: string };
      setGeneratedKey(data.apiKey || null);
      setCopied(false);
      setLabel('');
      await onGenerate(trimmed);
      toast.success('API key generated. Copy it now — shown only once.');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate API key.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (hash: string) => {
    setRevokingHash(hash);
    try {
      const response = await apiFetch(
        `/api/admin/api-keys/${encodeURIComponent(hash)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error('Failed to revoke API key.');
      }
      await onRevoke(hash);
      toast.success('API key revoked.');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to revoke API key.'
      );
    } finally {
      setRevokingHash(null);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast.success('API key copied to clipboard.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to copy API key.');
    }
  };

  const closeDialog = () => {
    setGeneratedKey(null);
    setCopied(false);
  };

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">API Keys</h2>
          <p className="text-xs md:text-sm text-white/60">
            Generate keys to gate public endpoints. Share with trusted users.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
          Label (for your reference)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Alice personal key"
            className="bg-black/30 text-white placeholder:text-white/40"
            maxLength={50}
          />
          <Button
            onClick={handleGenerate}
            disabled={generating || !label.trim()}
            className="sm:w-auto"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">
          Existing Keys ({keys.length})
        </h3>
        {keys.length === 0 ? (
          <p className="mt-3 text-xs md:text-sm text-white/50">
            No API keys configured. Public endpoints run in open mode.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {keys.map((key) => (
              <li
                key={key.hash}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-white">
                      {key.label}
                    </span>
                    <code className="w-fit max-w-full truncate rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                      {key.hash}…
                    </code>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[11px] text-white/50 sm:block">
                    <span>Created: {formatDate(key.createdAt)}</span>
                    <span className="hidden sm:inline">{' · '}</span>
                    <span>Last used: {formatDate(key.lastUsedAt)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleRevoke(key.hash)}
                  disabled={revokingHash === key.hash}
                  className="w-full bg-red-500/20 text-red-200 hover:bg-red-500/40 sm:w-auto"
                >
                  {revokingHash === key.hash ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {generatedKey && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base md:text-lg font-semibold">API Key Generated</h3>
            <p className="mt-2 text-xs md:text-sm text-white/70">
              Copy this key now. For security, it will not be shown again.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
              <code className="flex-1 break-all font-mono text-sm text-green-300">
                {generatedKey}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={closeDialog}>
                Done
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
