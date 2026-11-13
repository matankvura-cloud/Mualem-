import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "פתרונות למעסיקים" };
export default function EmployersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">פתרונות למעסיקים</h1>
      <p className="mt-2 text-muted">כשעובד או עובדת מאבדים אדם קרוב, הארגון רוצה להיות שם. מתנה של נחמה מאפשרת לשלוח תמיכה מעשית ומכובדת, בלי לנחש ובלי לחשוף פרטים משפחתיים.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[["רכישה פשוטה", "שובר אישי או קבוצתי לעובד, בסכום שתבחרו."], ["חשבונית מסודרת", "מסמך לכל רכישה, לפי נהלי הרווחה של הארגון."], ["פרטיות המשפחה", "המעסיק רואה אישור רכישה בלבד. לא מימושים ולא פרטי משפחה."]].map(([t, d]) => <div key={t} className="card p-5"><h2 className="text-lg">{t}</h2><p className="mt-1 text-sm text-muted">{d}</p></div>)}
      </div>
      <div className="card mt-6 p-5">
        <h2 className="text-xl">מה זמין היום</h2>
        <p className="mt-1 text-[15px]">כבר עכשיו אפשר לרכוש שובר לעובד דרך אשף הרכישה הרגיל ולציין בהקדשה שהמתנה מהארגון. פורטל מעסיקים ייעודי (תקציב רווחה, משתמשים מורשים, דוחות וחשבוניות מרוכזות) ייבנה לאחר הפיילוט, על בסיס הביקוש.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/gift" className="btn btn-navy">שליחת מתנה לעובד</Link><Link href="/contact?kind=employer" className="btn btn-outline">שיחה על פתרון ארגוני</Link></div>
      </div>
    </div>
  );
}
