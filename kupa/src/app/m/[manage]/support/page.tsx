import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { CONTACT_PHONE, BRAND } from '@/lib/site';
import FamilyShell from '@/components/FamilyShell';
import { IcHeadset, IcUser, IcPhone } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ליווי אישי', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function SupportPage({ params }: Props) {
  const { manage } = await params;
  const { fund } = await loadFamily(manage);
  const wa = CONTACT_PHONE ? `https://wa.me/972${CONTACT_PHONE.replace(/\D/g, '').replace(/^0/, '')}` : '';
  return (
    <FamilyShell manage={manage} active="support">
      <header className="fam-head"><div><h1>הליווי האישי שלכם</h1><p>לא צריך להבין הכול לבד. שאלה על הלוויה, על השבעה, על הקופה או על ספק: מתקשרים, ואנחנו מסדרים.</p></div></header>
      <section className="fam-grid2">
        <div className="panel">
          <h2><IcHeadset />איך מגיעים אלינו</h2>
          <div className="escort"><div className="face"><IcUser /></div>
            <p>יועץ הליווי של {BRAND} מלווה את משפחת {fund.manager_name || 'המשפחה'} לאורך כל הדרך: מה דחוף עכשיו, מה יכול לחכות, ומי הספק הנכון.</p></div>
          {CONTACT_PHONE ? (
            <div className="stack" style={{ marginTop: 14 }}>
              <a className="btn-copper" href={wa} target="_blank" rel="noopener"><IcPhone />הודעה בוואטסאפ</a>
              <a className="btn-outline" href={`tel:${CONTACT_PHONE}`}>להתקשר · <span dir="ltr">{CONTACT_PHONE}</span></a>
            </div>
          ) : <p className="notice notice-warn" style={{ marginTop: 12 }}>הטלפון של הליווי עדיין לא הוגדר (NEXT_PUBLIC_CONTACT_PHONE).</p>}
        </div>
        <div className="panel">
          <h2>מה אפשר לבקש</h2>
          <ul className="checks">
            <li><i /> לתאם עם ספק ולשלם לו מהקופה</li>
            <li><i /> לעדכן את עמוד הקופה אם קשה לכם</li>
            <li><i /> לשלוח את הקישור לקרובים בשמכם</li>
            <li><i /> לסגור את הקופה ולקבל סיכום של כל מה שנכנס ויצא</li>
          </ul>
        </div>
      </section>
    </FamilyShell>
  );
}
