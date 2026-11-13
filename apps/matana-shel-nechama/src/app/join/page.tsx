import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asAnon, dbErrorCode } from "@/lib/db";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "הצטרפות ספקים" };

async function applyAction(formData: FormData) {
  "use server";
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const payload = { display_name: get("display_name"), legal_name: get("legal_name"), business_id: get("business_id"), contact_name: get("contact_name"), contact_email: get("contact_email"), phone: get("phone"), city: get("city"), service_area: get("service_area"), description_he: get("description_he"), message: get("message"), category_ids: formData.getAll("category_ids").map(String) };
  if (formData.get("agree") !== "on") redirect("/join?error=agree");
  try { await asAnon((tx) => tx`select apply_as_provider(${tx.json(payload)})`); }
  catch (e) { redirect(`/join?error=${dbErrorCode(e) ?? "generic"}`); }
  redirect("/join?sent=1");
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const categories = await asAnon((tx) => tx`select id, name_he from categories where is_active order by sort_order`);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl">הצטרפות למערך הספקים</h1>
      <p className="mt-2 text-muted">משפחות שמחזיקות שובר מחפשות ספק אמין וזמין. ההצטרפות חינם. העמלה (ברירת מחדל 10%) נגבית רק על מימוש שובר בפועל, ולא לפני חתימת הסכם ספק. ההטבות והמחירים שתפרסמו יוצגו רק לאחר אישור.</p>
      {sp.sent ? <div className="mt-6"><Alert kind="ok">הבקשה התקבלה. נחזור אליכם לאחר בדיקה. לאחר האישור תקבלו גישה לפורטל הספק עם האימייל שציינתם.</Alert></div> : (
        <form action={applyAction} className="card mt-6 space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="display_name">שם העסק להצגה</label><input id="display_name" name="display_name" className="field" required /></div>
            <div><label className="field-label" htmlFor="legal_name">שם משפטי</label><input id="legal_name" name="legal_name" className="field" /></div>
            <div><label className="field-label" htmlFor="business_id">ח.פ / ע.מ</label><input id="business_id" name="business_id" className="field" dir="ltr" inputMode="numeric" /></div>
            <div><label className="field-label" htmlFor="contact_name">איש/אשת קשר</label><input id="contact_name" name="contact_name" className="field" /></div>
            <div><label className="field-label" htmlFor="contact_email">אימייל (ישמש לכניסה לפורטל)</label><input id="contact_email" name="contact_email" type="email" className="field" dir="ltr" required /></div>
            <div><label className="field-label" htmlFor="phone">טלפון</label><input id="phone" name="phone" className="field" dir="ltr" inputMode="tel" required /></div>
            <div><label className="field-label" htmlFor="city">עיר</label><input id="city" name="city" className="field" /></div>
            <div><label className="field-label" htmlFor="service_area">אזור שירות</label><input id="service_area" name="service_area" className="field" placeholder="למשל: ירושלים והסביבה" /></div>
          </div>
          <fieldset><legend className="field-label">תחומי שירות</legend><div className="grid grid-cols-2 gap-2">{categories.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="category_ids" value={c.id} className="h-4 w-4 accent-navy" />{c.name_he}</label>)}</div></fieldset>
          <div><label className="field-label" htmlFor="description_he">על העסק (יוצג למשפחות)</label><textarea id="description_he" name="description_he" rows={3} className="field" /></div>
          <div><label className="field-label" htmlFor="message">הערות לצוות</label><textarea id="message" name="message" rows={2} className="field" /></div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="agree" className="mt-1 h-4 w-4 accent-navy" required /><span>אני מאשר/ת שהפרטים נכונים ומסכים/ה שניצור קשר. הצטרפות בפועל כפופה להסכם ספק.</span></label>
          {sp.error && <Alert kind="danger">{sp.error === "missing_fields" ? "יש למלא שם עסק, אימייל וטלפון." : "משהו השתבש. נסו שוב."}</Alert>}
          <SubmitButton className="btn btn-navy">שליחת בקשה</SubmitButton>
        </form>
      )}
    </div>
  );
}
