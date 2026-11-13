import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { phoneAuthEnabled } from "@/lib/auth/otp";
import { startLoginAction, verifyCodeAction } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { errText } from "../../../messages/he";

export const metadata: Metadata = { title: "כניסה" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "";
  if (user && !sp.denied) redirect(next || (user.isAdmin ? "/admin" : user.providerId ? "/provider" : "/wallet"));
  const phone = phoneAuthEnabled();
  const isTest = process.env.APP_ENV !== "production";
  const errorMsg = sp.error === "identifier_invalid" ? (phone ? "הזינו מספר נייד או כתובת אימייל תקינים." : "הזינו כתובת אימייל תקינה.")
    : sp.error === "phone_disabled" ? "כניסה בטלפון עדיין לא פעילה. הזינו כתובת אימייל." : sp.error ? errText(sp.error) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl">כניסה</h1>
      {sp.denied === "admin" && <div className="mt-4"><Alert kind="warn">החשבון המחובר אינו מנהל מערכת. התחברו עם חשבון מתאים.</Alert></div>}
      {sp.step === "verify" ? (
        <>
          <p className="mt-2 text-muted">שלחנו קוד בן 6 ספרות אל <bdi className="font-medium text-ink">{sp.to}</bdi>{sp.ch === "email" ? ". אפשר גם ללחוץ על הקישור שבהודעה." : "."}</p>
          <form action={verifyCodeAction} className="card mt-6 space-y-4 p-5">
            <input type="hidden" name="next" value={next} /><input type="hidden" name="to" value={sp.to ?? ""} /><input type="hidden" name="ch" value={sp.ch ?? ""} />
            <div>
              <label htmlFor="code" className="field-label">קוד אימות</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus className="field text-center text-2xl tracking-[0.4em] tabular" dir="ltr" />
            </div>
            {errorMsg && <Alert kind="danger">{errorMsg}</Alert>}
            <SubmitButton className="btn btn-navy w-full">אישור</SubmitButton>
            <p className="text-center text-sm"><Link href={`/login?${new URLSearchParams({ next })}`} className="btn btn-quiet">לא קיבלתם? שליחה מחדש</Link></p>
          </form>
          {isTest && <p className="mt-4 text-center text-xs text-muted">סביבת בדיקה: הקוד מופיע ב<Link href="/dev/outbox" className="underline">תיבת ההודעות לפיתוח</Link>.</p>}
        </>
      ) : (
        <>
          <p className="mt-2 text-muted">{phone ? "הזינו מספר נייד או אימייל. נשלח קוד חד-פעמי, בלי סיסמאות." : "הזינו כתובת אימייל. נשלח קוד חד-פעמי, בלי סיסמאות."}</p>
          <form action={startLoginAction} className="card mt-6 space-y-4 p-5">
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="identifier" className="field-label">{phone ? "נייד או אימייל" : "אימייל"}</label>
              <input id="identifier" name="identifier" type="text" inputMode={phone ? "text" : "email"} autoComplete={phone ? "tel" : "email"} required autoFocus className="field" dir="ltr" placeholder={phone ? "050-0000000" : "name@example.com"} />
            </div>
            {errorMsg && <Alert kind="danger">{errorMsg}</Alert>}
            <SubmitButton className="btn btn-navy w-full">שליחת קוד</SubmitButton>
          </form>
          {isTest && (
            <div className="mt-6 rounded-xl border border-dashed border-line bg-cream-2 p-4 text-sm text-muted">
              <p className="font-medium text-ink">חשבונות לסביבת הבדיקה</p>
              <ul className="mt-1 space-y-0.5" dir="ltr">
                <li>admin@matana.test — ניהול</li>
                <li>provider@matana.test — ספק הדגמה (קייטרינג)</li>
                <li>provider2@matana.test — ספק הדגמה (אוהלים)</li>
              </ul>
              <p className="mt-1">הקודים מופיעים ב-<Link href="/dev/outbox" className="underline">/dev/outbox</Link>. משפחה: כל מספר או אימייל אחר.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
