import type { Metadata } from "next";
import { asAnon } from "@/lib/db";
import { PRESETS, STEPS, readDraft } from "@/lib/gift/draft";
import { saveStep1 } from "./actions";
import { Stepper } from "@/components/ui/Stepper";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AmountPicker } from "@/components/gift/AmountPicker";

export const metadata: Metadata = { title: "שליחת מתנה" };


export default async function GiftStep1({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const d = await readDraft();
  const kind = sp.kind === "group" ? "group" : d.kind;
  const categories = await asAnon((tx) => tx`select id, slug, name_he from categories where is_active order by sort_order`);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Stepper steps={STEPS} current={1} />
      <h1 className="mt-6 text-3xl">שליחת מתנה למשפחה</h1>
      <p className="mt-1 text-muted">המשפחה מקבלת שובר דיגיטלי ובוחרת בעצמה מה הכי עוזר לה.</p>
      <form action={saveStep1} className="card mt-6 space-y-7 p-5 sm:p-6">
        <fieldset>
          <legend className="field-label">סוג המתנה</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={`choice ${kind === "personal" ? "choice-on" : ""}`}><input type="radio" name="kind" value="personal" defaultChecked={kind === "personal"} className="sr-only" />מתנה אישית</label>
            <label className={`choice ${kind === "group" ? "choice-on" : ""}`}><input type="radio" name="kind" value="group" defaultChecked={kind === "group"} className="sr-only" />מתנה קבוצתית</label>
          </div>
          <p className="field-hint">במתנה קבוצתית אוספים את הסכום יחד ורוכשים שובר אחד. איסוף מקוון מכמה משלמים יתווסף בהמשך.</p>
        </fieldset>
        <AmountPicker presets={PRESETS} initial={d.amount} initialCustom={d.amount && !PRESETS.includes(d.amount) ? String(d.amount / 100) : ""} />
        {sp.error === "amount" && <Alert kind="danger">בחרו סכום תקין: 50 עד 5,000 ₪, בשקלים שלמים.</Alert>}
        <fieldset>
          <legend className="field-label">למה אפשר להשתמש בשובר</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`choice justify-start ${!d.scope ? "choice-on" : ""}`}><input type="radio" name="scope" value="all" defaultChecked={!d.scope} className="sr-only" />לכל השירותים</label>
            {categories.map((c) => (
              <label key={c.id} className={`choice justify-start ${d.scope === c.id ? "choice-on" : ""}`}><input type="radio" name="scope" value={c.id} defaultChecked={d.scope === c.id} className="sr-only" />{c.name_he}</label>
            ))}
          </div>
          <p className="field-hint">מומלץ להשאיר פתוח. המשפחה יודעת הכי טוב מה חסר.</p>
        </fieldset>
        <SubmitButton className="btn btn-navy w-full sm:w-auto">המשך ←</SubmitButton>
      </form>
    </div>
  );
}
