import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asAnon } from "@/lib/db";
import { readDraft } from "@/lib/gift/draft";
import { createOrderAction, resetDraftAction } from "../actions";
import { STEPS } from "@/lib/gift/draft";
import { Stepper } from "@/components/ui/Stepper";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { money, dateHe } from "@/lib/format";
import { errText } from "../../../../messages/he";

export const metadata: Metadata = { title: "סיכום ותשלום" };

export default async function GiftReview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const d = await readDraft();
  if (!d.amount || !d.buyerName || !d.recipientName) redirect("/gift");
  const scope = d.scope ? (await asAnon((tx) => tx`select name_he from categories where id = ${d.scope}`))[0]?.name_he : null;
  const rows: [string, string][] = [
    ["סוג", d.kind === "group" ? "מתנה קבוצתית" : "מתנה אישית"],
    ["למי", d.recipientName + (d.recipientPhone ? ` · ${d.recipientPhone}` : "")],
    ["ממי", d.buyerName],
    ["תחום", scope ?? "לכל השירותים"],
    ["משלוח", d.channel === "link" ? "קישור להעתקה" : "וואטסאפ (הודעה מוכנה)"],
  ];
  if (d.deliverAt) rows.push(["מועד מסירה", dateHe(d.deliverAt)]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Stepper steps={STEPS} current={3} />
      <h1 className="mt-6 text-3xl">סיכום ההזמנה</h1>
      <div className="card mt-6 overflow-hidden">
        <dl className="divide-y divide-line text-[15px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">{k}</dt><dd className="text-start font-medium">{v}</dd></div>)}
          {d.dedication && <div className="px-5 py-3"><dt className="text-muted">הקדשה</dt><dd className="mt-1 whitespace-pre-wrap rounded-lg bg-cream-2 p-3 font-display text-[17px]">{d.dedication}</dd></div>}
        </dl>
        <div className="bg-cream-2 px-5 py-4">
          <div className="flex justify-between text-[15px]"><span>שווי המתנה</span><span className="tabular">{money(d.amount)}</span></div>
          <div className="flex justify-between text-[15px] text-muted"><span>דמי שירות לנותן המתנה</span><span className="tabular">{money(0)}</span></div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-medium"><span>סה״כ לתשלום</span><span className="tabular" data-testid="total">{money(d.amount)}</span></div>
          <p className="mt-2 text-xs text-muted">המתנה מגיעה במלואה למשפחה. העמלה (ברירת מחדל 10%) משולמת על ידי הספק במימוש. תוקף השובר ותנאי הביטול יפורסמו בתנאי השימוש לפני ההפעלה המסחרית.</p>
        </div>
      </div>
      <Alert kind="warn"><span className="font-medium">סביבת בדיקה.</span> בשלב זה אין חיוב אמיתי. המסך הבא מדמה סולק, והשובר שייווצר הוא שובר בדיקה ללא ערך כספי.</Alert>
      <form action={createOrderAction} className="mt-4 space-y-4">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-navy" required /><span>קראתי ואני מסכים/ה ל<Link href="/terms" className="underline" target="_blank">תנאי השימוש</Link> ול<Link href="/privacy" className="underline" target="_blank">מדיניות הפרטיות</Link>.</span></label>
        {sp.error && <Alert kind="danger">{sp.error === "terms" ? "יש לאשר את תנאי השימוש." : errText(sp.error)}</Alert>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link href="/gift/recipient" className="btn btn-outline">→ חזרה לעריכה</Link>
          <SubmitButton className="btn btn-primary" pendingText="מעבירים לתשלום…">לתשלום מאובטח (הדמיה) ←</SubmitButton>
        </div>
      </form>
      <form action={resetDraftAction} className="mt-6 text-center"><button className="btn btn-quiet text-sm text-muted">התחלה מחדש</button></form>
    </div>
  );
}
