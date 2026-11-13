import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readDraft } from "@/lib/gift/draft";
import { saveStep2 } from "../actions";
import { STEPS } from "@/lib/gift/draft";
import { Stepper } from "@/components/ui/Stepper";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Dedication } from "@/components/gift/Dedication";

export const metadata: Metadata = { title: "למי שולחים" };

export default async function GiftStep2({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const d = await readDraft();
  if (!d.amount) redirect("/gift");
  const errs = new Set((sp.error ?? "").split(",").filter(Boolean));
  const err = (k: string, msg: string) => errs.has(k) ? <p className="field-error">{msg}</p> : null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Stepper steps={STEPS} current={2} />
      <h1 className="mt-6 text-3xl">למי שולחים</h1>
      <form action={saveStep2} className="card mt-6 space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="recipientName" className="field-label">שם המשפחה המקבלת</label><input id="recipientName" name="recipientName" className="field" required defaultValue={d.recipientName} placeholder="משפחת כהן" />{err("recipientName", "יש למלא שם.")}</div>
          <div><label htmlFor="recipientPhone" className="field-label">נייד של בן משפחה <span className="font-normal text-muted">(לא חובה)</span></label><input id="recipientPhone" name="recipientPhone" className="field" inputMode="tel" dir="ltr" defaultValue={d.recipientPhone} placeholder="050-0000000" />{err("recipientPhone", "מספר לא תקין.")}<p className="field-hint">נשמר לזיהוי בלבד. השליחה בשלב זה נעשית על ידכם.</p></div>
        </div>
        <Dedication initial={d.dedication} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="buyerName" className="field-label">השם שלכם</label><input id="buyerName" name="buyerName" className="field" required defaultValue={d.buyerName} placeholder="כפי שיופיע בהקדשה" />{err("buyerName", "יש למלא שם.")}</div>
          <div><label htmlFor="buyerPhone" className="field-label">הנייד שלכם <span className="font-normal text-muted">(לא חובה)</span></label><input id="buyerPhone" name="buyerPhone" className="field" inputMode="tel" dir="ltr" defaultValue={d.buyerPhone} />{err("buyerPhone", "מספר לא תקין.")}</div>
          <div className="sm:col-span-2"><label htmlFor="buyerEmail" className="field-label">אימייל לאישור הזמנה <span className="font-normal text-muted">(לא חובה)</span></label><input id="buyerEmail" name="buyerEmail" type="email" className="field" dir="ltr" defaultValue={d.buyerEmail} />{err("buyerEmail", "אימייל לא תקין.")}</div>
        </div>
        <fieldset>
          <legend className="field-label">איך המתנה תגיע למשפחה</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`choice justify-start text-start ${d.channel !== "link" ? "choice-on" : ""}`}><input type="radio" name="channel" value="whatsapp" defaultChecked={d.channel !== "link"} className="sr-only" /><span><span className="block">אשלח בוואטסאפ</span><span className="block text-xs font-normal text-muted">נכין לכם הודעה מוכנה עם הקישור</span></span></label>
            <label className={`choice justify-start text-start ${d.channel === "link" ? "choice-on" : ""}`}><input type="radio" name="channel" value="link" defaultChecked={d.channel === "link"} className="sr-only" /><span><span className="block">אעתיק קישור</span><span className="block text-xs font-normal text-muted">לשליחה בכל דרך שתבחרו</span></span></label>
          </div>
          <p className="field-hint">שליחה אוטומטית ב-SMS תתאפשר לאחר חיבור ספק הודעות.</p>
        </fieldset>
        <div><label htmlFor="deliverAt" className="field-label">מועד מסירה מתוכנן <span className="font-normal text-muted">(לא חובה)</span></label><input id="deliverAt" name="deliverAt" type="date" className="field max-w-[220px]" defaultValue={d.deliverAt} dir="ltr" /><p className="field-hint">לתיעוד בלבד. הקישור זמין מיד לאחר התשלום.</p></div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <a href="/gift" className="btn btn-outline">→ חזרה</a>
          <SubmitButton className="btn btn-navy">לסיכום ←</SubmitButton>
        </div>
      </form>
    </div>
  );
}
