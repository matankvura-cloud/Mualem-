import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND, TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: `${BRAND} · ${TAGLINE}`, template: `%s · ${BRAND}` },
  description: `${TAGLINE}. מי שרוצה לעזור מפקיד לקופה של המשפחה במקום לשלוח פרחים.`,
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#16304D' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
