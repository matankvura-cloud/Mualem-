import type { Metadata } from "next";
import Link from "next/link";
import { asUser } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "פורטל ספק" };
export const dynamic = "force-dynamic";

export default async function ProviderHome() {
  const user = await requireProvider();
  const pid = user.providerId;
  const [p] = await asUser(user.id, (tx) => tx`select status from providers where id = ${pid}::uuid`);
  const [stats] = await asUser(user.id, (tx) => tx`
    select count(*) filter (where created_at::date = current_date and status = 'approved')::int as today_n,
           coalesce(sum(amount_agorot) filter (where created_at::date = current_date and status = 'approved'), 0)::int as today_sum,
           coalesce(sum(amount_agorot) filter (where date_trunc('month', created_at) = date_trunc('month', now()) and status = 'approved'), 0)::int as month_sum,
           coalesce(sum(commission_agorot) filter (where date_trunc('month', created_at) = date_trunc('month', now()) and status = 'approved'), 0)::int as month_comm
    from redemptions where provider_id = ${pid}::uuid`);
  const [pending] = await asUser(user.id, (tx) => tx`
    select (select count(*) from provider_services where provider_id = ${pid}::uuid and status = 'pending_review')::int as services,
           (select count(*) from benefits where provider_id = ${pid}::uuid and status = 'pending_review')::int as benefits`);
  const recent = await asUser(user.id, (tx) => tx`select id, amount_agorot, commission_agorot, status, note, created_at from redemptions where provider_id = ${pid}::uuid order by created_at desc limit 8`);
  return (
    <div className="space-y-6">
      {p?.status !== "approved" && <Alert kind="warn">הספק עדיין לא אושר. אפשר להכין פרופיל, שירותים והטבות; מימוש שוברים ייפתח לאחר האישור.</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-sm text-muted">מימושים היום</p><p className="font-display text-3xl tabular">{money(stats.today_sum)}</p><p className="text-xs text-muted">{stats.today_n} עסקאות</p></div>
        <div className="card p-4"><p className="text-sm text-muted">מימושים החודש</p><p className="font-display text-3xl tabular">{money(stats.month_sum)}</p><p className="text-xs text-muted">עמלה רשומה: {money(stats.month_comm)} (לא נגבית עד הסדרת הסכם)</p></div>
        <div className="card p-4"><p className="text-sm text-muted">ממתינים לאישור מנהל</p><p className="font-display text-3xl tabular">{pending.services + pending.benefits}</p><p className="text-xs text-muted">{pending.services} שירותים · {pending.benefits} הטבות</p></div>
      </div>
      <Link href="/provider/redeem" className="btn btn-primary w-full sm:w-auto">מימוש שובר או הטבה ←</Link>
      <section>
        <h2 className="text-xl">מימושים אחרונים</h2>
        {recent.length === 0 ? <p className="mt-2 text-muted">עדיין אין מימושים.</p> : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white text-sm">
            {recent.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium tabular">{money(r.amount_agorot)}{r.status === "reversed" && <span className="badge badge-warn ms-2">בוטל</span>}</p><p className="text-xs text-muted">{dateHe(r.created_at, true)}{r.note ? ` · ${r.note}` : ""}</p></div><span className="tabular text-xs text-muted">עמלה {money(r.commission_agorot)}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
