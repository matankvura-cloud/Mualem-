import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { dateHe } from "@/lib/format";
import { issueStatusAction } from "../actions";
export const metadata: Metadata = { title: "פניות" };
export const dynamic = "force-dynamic";
export default async function AdminIssues() {
  const u = await requireAdmin();
  const rows = await asUser(u.id, (tx) => tx`select * from issues order by (status = 'open') desc, created_at desc limit 200`);
  const kind: Record<string, string> = { bug: "תקלה", redemption: "מימוש", refund: "החזר", provider: "ספק", contact: "פנייה", other: "אחר" };
  const st: Record<string, string> = { open: "פתוח", in_progress: "בטיפול", closed: "סגור" };
  return (
    <ul className="space-y-2">
      {rows.map((i) => <li key={i.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-sm"><div><p><span className="badge badge-muted">{kind[i.kind]}</span> <span className={`badge ${i.status === "open" ? "badge-warn" : i.status === "closed" ? "badge-muted" : "badge-gold"}`}>{st[i.status]}</span> <span className="text-xs text-muted">{dateHe(i.created_at, true)}</span></p><p className="mt-1 whitespace-pre-wrap">{i.text}</p>{i.contact && <p className="text-xs text-muted" dir="ltr">{i.contact}</p>}</div><div className="flex gap-1">{Object.keys(st).filter((s) => s !== i.status).map((s) => <form key={s} action={issueStatusAction}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="status" value={s} /><button className="btn btn-outline btn-sm">{st[s]}</button></form>)}</div></li>)}
      {rows.length === 0 && <li className="text-muted">אין פניות.</li>}
    </ul>
  );
}
