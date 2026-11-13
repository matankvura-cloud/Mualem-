import type { Metadata } from "next";
import Link from "next/link";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { reviewServiceAction, reviewBenefitAction, saveCategoryAction } from "../actions";
import { he, errText } from "../../../../messages/he";
export const metadata: Metadata = { title: "קטלוג" };
export const dynamic = "force-dynamic";
export default async function AdminCatalog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const services = await asUser(u.id, (tx) => tx`select s.id, s.title_he, s.description_he, s.price_agorot, s.price_note_he, s.status, s.updated_at, p.display_name, p.id as pid, c.name_he as category from provider_services s join providers p on p.id = s.provider_id join categories c on c.id = s.category_id order by (s.status = 'pending_review') desc, s.updated_at desc limit 200`);
  const benefits = await asUser(u.id, (tx) => tx`select b.id, b.title_he, b.terms_he, b.kind, b.value, b.status, p.display_name, p.id as pid from benefits b join providers p on p.id = b.provider_id order by (b.status = 'pending_review') desc, b.updated_at desc limit 200`);
  const cats = await asUser(u.id, (tx) => tx`select * from categories order by sort_order`);
  const Review = ({ id, action, status }: { id: string; action: (fd: FormData) => Promise<void>; status: string }) => (
    <div className="flex flex-wrap gap-1">{(["approved", "paused", "archived"] as const).filter((s) => s !== status).map((s) => <form key={s} action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><button className={`btn btn-sm ${s === "approved" ? "btn-navy" : "btn-outline"}`}>{s === "approved" ? "אישור" : s === "paused" ? "השהיה" : "ארכיון"}</button></form>)}</div>
  );
  return (
    <div className="space-y-8">
      {sp.saved && <Alert kind="ok">נשמר.</Alert>}{sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
      <section><h2 className="text-xl">שירותים ומחירים</h2><p className="text-sm text-muted">ממתינים לאישור מוצגים ראשונים. מחיר מאושר מוצג למשפחות כפי שהוא.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[720px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">שירות</th><th className="px-4 py-2 text-start">ספק</th><th className="px-4 py-2 text-start">מחיר</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">פעולה</th></tr></thead>
          <tbody className="divide-y divide-line">{services.map((s) => <tr key={s.id}><td className="px-4 py-2"><p className="font-medium">{s.title_he}</p><p className="text-xs text-muted">{s.category} · {s.description_he ?? ""}</p></td><td className="px-4 py-2"><Link href={`/admin/providers/${s.pid}`} className="underline-offset-4 hover:underline">{s.display_name}</Link></td><td className="px-4 py-2 tabular">{s.price_agorot != null ? money(s.price_agorot) : "—"} {s.price_note_he ?? ""}</td><td className="px-4 py-2"><span className={`badge ${s.status === "approved" ? "badge-ok" : s.status === "pending_review" ? "badge-warn" : "badge-muted"}`}>{he.offerStatus[s.status]}</span></td><td className="px-4 py-2"><Review id={s.id} action={reviewServiceAction} status={s.status} /></td></tr>)}</tbody></table></div></section>
      <section><h2 className="text-xl">הטבות לכרטיס</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[720px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">הטבה</th><th className="px-4 py-2 text-start">ספק</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">פעולה</th></tr></thead>
          <tbody className="divide-y divide-line">{benefits.map((b) => <tr key={b.id}><td className="px-4 py-2"><p className="font-medium">{b.title_he}</p><p className="text-xs text-muted">{b.terms_he}</p></td><td className="px-4 py-2"><Link href={`/admin/providers/${b.pid}`} className="underline-offset-4 hover:underline">{b.display_name}</Link></td><td className="px-4 py-2"><span className={`badge ${b.status === "approved" ? "badge-ok" : b.status === "pending_review" ? "badge-warn" : "badge-muted"}`}>{he.offerStatus[b.status]}</span></td><td className="px-4 py-2"><Review id={b.id} action={reviewBenefitAction} status={b.status} /></td></tr>)}</tbody></table></div></section>
      <section><h2 className="text-xl">קטגוריות</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{cats.map((c) => <form key={c.id} action={saveCategoryAction} className="card space-y-2 p-4 text-sm"><input type="hidden" name="id" value={c.id} /><input name="name_he" className="field" defaultValue={c.name_he} aria-label="שם קטגוריה" /><input name="blurb_he" className="field" defaultValue={c.blurb_he ?? ""} aria-label="תיאור" /><div className="flex items-center justify-between"><label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={c.is_active} className="h-4 w-4 accent-navy" />פעילה</label><button className="btn btn-outline btn-sm">שמירה</button></div></form>)}</div></section>
    </div>
  );
}
