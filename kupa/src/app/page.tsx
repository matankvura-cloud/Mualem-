import Link from 'next/link';
import Footer from '@/components/Footer';
import { IcShop, IcBriefcase } from '@/components/icons';
import { FEE_PCT, FEE_MODE, BRAND, TAGLINE } from '@/lib/site';
import { DEMO } from '@/lib/demo-seed';

const demoMode = process.env.KUPA_DEMO_SEED === '1';

export default function Landing() {
  return (
    <div className="fd">
      <section className="land-hero">
        <p className="fd-eyebrow">{BRAND}</p>
        <h1>{TAGLINE}</h1>
        <p>
          קופה דיגיטלית לזכר מי שהלך. המשפחה פותחת אותה בדקה, שולחת קישור אחד,
          וכל מי שרוצה לעזור מפקיד ישירות לקופה במקום לשלוח זר.
        </p>
        <Link className="btn" href="/new">לפתוח קופה</Link>
        <span className="sub">בלי הרשמה · בלי עלות למשפחה · הקישור מוכן מיד</span>
      </section>
      <section className="land-card">
        <div><p className="fd-eyebrow">חדש</p><h2>כרטיס המשפחה</h2>
          <p>כל משפחה שפותחת קופה מקבלת כרטיס: הטבות אצל ספקים משתתפים, תשלום לספקים ישירות מהקופה, ואזור משפחתי עם כל מה שצריך לעשות. חינם.</p>
          <div className="fd-actions"><Link className="btn" href="/card" style={{ width: 'auto' }}>מה הכרטיס נותן</Link><Link className="btn-outline" href="/suppliers" style={{ width: 'auto' }}>הספקים המשתתפים</Link></div></div>
      </section>

      <section className="fd-sec">
        <h2>איך זה עובד</h2>
        <div className="steps">
          <div className="step"><span className="n">1</span><b>פותחים קופה</b><span>שם, כמה מילים, ומתי ואיפה הלוויה והשבעה. לא צריך חשבון.</span></div>
          <div className="step"><span className="n">2</span><b>שולחים קישור</b><span>בוואטסאפ, במייל, בקבוצה. כל מי שמקבל אותו יכול להפקיד ולכתוב מילה למשפחה.</span></div>
          <div className="step"><span className="n">3</span><b>הכסף בקופה</b><span>כל הפקדה נסלקת באשראי עם קבלה. המשפחה רואה מי הפקיד ומה נכתב, ומשלמת מהקופה להלוויה, לשבעה ולמצבה.</span></div>
        </div>
      </section>

      <section className="fd-sec">
        <h2>שקוף עד הסוף</h2>
        <div className="stack">
          <div className="fd-note"><b>למשפחה זה חינם.</b> אין דמי פתיחה ואין מנוי.</div>
          {FEE_MODE === 'required'
            ? <div className="fd-note"><b>כל הפקדה מגיעה במלואה לקופה.</b> על כל הפקדה נוספים {FEE_PCT}% לתפעול המערכת, והם מוצגים למפקיד לפני התשלום. זה מה שמחזיק את השירות.</div>
            : <div className="fd-note"><b>מי שמפקיד בוחר.</b> כל הפקדה מגיעה במלואה לקופה. מי שרוצה יכול להוסיף {FEE_PCT}% לתפעול המערכת. אפשר לבטל בלחיצה.</div>}
          <div className="fd-note"><b>ספר ניחומים.</b> כל מי שמפקיד יכול לכתוב מילה למשפחה, ולבחור אם להציג את הסכום.</div>
        </div>
      </section>

      {demoMode ? (
        <section className="fd-sec">
          <h2>קופה לדוגמה</h2>
          <div className="stack">
            <Link className="btn-ghost" href={`/m/${DEMO.manage}`}>צד המשפחה: הבית, הכרטיס, הספקים ›</Link>
            <Link className="btn-ghost" href={`/f/${DEMO.token}`}>העמוד שהקרובים רואים ›</Link>
            <Link className="btn-ghost" href={`/s/${DEMO.card}`}>מה שהספק רואה אחרי סריקת הכרטיס ›</Link>
            <Link className="btn-ghost" href="/admin">הניהול של מתן ›</Link>
          </div>
        </section>) : null}
      <section className="fd-sec" style={{ paddingBottom: 12 }}>
        <Link className="btn" href="/new">לפתוח קופה</Link>
      </section>
      <section className="fd-sec" style={{ paddingTop: 10 }}><h2>לספקים ולמעסיקים</h2></section>
      <div className="land-portals">
        <Link href="/suppliers/join"><b><IcShop />פורטל ספקים</b><small>שירות וקבלת זכאויות למשפחות: סריקת כרטיס המשפחה, בדיקת ההטבה, מעקב אחר מימושים, ופניות ישירות מהמשפחות.</small></Link>
        <Link href="/e"><b><IcBriefcase />פורטל מעסיקים</b><small>ליווי ותמיכה בעובדים ובמשפחותיהם: רישום משפחה של עובד/ת, מעקב אחר חבילת הליווי, סטטוס ותיאום שירותים.</small></Link>
      </div>
      <Footer brandLink={false} />
    </div>
  );
}
