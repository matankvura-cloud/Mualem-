import type { Metadata } from "next";
import Link from "next/link";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";

export const metadata: Metadata = { title: "ניהול" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const u = await requireAdmin();
  const [s] = await asUser(u.id, (tx) => tx`select
    (select count(*) from providers where status in ('applied','in_review'))::int as providers_pending,
    (select count(*) from providers where status = 'approved')::int as providers_approved,
    (select count(*) from provider_services where status = 'pending_review')::int as services_pending,
    (select count(*) from benefits where status = 'pending_review')::int as benefits_pending,
    (select count(*) from orders where status = 'paid' and created_at::date = current_date)::int as orders_today,
    (select coalesce(sum(amount_agorot),0) from orders where status = 'paid' and created_at::date = current_date)::int as orders_today_sum,
    (select count(*) from vouchers where status = 'active')::int as vouchers_active,
    (select coalesce(sum(balance_agorot),0) from vouchers where status = 'active')::int as vouchers_balance,
    (select count(*) from vouchers where status = 'pending')::int as vouchers_pending,
    (select count(*) from redemptions where status = 'approved' and created_at::date = current_date)::int as redemptions_today,
    (select count(*) from issues where status = 'open')::int as issues_open,
    (select count(*) from wallets)::int as wallets`);
  const recent = await asUser(u.id, (tx) => tx`select id, action, entity_type, created_at from audit_log order by id desc limit 10`);
  const tiles: [string, string, string, string][] = [
    ["ספקים ממתינים לאישור", String(s.providers_pending), `${s.providers_approved} מאושרים`, "/admin/providers?status=applied"],
    ["הצעות ממתינות", String(s.services_pending + s.benefits_pending), `${s.services_pending} שירותים · ${s.benefits_pending} הטבות`, "/admin/catalog"],
    ["הזמנות היום", String(s.orders_today), money(s.orders_today_sum), "/admin/orders"],
    ["יתרה פתוחה בשוברים", money(s.vouchers_balance), `${s.vouchers_active} פעילים · ${s.vouchers_pending} ממתינים לקבלה`, "/admin/vouchers"],
    ["מימושים היום", String(s.redemptions_today), `${s.wallets} ארנקים משפחתיים`, "/admin/redemptions"],
    ["פניות פתוחות", String(s.issues_open), "תקלות, החזרים, ספקים", "/admin/issues"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tiles.map(([t, v, d, h]) => <Link key={t} href={h} className="card p-4 hover:-translate-y-0.5 transition-transform"><p className="text-sm text-muted">{t}</p><p className="font-display text-3xl tabular">{v}</p><p className="text-xs text-muted">{d}</p></Link>)}</div>
      <section><h2 className="text-xl">פעולות אחרונות</h2><ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white text-sm">{recent.map((r) => <li key={r.id} className="flex justify-between px-4 py-2"><span><code className="text-xs">{r.action}</code> · {r.entity_type}</span><span className="text-muted">{dateHe(r.created_at, true)}</span></li>)}</ul></section>
    </div>
  );
}
