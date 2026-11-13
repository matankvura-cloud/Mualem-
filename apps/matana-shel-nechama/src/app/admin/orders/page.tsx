import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { refundOrderAction } from "../actions";
import { he, errText } from "../../../../messages/he";
export const metadata: Metadata = { title: "הזמנות" };
export const dynamic = "force-dynamic";
export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const rows = await asUser(u.id, (tx) => tx`select o.id, o.order_no, o.status, o.kind, o.buyer_name, o.recipient_name, o.amount_agorot, o.is_test, o.created_at,
    (select name_he from categories c where c.id = o.scope_category_id) as scope, v.status as voucher_status, v.balance_agorot, v.initial_agorot,
    (select status from payments p where p.order_id = o.id order by created_at desc limit 1) as payment_status
    from orders o left join vouchers v on v.order_id = o.id order by o.created_at desc limit 200`);
  return (
    <div>
      {sp.saved && <Alert kind="ok">בוצע.</Alert>}{sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[860px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">הזמנה</th><th className="px-4 py-2 text-start">נותן ← מקבל</th><th className="px-4 py-2 text-start">סכום</th><th className="px-4 py-2 text-start">תשלום</th><th className="px-4 py-2 text-start">שובר</th><th className="px-4 py-2 text-start">פעולה</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((o) => <tr key={o.id}><td className="px-4 py-2"><p className="font-mono text-xs">{o.order_no}</p><p className="text-xs text-muted">{dateHe(o.created_at, true)}{o.is_test && " · בדיקה"}</p></td><td className="px-4 py-2">{o.buyer_name} ← {o.recipient_name}<p className="text-xs text-muted">{o.scope ?? "כל השירותים"}{o.kind === "group" ? " · קבוצתי" : ""}</p></td><td className="px-4 py-2 tabular">{money(o.amount_agorot)}</td><td className="px-4 py-2"><span className={`badge ${o.status === "paid" ? "badge-ok" : o.status === "pending_payment" ? "badge-warn" : "badge-muted"}`}>{he.orderStatus[o.status]}</span><p className="text-xs text-muted">{o.payment_status ?? ""}</p></td><td className="px-4 py-2">{o.voucher_status ? <><span className="badge badge-muted">{he.voucherStatus[o.voucher_status]}</span><p className="tabular text-xs text-muted">יתרה {money(o.balance_agorot)}</p></> : "—"}</td><td className="px-4 py-2">{o.status === "paid" && Number(o.balance_agorot) === Number(o.initial_agorot) && <form action={refundOrderAction} className="flex gap-1"><input type="hidden" name="id" value={o.id} /><input name="reason" className="field py-1 text-xs" placeholder="סיבה" required /><button className="btn btn-danger btn-sm">החזר (בדיקה)</button></form>}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-muted">החזר אפשרי רק להזמנה ששוברה לא נוצל כלל. בסביבת הבדיקה ההחזר נרשם בלבד; בפרודקשן יעבור דרך ספק הסליקה.</p>
    </div>
  );
}
