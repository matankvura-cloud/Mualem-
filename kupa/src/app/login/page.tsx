import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { FAMILY_BRAND, PRODUCT, CONTACT_PHONE } from '@/lib/site';
import LoginForms from './LoginForms';

export const metadata: Metadata = { title: 'כניסה', robots: { index: false } };
type Props = { searchParams: Promise<{ as?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { as } = await searchParams;
  const wa = CONTACT_PHONE ? `https://wa.me/972${CONTACT_PHONE.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום, אין לי את קוד הכניסה ל${PRODUCT}. אפשר לעזור?`)}` : '';
  return (
    <div className="fd">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><Link className="fd-back" href="/">&rsaquo; {PRODUCT}</Link></div>
      <div className="pad stack" style={{ gap: 14 }}>
        <div><h1 className="page-title">כניסה</h1><p className="lead">טלפון וקוד כניסה בן 6 ספרות. בלי סיסמאות ובלי הודעות SMS.</p></div>
        <LoginForms initial={as} />
        <section className="panel">
          <h2 style={{ fontSize: 16 }}>אין לכם קוד?</h2>
          <ul className="checks" style={{ marginTop: 6 }}>
            <li><i /> משפחה: הקוד מופיע במסך הראשון אחרי הפתיחה, ובמרכז המשפחה תחת "עזרה מהקרובים". גם הקישור האישי שקיבלתם מכניס ישירות.</li>
            <li><i /> ספק: קוד הספק מופיע בפורטל הספקים ובקישור הכניסה שקיבלתם מצוות {PRODUCT}.</li>
            <li><i /> מעסיק: הקוד מופיע בעמוד המעקב שקיבלתם ברישום.</li>
          </ul>
          <div className="fd-actions" style={{ marginTop: 10 }}>
            {wa ? <a className="btn-outline" href={wa} target="_blank" rel="noopener" style={{ width: 'auto' }}>לבקש את הקוד מהליווי</a> : null}
            <Link className="btn-outline" href="/new" style={{ width: 'auto' }}>עדיין אין לנו מרכז משפחה</Link>
            <Link className="btn-outline" href="/suppliers/join" style={{ width: 'auto' }}>להצטרף כספק</Link>
            <Link className="btn-outline" href="/e" style={{ width: 'auto' }}>לרשום משפחה כמעסיק</Link>
          </div>
        </section>
      </div>
      <p className="fd-small" style={{ textAlign: 'center', padding: '0 16px 10px' }}><Link href="/admin">ניהול המערכת</Link></p>
      <Footer />
    </div>
  );
}
