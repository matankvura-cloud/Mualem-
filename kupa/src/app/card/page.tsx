// עמוד ציבורי: מה זה כרטיס המשפחה. השיווק של הכרטיס, לא התפעול.
import type { Metadata } from 'next';
import Link from 'next/link';
import { activeSuppliers, liveBenefits } from '@/lib/funds';
import { FAMILY_BRAND } from '@/lib/site';
import { fmtBenefit } from '@/lib/card';
import FamilyCard from '@/components/FamilyCard';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כרטיס המשפחה', description: `כרטיס המשפחה של ${FAMILY_BRAND}: הטבות אצל ספקים משתתפים לתקופת האבל, חינם לכל משפחה שפותחת קופה.` };

export default async function CardLanding() {
  const [sups, bens] = await Promise.all([activeSuppliers(), liveBenefits()]);
  return (
    <div className="fd">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><Link href="/suppliers" className="btn-ghost" style={{ minHeight: 36, fontSize: 13 }}>מדריך הספקים</Link></div>
      <section className="land-hero" style={{ paddingBottom: 90 }}>
        <p className="fd-eyebrow">{FAMILY_BRAND}</p>
        <h1>כרטיס המשפחה</h1>
        <p>כרטיס אחד לתקופה הכי קשה. הטבות אצל ספקים משתתפים, קופה דיגיטלית שהקרובים מפקידים אליה, ותשלום לספקים ישירות ממנה. חינם לכל משפחה.</p>
        <Link className="btn" href="/new" style={{ background: '#fff', color: 'var(--navy)' }}>לקבל את הכרטיס</Link>
        <span className="sub">נפתח בדקה · בלי הרשמה · בלי עלות</span>
      </section>
      <div className="pad" style={{ marginTop: -70 }}><FamilyCard familyName="משפחת כהן" last4="4821" /></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <section className="panel">
          <h2>מה הכרטיס נותן</h2>
          <ul className="checks">
            <li className="done"><i /><b>הטבות אצל ספקים.</b> {sups.length ? `${sups.length} ספקים משתתפים` : 'ספקים מצטרפים עכשיו'}: קייטרינג לשבעה, מצבות, ציוד, הסעות, פרחים, עזרה בבית.</li>
            <li className="done"><i /><b>קופה שהקרובים מפקידים אליה</b> במקום לשלוח זר. קבלה לכל מפקיד.</li>
            <li className="done"><i /><b>תשלום לספקים מהקופה</b>, בלי להוציא מהכיס. אתם מבקשים, אנחנו מאשרים ומשלמים.</li>
            <li className="done"><i /><b>אזור משפחתי:</b> מה עושים עכשיו, זכויות, מסמכים, ועוזר שעונה בכל שעה.</li>
          </ul>
        </section>
        {bens.length ? (
          <section className="panel">
            <h2>הטבות שכבר על הכרטיס</h2>
            <ul className="pay-list">{bens.slice(0, 8).map((b) => <li key={b.id}><div className="t"><b>{b.supplier_name}</b><small>{b.title}</small></div><span className="a">{fmtBenefit(b)}</span></li>)}</ul>
            <Link className="more" href="/suppliers">לכל הספקים ›</Link>
          </section>
        ) : null}
        <section className="panel">
          <h2>איך מקבלים</h2>
          <ol className="how">
            <li><b>פותחים קופה</b> לזכר יקירכם, בדקה, בלי חשבון.</li>
            <li><b>הכרטיס מחכה באזור המשפחה</b>, עם שם המשפחה ותוקף לשנה.</li>
            <li><b>בוחרים ספק</b> במדריך, מבקשים הצעה, ומקבלים את ההטבה.</li>
          </ol>
          <Link className="btn" href="/new">לפתוח קופה ולקבל כרטיס</Link>
        </section>
        <div className="fd-note"><b>ספקים:</b> רוצים להופיע במדריך ולקבל פניות ממשפחות? <Link href="/suppliers/join">להצטרף חינם</Link>.</div>
      </div>
      <Footer />
    </div>
  );
}
