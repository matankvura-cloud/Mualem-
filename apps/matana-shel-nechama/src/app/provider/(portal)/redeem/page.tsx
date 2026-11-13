import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { asUser, dbErrorCode } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { money } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { lookupAction, redeemAction, lookupCardAction, redeemBenefitAction } from "./actions";
import { errText, he } from "../../../../../messages/he";

export const metadata: Metadata = { title: "מימוש" };
export const dynamic = "force-dynamic";

export default async function RedeemPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireProvider("/provider/redeem");
  let voucher: Record<string, unknown> | null = null; let lookupError: string | null = null;
  if (sp.code) {
    try { voucher = (await asUser(user.id, (tx) => tx`select lookup_voucher(${sp.code ?? ""}) as r`))[0].r; if (!voucher) lookupError = "voucher_not_found"; }
    catch (e) { lookupError = dbErrorCode(e) ?? "generic"; }
  }
  let card: { card_id: string; status: string; wallet_name: string; benefits: { id: string; title_he: string; terms_he: string; used: number; max_per_card: number | null }[] } | null = null; let cardError: string | null = null;
  if (sp.card) {
    try { card = (await asUser(user.id, (tx) => tx`select lookup_card(${sp.card ?? ""}) as r`))[0].r; if (!card) cardError = "card_not_active"; }
    catch (e) { cardError = dbErrorCode(e) ?? "generic"; }
  }
  const idem = randomUUID();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-xl">מימוש שובר</h2>
        <p className="mt-1 text-sm text-muted">המשפחה מציגה קוד בן 12 תווים (או QR). מזינים את הקוד, בודקים יתרה, מזינים סכום ומאשרים.</p>
        {sp.done && (
          <div className="mt-4" data-testid="redeem-done"><Alert kind="ok">{sp.already === "1" ? "המימוש כבר נרשם קודם (לא בוצע חיוב כפול)." : "המימוש נרשם."} סכום: <b className="tabular">{money(sp.amount)}</b>. יתרה שנותרה בשובר: <b className="tabular">{money(sp.balance)}</b>.</Alert><Link href="/provider/redeem" className="btn btn-outline btn-sm mt-3">מימוש נוסף</Link></div>
        )}
        {!sp.done && (
          <form action={lookupAction} className="mt-4 flex gap-2">
            <input name="code" className="field font-mono uppercase tracking-wider" dir="ltr" placeholder="XXXX-XXXX-XXXX" defaultValue={sp.code ?? ""} autoComplete="off" required aria-label="קוד שובר" />
            <SubmitButton className="btn btn-navy flex-none" pendingText="בודק…">בדיקה</SubmitButton>
          </form>
        )}
        {lookupError && <div className="mt-3"><Alert kind="danger">{errText(lookupError)}</Alert></div>}
        {voucher && !sp.done && (
          <div className="mt-4 rounded-xl border border-line bg-cream-2 p-4" data-testid="voucher-lookup">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs text-muted">משפחה {String(voucher.recipient_masked)} · {String(voucher.scope_category ?? "לכל השירותים")}</p><p className="font-display text-3xl tabular">{money(voucher.balance_agorot as number)}</p><p className="text-xs text-muted">יתרה מתוך {money(voucher.initial_agorot as number)}</p></div>
              <span className={`badge ${voucher.eligible ? "badge-ok" : "badge-danger"}`}>{voucher.eligible ? "ניתן למימוש אצלכם" : he.voucherStatus[String(voucher.status)]}</span>
            </div>
            {Boolean(voucher.is_test) && <p className="mt-2 text-xs text-warn">שובר בדיקה.</p>}
            {voucher.eligible ? (
              <form action={redeemAction} className="mt-4 space-y-3">
                <input type="hidden" name="code" value={String(voucher.code)} /><input type="hidden" name="idem" value={idem} />
                <div><label htmlFor="amount" className="field-label">סכום למימוש (₪)</label><input id="amount" name="amount" inputMode="decimal" className="field tabular text-xl" dir="ltr" required autoFocus placeholder={String(Number(voucher.balance_agorot) / 100)} /><p className="field-hint">עד {money(voucher.balance_agorot as number)}. עמלה רשומה: {String(voucher.commission_pct)}% (לא נגבית עד הסדרת הסכם).</p></div>
                <div><label htmlFor="note" className="field-label">הערה <span className="font-normal text-muted">(לא חובה)</span></label><input id="note" name="note" className="field" placeholder="למשל: מגשי אירוח לשבעה" /></div>
                {sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
                <SubmitButton className="btn btn-primary w-full" pendingText="רושם מימוש…">אישור מימוש</SubmitButton>
              </form>
            ) : (
              <p className="mt-3 text-sm text-danger">{String(voucher.status) !== "active" ? "השובר אינו פעיל." : "השובר מוגבל לתחום שאינו שלכם, או שהספק טרם אושר."}</p>
            )}
          </div>
        )}
        {!voucher && sp.error && !sp.code && <div className="mt-3"><Alert kind="danger">{errText(sp.error)}</Alert></div>}
      </section>

      <section className="card p-5">
        <h2 className="text-xl">מימוש הטבה מכרטיס</h2>
        <p className="mt-1 text-sm text-muted">כרטיס ההטבות המשפחתי (קוד MC-XXXXXX). ההטבה ניתנת על ידכם במעמד השירות; כאן רק מתעדים.</p>
        <form action={lookupCardAction} className="mt-4 flex gap-2">
          <input name="card" className="field font-mono uppercase" dir="ltr" placeholder="MC-XXXXXX" defaultValue={sp.card ?? ""} autoComplete="off" required aria-label="קוד כרטיס" />
          <SubmitButton className="btn btn-navy flex-none" pendingText="בודק…">בדיקה</SubmitButton>
        </form>
        {cardError && <div className="mt-3"><Alert kind="danger">{errText(cardError)}</Alert></div>}
        {sp.benefit_done && <div className="mt-3"><Alert kind="ok">ההטבה תועדה.</Alert></div>}
        {card && (
          <div className="mt-4 space-y-3">
            <p className="text-sm">כרטיס של <b>{card.wallet_name}</b> · <span className={`badge ${card.status === "active" ? "badge-ok" : "badge-danger"}`}>{card.status === "active" ? "פעיל" : "חסום"}</span></p>
            {card.benefits.length === 0 && <p className="text-sm text-muted">אין לכם הטבות מאושרות כרגע. <Link href="/provider/benefits" className="underline">הוסיפו הטבה</Link>.</p>}
            {card.benefits.map((b) => (
              <form key={b.id} action={redeemBenefitAction} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <input type="hidden" name="card" value={sp.card ?? ""} /><input type="hidden" name="benefit" value={b.id} /><input type="hidden" name="idem" value={randomUUID()} />
                <div><p className="font-medium">{b.title_he}</p><p className="text-xs text-muted">{b.terms_he} · נוצל {b.used}{b.max_per_card ? ` מתוך ${b.max_per_card}` : ""}</p></div>
                <SubmitButton className="btn btn-outline btn-sm flex-none">תיעוד מימוש</SubmitButton>
              </form>
            ))}
            {sp.error && sp.card && <Alert kind="danger">{errText(sp.error)}</Alert>}
          </div>
        )}
      </section>
    </div>
  );
}
