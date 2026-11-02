import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND, SLOGAN, TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: `${BRAND} · ${SLOGAN}`, template: `%s · ${BRAND}` },
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
        {process.env.KUPA_LOCAL_DB && !process.env.DATABASE_URL && !process.env.POSTGRES_URL ? <div style={{ background: '#C98A2C', color: '#fff', textAlign: 'center', fontSize: 12.5, fontWeight: 700, padding: '6px 12px' }}>סביבת ניסיון: הנתונים נשמרים בזיכרון בלבד ונמחקים מדי פעם. לא להזין פרטים אמיתיים.</div> : null}
        {children}
      </body>
    </html>
  );
}
