import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { reverseRedemptionAction } from "../actions";
import { errText } from "../../../../messages/he";
export const metadata: Metadata = { title: "מימושים" };
export const dynamic = "force-dynamic";
export default async function AdminRedemptions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const rows = await asUser(u.id, (tx) => tx`select r.id, r.amount_agorot, r.commission_pct, r.commission_agorot, r.status, r.note, r.created_at, r.reversal_reason, p.display_name, v.code, w.name_he as wallet
    from redemptions r join providers p on p.id = r.provider_id join vouchers v on v.id = r.voucher_id left join wallets w on w.id = v.wallet_id order by r.created_at desc limit 300`);
  const [tot] = await asUser(u.id, (tx) => tx`select coalesce(sum(amount_agorot),0)::int as sum, coalesce(sum(commission_agorot),0)::int as comm from redemptions where status = 'approved'`);
  return (
    <div>
      {sp.saved && <Alert kind="ok">בוצע.</Alert>}{sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
      <p className="text-sm text-muted">סה״כ מימושים מאושרים: <b className="tabular">{money(tot.sum)}</b> · עמלה רשומה (לא נגבית): <b className="tabular">{money(tot.comm)}</b></p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[860px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">תאריך</th><th className="px-4 py-2 text-start">ספק</th><th className="px-4 py-2 text-start">שובר / ארנק</th><th className="px-4 py-2 text-start">סכום</th><th className="px-4 py-2 text-start">עמלה</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">פעולה</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((r) => <tr key={r.id}><td className="px-4 py-2 text-muted">{dateHe(r.created_at, true)}</td><td className="px-4 py-2">{r.display_name}</td><td className="px-4 py-2"><span className="font-mono text-xs">{r.code}</span><p className="text-xs text-muted">{r.wallet}</p></td><td className="px-4 py-2 tabular">{money(r.amount_agorot)}</td><td className="px-4 py-2 tabular">{money(r.commission_agorot)} ({r.commission_pct}%)</td><td className="px-4 py-2">{r.status === "reversed" ? <span className="badge badge-warn" title={r.reversal_reason ?? ""}>בוטל</span> : <span className="badge badge-ok">אושר</span>}{r.note && <p className="text-xs text-muted">{r.note}</p>}</td><td className="px-4 py-2">{r.status === "approved" && <form action={reverseRedemptionAction} className="flex gap-1"><input type="hidden" name="id" value={r.id} /><input name="reason" className="field py-1 text-xs" placeholder="סיבה" required /><button className="btn btn-danger btn-sm">ביטול מימוש</button></form>}</td></tr>)}</tbody></table></div>
    </div>
  );
}
