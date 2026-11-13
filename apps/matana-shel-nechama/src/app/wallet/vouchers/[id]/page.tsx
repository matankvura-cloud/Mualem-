import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { asUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";
import { Alert } from "@/components/ui/Alert";
import { he } from "../../../../../messages/he";

export const metadata: Metadata = { title: "שובר" };
export const dynamic = "force-dynamic";

export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/wallet/vouchers/${id}`);
  const rows = await asUser(user.id, (tx) => tx`
    select v.*, o.buyer_name, o.dedication_he, o.order_no, (select name_he from categories c where c.id = v.scope_category_id) as scope_category
    from vouchers v join orders o on o.id = v.order_id where v.id = ${id}::uuid`);
  if (!rows.length) notFound();
  const v = rows[0];
  const ledger = await asUser(user.id, (tx) => tx`
    select l.entry, l.amount_agorot, l.balance_after_agorot, l.created_at, p.display_name
    from voucher_ledger l left join redemptions r on r.id = l.redemption_id left join providers p on p.id = r.provider_id
    where l.voucher_id = ${id}::uuid order by l.id desc`);
  const qr = await QRCode.toString(v.code, { type: "svg", margin: 1, color: { dark: "#0F1C33", light: "#FFFFFF" } });
  const entryLabel: Record<string, string> = { issue: "הנפקה", redeem: "מימוש", reverse: "ביטול מימוש", expire: "פקיעה", adjust: "התאמה" };
  return (
    <div>
      <div className="card overflow-hidden">
        <div className="bg-navy-deep p-5 text-cream">
          <div className="flex items-start justify-between"><p className="text-sm text-cream/80">מאת {v.buyer_name}</p><span className={`badge ${v.status === "active" ? "badge-ok" : "badge-gold"}`}>{he.voucherStatus[v.status]}</span></div>
          <p className="font-display text-4xl tabular">{money(v.balance_agorot)}</p>
          <p className="text-sm text-cream/70">יתרה מתוך {money(v.initial_agorot)} · {v.scope_category ?? "לכל השירותים"}</p>
        </div>
        <div className="p-5">
          {v.dedication_he && <p className="whitespace-pre-wrap rounded-lg bg-cream-2 p-3 font-display text-[17px]">{v.dedication_he}</p>}
          {v.status === "active" && (
            <div className="mt-5 grid items-center gap-4 sm:grid-cols-[150px_1fr]">
              <div className="mx-auto w-[150px] rounded-xl border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} aria-label="קוד QR של השובר" />
              <div>
                <p className="text-sm text-muted">קוד השובר להצגה לספק</p>
                <p className="font-mono text-2xl tracking-wider tabular" dir="ltr" data-testid="voucher-code">{v.code}</p>
                <div className="mt-2 flex flex-wrap gap-2"><CopyButton text={v.code} label="העתקת הקוד" /></div>
                <p className="mt-3 text-xs text-muted">הספק מזין את הקוד ואת הסכום במערכת שלו. אתם מאשרים בעל-פה. היתרה מתעדכנת מיד וכאן.</p>
              </div>
            </div>
          )}
          {v.is_test && <div className="mt-4"><Alert kind="warn">שובר בדיקה ללא ערך כספי.</Alert></div>}
        </div>
      </div>
      <h2 className="mt-8 text-xl">היסטוריה</h2>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {ledger.map((l, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div><p className="font-medium">{entryLabel[l.entry]}{l.display_name ? ` · ${l.display_name}` : ""}</p><p className="text-xs text-muted">{dateHe(l.created_at, true)}</p></div>
            <div className="text-start"><p className={`tabular font-medium ${l.amount_agorot < 0 ? "" : "text-ok"}`}>{l.amount_agorot < 0 ? "−" : "+"}{money(Math.abs(l.amount_agorot))}</p><p className="tabular text-xs text-muted">יתרה {money(l.balance_after_agorot)}</p></div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">הזמנה {v.order_no} · הונפק {dateHe(v.issued_at, true)}</p>
    </div>
  );
}
