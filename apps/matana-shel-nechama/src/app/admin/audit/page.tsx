import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { dateHe } from "@/lib/format";
export const metadata: Metadata = { title: "יומן ביקורת" };
export const dynamic = "force-dynamic";
export default async function AdminAudit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const q = sp.q?.trim() || null;
  const rows = await asUser(u.id, (tx) => tx`select id, actor_user_id, actor_role, action, entity_type, entity_id, before, after, created_at from audit_log where (${q}::text is null or action ilike '%' || ${q} || '%' or entity_id::text = ${q}) order by id desc limit 300`);
  return (
    <div>
      <form className="flex gap-2"><input name="q" className="field max-w-sm" placeholder="חיפוש לפי פעולה או מזהה" defaultValue={q ?? ""} /><button className="btn btn-outline">חיפוש</button></form>
      <p className="mt-2 text-xs text-muted">היומן הוא append-only: אי אפשר לערוך או למחוק רשומות, גם לא למנהל.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[900px] text-xs"><thead className="text-muted"><tr><th className="px-3 py-2 text-start">#</th><th className="px-3 py-2 text-start">זמן</th><th className="px-3 py-2 text-start">פעולה</th><th className="px-3 py-2 text-start">ישות</th><th className="px-3 py-2 text-start">מבצע</th><th className="px-3 py-2 text-start">לפני</th><th className="px-3 py-2 text-start">אחרי</th></tr></thead>
        <tbody className="divide-y divide-line font-mono">{rows.map((r) => <tr key={r.id}><td className="px-3 py-1.5">{r.id}</td><td className="px-3 py-1.5 whitespace-nowrap font-body">{dateHe(r.created_at, true)}</td><td className="px-3 py-1.5">{r.action}</td><td className="px-3 py-1.5" dir="ltr">{r.entity_type} {r.entity_id ? String(r.entity_id).slice(0, 8) : ""}</td><td className="px-3 py-1.5" dir="ltr">{r.actor_role} {r.actor_user_id ? String(r.actor_user_id).slice(0, 8) : ""}</td><td className="px-3 py-1.5 max-w-[240px] truncate" dir="ltr" title={JSON.stringify(r.before)}>{r.before ? JSON.stringify(r.before) : ""}</td><td className="px-3 py-1.5 max-w-[240px] truncate" dir="ltr" title={JSON.stringify(r.after)}>{r.after ? JSON.stringify(r.after) : ""}</td></tr>)}</tbody></table></div>
    </div>
  );
}
