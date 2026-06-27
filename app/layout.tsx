import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import { Toaster } from 'sonner';
import AdsenseScript from '@/components/AdsenseScript';
import { getStoredAppName } from '@/lib/branding-settings';
import { getAccentColor } from '@/lib/accent-color';

export async function generateMetadata(): Promise<Metadata> {
  const appName = await getStoredAppName();
  return {
    title: `${appName} - Secure Disposable Email`,
    description: 'Self Hosted Temporary email service with custom domains.',
    icons: {
      icon: '/api/favicon',
    }
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawAccent = await getAccentColor();
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
        <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: 'rgba(15, 15, 15, 0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' } }} />
      </body>
    </html>
  );
}
