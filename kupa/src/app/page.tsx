// דף הבית של "לצידכם": מרכז המשפחה של אבלות ישראל. לפי ההמחשה: כל התמיכה, במקום אחד.
import Link from 'next/link';
import Footer from '@/components/Footer';
import FamilyCard from '@/components/FamilyCard';
import { IcShop, IcBriefcase, IcCard, IcBook, IcSign, IcPeople, IcHeadset, IcCalendar, IcLeaf, IcCheck, IcQr, IcCoins } from '@/components/icons';
import { FEE_PCT, FEE_MODE, FAMILY_BRAND, PRODUCT, PRODUCT_TAGLINE, HOME_URL, CONTACT_PHONE } from '@/lib/site';
import { DEMO } from '@/lib/demo-seed';

const demoMode = process.env.KUPA_DEMO_SEED === '1';

const AREAS = [
  { Icon: IcCard, t: 'כרטיס המשפחה', s: 'כרטיס הטבות עם QR לספקים משתתפים, והקופה שהקרובים מפקידים אליה. לא כרטיס תשלום.' },
  { Icon: IcBook, t: 'מדריכים וזכויות', s: 'השעות הראשונות, לקראת הלוויה, ימי השבעה, זכויות וביורוקרטיה. בשפה פשוטה, עם הקישורים הרשמיים.' },
  { Icon: IcSign, t: 'מסמכים וחתימות', s: 'התיק של המשפחה: המסמכים שצריך, מי מנפיק, וטפסים שחותמים דיגיטלית במקום.' },
  { Icon: IcCalendar, t: 'משימות ותזכורות', s: 'מה עושים עכשיו, צעד אחר צעד, ותזכורות לשלושים ולשנה.' },
  { Icon: IcPeople, t: 'עזרה מהקרובים', s: 'ארוחות, סידורים, שיתוף בהוצאות. בקשה קצרה, וקרוב לוקח אותה.' },
  { Icon: IcHeadset, t: 'ליווי אישי', s: 'רכז/ת אישי/ת שמלווה את המשפחה, ועוזר שעונה בכל שעה.' },
];

export default function Landing() {
  return (
    <div className="fd fd-wide land2">
      <header className="land2-top">
        <a href={HOME_URL} className="land2-brand"><span className="brand-leaf"><IcLeaf /></span>{FAMILY_BRAND}</a>
        <nav className="land2-nav">
          <Link href="/suppliers">ספקים</Link>
          <Link href="/e">מעסיקים</Link>
          <Link href="/login" className="btn-outline">כניסה</Link>
        </nav>
      </header>

      <section className="land2-hero">
        <p className="fd-eyebrow">{PRODUCT}</p>
        <h1>{PRODUCT} — {PRODUCT_TAGLINE}</h1>
        <p className="land2-chips">כרטיס משפחה · מדריכים · זכויות · שירותים · ליווי אישי</p>
        <p className="land2-lead">אחרי פטירה המשפחה מקבלת מקום אחד: מה עושים עכשיו, המסמכים והזכויות, כרטיס שמכבדים אצל ספקים, עזרה מהקרובים, ואדם שמלווה. פותחים בדקה, בלי הרשמה ובלי עלות למשפחה.</p>
        <div className="land2-cta">
          <Link className="btn" href="/new">לפתוח את מרכז המשפחה</Link>
          <Link className="btn-outline" href="/login">יש לכם קישור? כניסה</Link>
        </div>
      </section>

      <section className="land2-preview" aria-label="כך זה נראה">
        <div className="land2-screen">
          <div className="land2-screen-side">
            <b>{FAMILY_BRAND}</b>
            {['הבית שלי', 'כרטיס המשפחה', 'מדריכים וזכויות', 'מסמכים וחתימות', 'משימות ותזכורות', 'ספקים והטבות', 'עזרה מהקרובים', 'ליווי אישי'].map((x, i) => <span key={x} className={i === 0 ? 'on' : ''}>{x}</span>)}
          </div>
          <div className="land2-screen-main">
            <h2>אנחנו כאן בשבילכם</h2>
            <div className="land2-screen-grid">
              <FamilyCard familyName="משפחת ישראלי" last4="4821" status="פעיל" />
              <div className="mini"><b>הצעד הבא שלכם</b><i /><span><IcCheck />העלאת מסמכים נחוצים</span><span><IcCheck />בדיקת זכויות</span><span>תיאום שירות (למשל ציוד לשבעה)</span></div>
              <div className="mini"><b>הרכזת האישית שלכם</b><span className="face">י</span><span>מלווה את משפחתכם</span><em>בקשת שיחה</em></div>
              <div className="mini"><b>עזרה מהקרובים</b><span>ארוחות · סידורים · שיתוף בהוצאות</span><em>שליחת בקשה לעזרה</em></div>
              <div className="mini"><b>מסמכים וחתימות</b><span><IcCheck />טופס בקשת זכויות · נחתם</span><span>אישור מהמעסיק · בתהליך חתימה</span><em>העלאת מסמך חדש</em></div>
              <div className="mini"><b>שירותים והטבות</b><span>ארוחות · ציוד לשבעה · מצבות · עזרה בבית</span><em>לכל הספקים</em></div>
            </div>
          </div>
        </div>
        <p className="fd-small" style={{ textAlign: 'center', marginTop: 10 }}>כרטיס הטבות, לא כרטיס תשלום. התשלום לספקים נעשה מהקופה של המשפחה, לפי בקשתה.</p>
      </section>

      <section className="land2-sec">
        <h2>מה המשפחה מקבלת</h2>
        <div className="land2-areas">{AREAS.map((a) => <div key={a.t} className="area"><span className="ic"><a.Icon /></span><b>{a.t}</b><span>{a.s}</span></div>)}</div>
      </section>

      <section className="land2-sec">
        <h2>איך זה עובד</h2>
        <div className="steps">
          <div className="step"><span className="n">1</span><b>פותחים את מרכז המשפחה</b><span>שם, מתי ואיפה, ואיש קשר. דקה אחת, בלי חשבון. מקבלים קישור אישי וכרטיס משפחה.</span></div>
          <div className="step"><span className="n">2</span><b>מקבלים ליווי</b><span>רכז/ת אישי/ת, רשימת צעדים לפי המצב, המסמכים והזכויות, ותזכורות.</span></div>
          <div className="step"><span className="n">3</span><b>הקרובים והספקים מצטרפים</b><span>הקרובים מפקידים לקופה ולוקחים משימות. הספקים מכבדים את הכרטיס, והתשלום יוצא מהקופה.</span></div>
        </div>
      </section>

      <section className="land2-sec land2-kupa">
        <div className="panel">
          <h2><IcCoins />הקופה של המשפחה</h2>
          <p>במקום זר פרחים, הקרובים מפקידים לקופה של המשפחה. הכסף משמש להלוויה, לשבעה, למצבה ולכל ספק שהמשפחה בוחרת. המשפחה רואה מי השתתף ומה נכתב, ומבקשת תשלום לספק בלחיצה.</p>
          <ul className="checks">
            <li className="done"><i><IcCheck /></i> למשפחה זה חינם. אין דמי פתיחה ואין מנוי.</li>
            <li className="done"><i><IcCheck /></i> {FEE_MODE === 'required' ? `על כל הפקדה נוספים ${FEE_PCT}% לתפעול, מוצגים למפקיד לפני התשלום. ההפקדה עצמה מגיעה במלואה לקופה.` : `מי שמפקיד בוחר אם להוסיף ${FEE_PCT}% לתפעול. ההפקדה מגיעה במלואה לקופה.`}</li>
            <li className="done"><i><IcCheck /></i> ספר ניחומים: כל מי שמפקיד יכול לכתוב מילה למשפחה.</li>
          </ul>
        </div>
      </section>

      <section className="land2-sec">
        <h2>לספקים ולמעסיקים</h2>
        <div className="land-portals" style={{ padding: 0 }}>
          <Link href="/suppliers/join"><b><IcShop />פורטל ספקים</b><small>שירות וקבלת זכאויות למשפחות: סריקת כרטיס המשפחה (QR), בדיקת ההטבה, מעקב אחר מימושים, ופניות ישירות מהמשפחות.</small><em>לכניסה לפורטל הספקים ›</em></Link>
          <Link href="/e"><b><IcBriefcase />פורטל מעסיקים</b><small>ליווי ותמיכה בעובדים ובמשפחותיהם: רישום משפחה של עובד/ת, מעקב אחר חבילת הליווי, סטטוס ותיאום שירותים.</small><em>לכניסה לפורטל המעסיקים ›</em></Link>
        </div>
      </section>

      {demoMode ? (
        <section className="land2-sec">
          <h2>לדוגמה</h2>
          <div className="stack">
            <Link className="btn-ghost" href={`/m/${DEMO.manage}`}>מרכז המשפחה ›</Link>
            <Link className="btn-ghost" href={`/f/${DEMO.token}`}>העמוד שהקרובים רואים ›</Link>
            <Link className="btn-ghost" href={`/s/${DEMO.card}`}>מה שהספק רואה אחרי סריקת הכרטיס ›</Link>
          </div>
        </section>) : null}

      <section className="land2-sec land2-final">
        <h2>לא צריך להבין הכול לבד</h2>
        <div className="fd-actions" style={{ justifyContent: 'center' }}>
          <Link className="btn" href="/new" style={{ width: 'auto', minWidth: 260 }}><IcQr />לפתוח את מרכז המשפחה</Link>
          {CONTACT_PHONE ? <a className="btn-outline" href={`tel:${CONTACT_PHONE}`} style={{ width: 'auto' }}>לדבר עם הליווי · <span dir="ltr">{CONTACT_PHONE}</span></a> : null}
        </div>
      </section>
      <Footer brandLink={false} />
    </div>
  );
}
