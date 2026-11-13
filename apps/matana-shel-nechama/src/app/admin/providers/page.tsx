import type { Metadata } from "next";
import Link from "next/link";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { dateHe } from "@/lib/format";
import { he } from "../../../../messages/he";
export const metadata: Metadata = { title: "ספקים" };
export const dynamic = "force-dynamic";
export default async function AdminProviders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const status = sp.status && sp.status in he.providerStatus ? sp.status : null;
  const rows = await asUser(u.id, (tx) => tx`select p.id, p.display_name, p.city, p.status, p.is_demo, p.contact_email, p.created_at, p.commission_pct,
    (select string_agg(c.name_he, ', ' order by c.sort_order) from provider_categories pc join categories c on c.id = pc.category_id where pc.provider_id = p.id) as cats,
    (select count(*) from provider_members pm where pm.provider_id = p.id)::int as members
    from providers p where (${status}::text is null or p.status::text = ${status}) order by (p.status in ('applied','in_review')) desc, p.created_at desc`);
  return (
    <div>
      <div className="flex flex-wrap gap-2 text-sm"><Link href="/admin/providers" className={`badge px-3 py-1.5 ${!status ? "badge-navy" : "bg-white border border-line"}`}>הכול</Link>{Object.entries(he.providerStatus).map(([k, v]) => <Link key={k} href={`/admin/providers?status=${k}`} className={`badge px-3 py-1.5 ${status === k ? "badge-navy" : "bg-white border border-line"}`}>{v}</Link>)}</div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[720px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">ספק</th><th className="px-4 py-2 text-start">תחומים</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">עמלה</th><th className="px-4 py-2 text-start">משתמשים</th><th className="px-4 py-2 text-start">הוגש</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((p) => <tr key={p.id}><td className="px-4 py-2"><Link href={`/admin/providers/${p.id}`} className="font-medium underline-offset-4 hover:underline">{p.display_name}</Link>{p.is_demo && <span className="badge badge-warn ms-2">לדוגמה</span>}<p className="text-xs text-muted" dir="ltr">{p.contact_email}</p></td><td className="px-4 py-2 text-muted">{p.cats ?? "—"}</td><td className="px-4 py-2"><span className={`badge ${p.status === "approved" ? "badge-ok" : p.status === "rejected" || p.status === "suspended" ? "badge-danger" : "badge-warn"}`}>{he.providerStatus[p.status]}</span></td><td className="px-4 py-2 tabular">{p.commission_pct ?? "ברירת מחדל"}</td><td className="px-4 py-2 tabular">{p.members}</td><td className="px-4 py-2 text-muted">{dateHe(p.created_at)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
