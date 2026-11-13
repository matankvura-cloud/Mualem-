import Link from "next/link";
import { asAnon } from "@/lib/db";
import { CategoryArt } from "@/components/site/CategoryArt";
import { Candle } from "@/components/site/Candle";
import { he } from "../../messages/he";

export const revalidate = 300;

export default async function HomePage() {
  const categories = await asAnon((tx) => tx`select slug, name_he, blurb_he, icon from categories where is_active order by sort_order`);
  const faqs = [
    ["איך המשפחה מקבלת את השובר?", "אחרי התשלום מתקבל קישור אישי. שולחים אותו למשפחה בוואטסאפ או בהודעה, והיא שומרת את השובר בארנק משפחתי פשוט בנייד, בלי סיסמאות."],
    ["איפה אפשר לממש?", "אצל כל הספקים המאושרים ברשימה, או בתחום שבחרתם בעת הרכישה. אפשר לממש בכמה פעמים ואצל כמה ספקים, והיתרה מתעדכנת."],
    ["מה קורה אם לא ניצלו הכול?", "היתרה נשארת בארנק המשפחתי להמשך. תוקף השוברים ותנאי הביטול יפורסמו בתנאי השימוש לפני ההפעלה המסחרית."],
    ["האם יש עמלה לנותן המתנה?", "לא. נותן המתנה משלם את סכום השובר בלבד. הפלטפורמה מתפרנסת מעמלה שמשלם הספק במימוש."],
    ["אפשר לשלוח בלי להירשם?", "כן. נותן המתנה לא צריך חשבון. רק המשפחה המקבלת מזדהה בקוד חד-פעמי כדי לשמור את השובר."],
  ];
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-deep text-cream" style={{ backgroundImage: "radial-gradient(360px 260px at 18% 30%, rgba(201,167,91,.38), transparent 70%), radial-gradient(520px 320px at 85% 100%, rgba(201,167,91,.16), transparent 70%), linear-gradient(170deg,#1B2E52 0%,#0F1C33 100%)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <h1 className="text-[40px] leading-[1.15] md:text-[56px]">דרך לתת,<br />גם כשאין מילים.</h1>
            <p className="mt-4 max-w-md text-[17px] text-cream/80">שובר דיגיטלי שהמשפחה מממשת אצל ספקים מאושרים: ארוחות לשבעה, ציוד, עזרה בבית והנצחה. בלי לנחש מה צריך.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/gift" className="btn btn-primary">שליחת מתנה למשפחה</Link>
              <Link href="/catalog" className="btn btn-ghost-light">צפייה בהטבות</Link>
            </div>
          </div>
          <div className="relative hidden h-64 md:block"><Candle className="absolute bottom-0 left-1/2 h-64 w-44 -translate-x-1/2" /></div>
        </div>
        <Candle className="absolute bottom-3 left-4 h-24 w-16 md:hidden" />
      </section>

      {/* איך זה עובד */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl">איך זה עובד</h2>
          <p className="mt-1 text-muted">שלושה צעדים, בלי הרשמה לנותן המתנה.</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[["א", "בוחרים סכום והקדשה", "150, 300, 500, 1,000 ₪ או סכום אחר. אפשר לכוון לתחום מסוים או להשאיר פתוח."], ["ב", "המשפחה מקבלת קישור אישי", "שולחים בוואטסאפ או בהודעה. המשפחה שומרת את השובר בארנק בנייד בקוד חד-פעמי."], ["ג", "מממשים אצל ספקים מאושרים", "בכמה פעמים ואצל כמה ספקים. היתרה מתעדכנת, וכל מימוש מתועד."]].map(([l, t, d]) => (
              <li key={l} className="rounded-2xl border border-line bg-cream-2 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-soft font-display text-lg text-gold-ink">{l}</span>
                <h3 className="mt-3 text-lg">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* קטגוריות */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-2xl md:text-3xl">שירותים והטבות</h2><p className="mt-1 text-muted">כל ספק נבדק ואושר. המחירים וההטבות מוצגים כפי שהספק התחייב.</p></div>
          <Link href="/catalog" className="btn btn-quiet hidden sm:inline-flex">לכל הספקים ←</Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.slug}><Link href={`/catalog?category=${c.slug}`} className="card block overflow-hidden transition-transform hover:-translate-y-0.5">
              <div className="h-24"><CategoryArt icon={c.icon} /></div>
              <div className="p-3"><p className="text-[14px] font-medium leading-snug">{c.name_he}</p></div>
            </Link></li>
          ))}
        </ul>
      </section>

      {/* שקיפות */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="card flex items-start gap-3 p-5">
          <svg viewBox="0 0 26 26" aria-hidden="true" className="mt-0.5 h-7 w-7 flex-none"><path d="M13 2l9 4v6c0 6-4 10-9 12C8 22 4 18 4 12V6l9-4z" fill="none" stroke="#2E7D5B" strokeWidth="1.8" /><path d="M8.5 13l3 3 6-7" fill="none" stroke="#2E7D5B" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <div className="text-[15px]"><span className="font-medium">שקיפות מלאה.</span> המתנה מגיעה במלואה למשפחה. אין דמי טיפול לנותן המתנה. העמלה (ברירת מחדל 10%) משולמת על ידי הספק במימוש, ותנאי המימוש מוצגים לפני התשלום. <Link href="/terms" className="underline underline-offset-4">לתנאים המלאים</Link></div>
        </div>
      </section>

      {/* קבוצתי + מעסיקים + ספקים */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        <div className="rounded-2xl bg-navy p-6 text-cream md:col-span-3 md:flex md:items-center md:justify-between md:gap-6">
          <div><h2 className="text-2xl">מתנה קבוצתית</h2><p className="mt-1 text-cream/80">חברים לעבודה, שכנים או קהילה מתאחדים לשובר אחד משמעותי למשפחה. בינתיים אפשר לאסוף יחד ולרכוש שובר אחד בסכום מותאם.</p></div>
          <Link href="/gift?kind=group" className="btn btn-primary mt-4 md:mt-0 flex-none">רכישת מתנה קבוצתית</Link>
        </div>
        <div className="card p-6 md:col-span-2"><h2 className="text-xl">למעסיקים</h2><p className="mt-1 text-muted">מתנת תמיכה לעובד או לעובדת בתקופת אבל, עם חשבונית מסודרת ובלי חשיפה של מידע משפחתי. פורטל ייעודי יושק לאחר הפיילוט.</p><Link href="/employers" className="btn btn-outline btn-sm mt-4">לפרטים</Link></div>
        <div className="card p-6"><h2 className="text-xl">לספקים</h2><p className="mt-1 text-muted">הצטרפו למערך הספקים המאושרים וקבלו משפחות שכבר מחזיקות תקציב.</p><Link href="/join" className="btn btn-outline btn-sm mt-4">בקשת הצטרפות</Link></div>
      </section>

      {/* שאלות */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl">שאלות נפוצות</h2>
          <div className="mt-4 divide-y divide-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<span className="text-gold transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-[15px] text-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">עוד שאלות? <Link href="/contact" className="underline underline-offset-4">דברו איתנו</Link>. {he.poweredBy}.</p>
        </div>
      </section>
    </>
  );
}
