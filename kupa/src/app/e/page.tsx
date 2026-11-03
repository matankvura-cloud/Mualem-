import type { Metadata } from 'next';
import Link from 'next/link';
import { FAMILY_BRAND, PRODUCT } from '@/lib/site';
import { PACKAGES } from '@/lib/family';
import Footer from '@/components/Footer';
import { RegisterForm } from './EmployerForms';
import { IcBriefcase, IcCheck } from '@/components/icons';

export const metadata: Metadata = { title: `פורטל מעסיקים · ${PRODUCT}`, description: 'מעסיק שרוצה לעמוד לצד משפחה של עובד/ת: רישום, ליווי אישי, ומעקב אחר חבילת הליווי.' };

export default function EmployerPortal() {
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><Link className="fd-back" href="/suppliers/join">ספקים ›</Link></div>
      <div className="pad stack" style={{ gap: 18 }}>
        <header className="fam-head" style={{ marginBottom: 0 }}>
          <div><span className="pill"><IcBriefcase /> פורטל מעסיקים</span><h1 className="page-title" style={{ marginTop: 8 }}>לעמוד לצד עובד/ת שאיבד/ה אדם קרוב</h1>
            <p className="lead">במקום זר פרחים, המעסיק רושם את המשפחה, ואנחנו מלווים אותה: רכז/ת אישי/ת, מרכז המשפחה הדיגיטלי "{PRODUCT}", וכרטיס המשפחה עם ההטבות. אתם רואים את הסטטוס, בלי להיכנס לפרטים האישיים.</p></div>
        </header>
        <section className="fam-grid2">
          <div className="panel">
            <h2>מה כולל</h2>
            <ul className="checks">
              <li className="done"><i><IcCheck /></i> רישום משפחה של עובד/ת בדקה</li>
              <li className="done"><i><IcCheck /></i> מעקב אחר חבילת הליווי: התקבל, יצרנו קשר, בליווי</li>
              <li className="done"><i><IcCheck /></i> סטטוס ותיאום שירותים בלי לחשוף את המשפחה</li>
              <li className="done"><i><IcCheck /></i> אישור דיגיטלי של המעסיק, שמופיע אצל המשפחה כ"אישור מהמעסיק"</li>
            </ul>
            <h2 style={{ marginTop: 16 }}>החבילות</h2>
            <ul className="kinds">{Object.entries(PACKAGES).map(([k, p]) => <li key={k}><i /><div><b>{p.label}</b><small>{p.what}</small></div></li>)}</ul>
            <p className="fd-small" style={{ marginTop: 10 }}>המחיר נקבע מול המעסיק לפי היקף. אין חיוב ברישום.</p>
          </div>
          <div className="panel"><RegisterForm /></div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
