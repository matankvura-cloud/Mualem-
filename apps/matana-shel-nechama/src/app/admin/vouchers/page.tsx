import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { cancelVoucherAction } from "../actions";
import { he, errText } from "../../../../messages/he";
export const metadata: Metadata = { title: "שוברים" };
export const dynamic = "force-dynamic";
export default async function AdminVouchers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const rows = await asUser(u.id, (tx) => tx`select v.id, v.code, v.status, v.initial_agorot, v.balance_agorot, v.issued_at, v.claimed_at, v.is_test, o.order_no, o.recipient_name, w.name_he as wallet,
    (select name_he from categories c where c.id = v.scope_category_id) as scope, (select count(*) from redemptions r where r.voucher_id = v.id and r.status = 'approved')::int as redemptions
    from vouchers v join orders o on o.id = v.order_id left join wallets w on w.id = v.wallet_id order by v.created_at desc limit 300`);
  return (
    <div>
      {sp.saved && <Alert kind="ok">בוצע.</Alert>}{sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[860px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">קוד</th><th className="px-4 py-2 text-start">משפחה / ארנק</th><th className="px-4 py-2 text-start">יתרה</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">מימושים</th><th className="px-4 py-2 text-start">פעולה</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((v) => <tr key={v.id}><td className="px-4 py-2"><p className="font-mono text-xs">{v.code}</p><p className="text-xs text-muted">{v.order_no} · {dateHe(v.issued_at)}</p></td><td className="px-4 py-2">{v.recipient_name}<p className="text-xs text-muted">{v.wallet ? `ארנק: ${v.wallet}` : "טרם נתבע"} · {v.scope ?? "כל השירותים"}</p></td><td className="px-4 py-2 tabular">{money(v.balance_agorot)} <span className="text-xs text-muted">/ {money(v.initial_agorot)}</span></td><td className="px-4 py-2"><span className={`badge ${v.status === "active" ? "badge-ok" : v.status === "pending" ? "badge-warn" : "badge-muted"}`}>{he.voucherStatus[v.status]}</span></td><td className="px-4 py-2 tabular">{v.redemptions}</td><td className="px-4 py-2">{["active", "pending"].includes(v.status) && <form action={cancelVoucherAction} className="flex gap-1"><input type="hidden" name="id" value={v.id} /><input name="reason" className="field py-1 text-xs" placeholder="סיבה" required /><button className="btn btn-danger btn-sm">ביטול</button></form>}</td></tr>)}</tbody></table></div>
    </div>
  );
}
