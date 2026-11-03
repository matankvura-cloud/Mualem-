import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { FAMILY_BRAND, PRODUCT, CONTACT_PHONE } from '@/lib/site';
import { IcHome, IcShop, IcBriefcase } from '@/components/icons';

export const metadata: Metadata = { title: 'כניסה', robots: { index: false } };

export default function LoginPage() {
  const wa = CONTACT_PHONE ? `https://wa.me/972${CONTACT_PHONE.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום, איבדתי את הקישור למרכז המשפחה ב${PRODUCT}. אפשר לשלוח שוב?`)}` : '';
  return (
    <div className="fd">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><Link className="fd-back" href="/">&rsaquo; {PRODUCT}</Link></div>
      <div className="pad stack" style={{ gap: 14 }}>
        <div><h1 className="page-title">כניסה</h1><p className="lead">ב{PRODUCT} אין סיסמאות. כל משפחה, ספק ומעסיק נכנסים בקישור האישי שקיבלו.</p></div>
        <section className="panel">
          <h2><IcHome />משפחות</h2>
          <p className="muted" style={{ marginBottom: 10 }}>הקישור האישי נשלח אליכם כשפתחתם את מרכז המשפחה (ובוואטסאפ, אם שלחתם לעצמכם). פותחים אותו, וזהו.</p>
          <div className="stack" style={{ gap: 8 }}>
            {wa ? <a className="btn-copper" href={wa} target="_blank" rel="noopener">איבדתי את הקישור, שהליווי ישלח שוב</a> : null}
            <Link className="btn-outline" href="/new">עדיין אין לנו מרכז משפחה, לפתוח</Link>
          </div>
        </section>
        <section className="fam-grid2">
          <div className="panel"><h2><IcShop />ספקים</h2><p className="muted" style={{ marginBottom: 10 }}>קישור כניסה חד-פעמי מגיע מצוות {PRODUCT}. ספק חדש מצטרף כאן.</p><Link className="btn-outline" href="/suppliers/join">להצטרף כספק</Link></div>
          <div className="panel"><h2><IcBriefcase />מעסיקים</h2><p className="muted" style={{ marginBottom: 10 }}>המעסיק נכנס בקישור שקיבל ברישום המשפחה הראשונה.</p><Link className="btn-outline" href="/e">לפורטל המעסיקים</Link></div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
