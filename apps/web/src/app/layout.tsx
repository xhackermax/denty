import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Denty Web Preview 1.7.2 Pagina Autonoma',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8fdff',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script src="/denty-app.bundle.js" strategy="afterInteractive" />
        <Script src="/scripts/cinematic-motion.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
