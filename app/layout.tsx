import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import { Toaster } from 'sonner';
import AdsenseScript from '@/components/AdsenseScript';
import { getStoredAppName } from '@/lib/branding-settings';
import { getAccentColor } from '@/lib/accent-color';
import { getFaviconSettings } from '@/lib/favicon';
import { getDonationSettings } from '@/lib/donation-settings';
import { DonationFloatingButton } from '@/components/donation-button';

export async function generateMetadata(): Promise<Metadata> {
  const [appName, favicon] = await Promise.all([getStoredAppName(), getFaviconSettings()]);
  const faviconUrl = favicon?.hash ? `/api/favicon?v=${favicon.hash}` : '/api/favicon';
  return {
    title: `${appName} - Secure Disposable Email`,
    description: 'Self Hosted Temporary email service with custom domains.',
    manifest: '/site.webmanifest',
    icons: {
      icon: [
        { url: faviconUrl, sizes: 'any' },
        { url: faviconUrl, sizes: '192x192', type: 'image/png' },
        { url: faviconUrl, sizes: '512x512', type: 'image/png' },
      ],
      shortcut: faviconUrl,
      apple: [
        { url: faviconUrl, sizes: '180x180', type: 'image/png' },
      ],
    }
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [rawAccent, donationSettings] = await Promise.all([
    getAccentColor(),
    getDonationSettings(),
  ]);
  const accentColor = rawAccent && /^#[0-9a-fA-F]{3,8}$/.test(rawAccent) ? rawAccent : null;

  return (
    <html lang={DEFAULT_LOCALE} className="dark">
      <head>
        {accentColor && (
          <style dangerouslySetInnerHTML={{ __html: `:root { --accent: ${accentColor}; }` }} />
        )}
      </head>
      <body className="font-sans">
        <AdsenseScript />
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
        {children}
        {donationSettings?.enabled && donationSettings.evmAddress && (
          <DonationFloatingButton
            evmAddress={donationSettings.evmAddress}
            message={donationSettings.message}
          />
        )}
        <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: 'rgba(15, 15, 15, 0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' } }} />
      </body>
    </html>
  );
}
