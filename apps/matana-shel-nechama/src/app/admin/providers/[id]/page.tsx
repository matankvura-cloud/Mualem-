import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asUser, asService } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { reviewProviderAction, setProviderCategoriesAction, setDemoAction, commissionRuleAction, deleteCommissionRuleAction } from "../../actions";
import { he, errText } from "../../../../../messages/he";
export const metadata: Metadata = { title: "ספק" };
export const dynamic = "force-dynamic";
export default async function AdminProvider({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const u = await requireAdmin();
  const [p] = await asUser(u.id, (tx) => tx`select * from providers where id = ${id}::uuid`);
  if (!p) notFound();
  const cats = await asUser(u.id, (tx) => tx`select c.id, c.name_he, exists (select 1 from provider_categories pc where pc.provider_id = ${id}::uuid and pc.category_id = c.id) as on from categories c order by c.sort_order`);
  // אימיילים של משתמשי הספק: מתוך auth (רק אחרי requireAdmin)
  const members = await asService((tx) => tx`select pm.role, pm.user_id, au.email, au.phone from provider_members pm join auth.users au on au.id = pm.user_id where pm.provider_id = ${id}::uuid`);
  const services = await asUser(u.id, (tx) => tx`select id, title_he, price_agorot, status from provider_services where provider_id = ${id}::uuid order by created_at`);
  const benefits = await asUser(u.id, (tx) => tx`select id, title_he, status from benefits where provider_id = ${id}::uuid order by created_at`);
  const rules = await asUser(u.id, (tx) => tx`select r.id, r.pct, r.note, c.name_he from commission_rules r left join categories c on c.id = r.category_id where r.provider_id = ${id}::uuid`);
  const [stats] = await asUser(u.id, (tx) => tx`select count(*)::int as n, coalesce(sum(amount_agorot),0)::int as sum, coalesce(sum(commission_agorot),0)::int as comm from redemptions where provider_id = ${id}::uuid and status = 'approved'`);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl">{p.display_name}</h2><p className="text-sm text-muted">{p.legal_name ?? ""} {p.business_id ? `· ח.פ ${p.business_id}` : ""} · הוגש {dateHe(p.created_at)}</p></div><span className={`badge ${p.status === "approved" ? "badge-ok" : "badge-warn"}`}>{he.providerStatus[p.status]}</span></div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">איש קשר</dt><dd>{p.contact_name ?? "—"} · <bdi>{p.contact_email}</bdi> · <bdi>{p.phone_e164}</bdi></dd></div>
            <div><dt className="text-muted">מיקום</dt><dd>{p.city ?? "—"} {p.service_area ? `· ${p.service_area}` : ""}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted">תיאור</dt><dd className="whitespace-pre-wrap">{p.description_he ?? "—"}</dd></div>
            {p.applied_message && <div className="sm:col-span-2"><dt className="text-muted">הערות מהספק</dt><dd>{p.applied_message}</dd></div>}
            <div><dt className="text-muted">מימושים</dt><dd className="tabular">{stats.n} · {money(stats.sum)} · עמלה רשומה {money(stats.comm)}</dd></div>
          </dl>
        </section>
        <section className="card p-5"><h3 className="text-lg">שירותים</h3><ul className="mt-2 divide-y divide-line text-sm">{services.map((s) => <li key={s.id} className="flex justify-between py-2"><span>{s.title_he}</span><span className="text-muted tabular">{s.price_agorot != null ? money(s.price_agorot) : ""} · {he.offerStatus[s.status]}</span></li>)}{services.length === 0 && <li className="py-2 text-muted">אין</li>}</ul>
          <h3 className="mt-4 text-lg">הטבות</h3><ul className="mt-2 divide-y divide-line text-sm">{benefits.map((b) => <li key={b.id} className="flex justify-between py-2"><span>{b.title_he}</span><span className="text-muted">{he.offerStatus[b.status]}</span></li>)}{benefits.length === 0 && <li className="py-2 text-muted">אין</li>}</ul></section>
        <section className="card p-5"><h3 className="text-lg">משתמשי הספק</h3><ul className="mt-2 text-sm">{members.map((m) => <li key={m.user_id}><bdi>{m.email ?? m.phone ?? m.user_id}</bdi> · {m.role}</li>)}{members.length === 0 && <li className="text-muted">אין עדיין. שיוך משתמש נעשה בטופס האישור לפי אימייל.</li>}</ul></section>
      </div>
      <div className="space-y-6">
        {sp.saved && <Alert kind="ok">נשמר.</Alert>}{sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
        <form action={reviewProviderAction} className="card space-y-3 p-5">
          <h3 className="text-lg">סטטוס ואישור</h3>
          <input type="hidden" name="id" value={id} />
          <div><label className="field-label" htmlFor="status">סטטוס</label><select id="status" name="status" className="field" defaultValue={p.status}>{Object.entries(he.providerStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="field-label" htmlFor="commission_pct">עמלה לספק (%)</label><input id="commission_pct" name="commission_pct" inputMode="decimal" dir="ltr" className="field tabular" defaultValue={p.commission_pct ?? ""} placeholder="ריק = ברירת מחדל" /></div>
          <div><label className="field-label" htmlFor="member_email">שיוך משתמש לפי אימייל</label><input id="member_email" name="member_email" type="email" dir="ltr" className="field" defaultValue={members.length ? "" : p.contact_email ?? ""} /><p className="field-hint">המשתמש יתחבר בקוד חד-פעמי לאימייל הזה.</p></div>
          <SubmitButton className="btn btn-navy w-full">שמירה</SubmitButton>
        </form>
        <form action={setProviderCategoriesAction} className="card space-y-3 p-5"><h3 className="text-lg">תחומים</h3><input type="hidden" name="id" value={id} /><div className="grid gap-1 text-sm">{cats.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="category_ids" value={c.id} defaultChecked={c.on} className="h-4 w-4 accent-navy" />{c.name_he}</label>)}</div><SubmitButton className="btn btn-outline btn-sm">עדכון תחומים</SubmitButton></form>
        <div className="card space-y-3 p-5"><h3 className="text-lg">עמלה לפי קטגוריה</h3>
          <ul className="text-sm">{rules.map((r) => <li key={r.id} className="flex justify-between py-1"><span>{r.name_he ?? "כל הקטגוריות"}: {r.pct}%</span><form action={deleteCommissionRuleAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="path" value={`/admin/providers/${id}`} /><button className="text-danger text-xs">הסרה</button></form></li>)}{rules.length === 0 && <li className="text-muted">אין כללים; חלה עמלת הספק או ברירת המחדל.</li>}</ul>
        <form action={commissionRuleAction} className="space-y-3"><input type="hidden" name="provider_id" value={id} />
          <div className="grid grid-cols-[1fr_80px] gap-2"><select name="category_id" className="field"><option value="">כל הקטגוריות</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}</select><input name="pct" inputMode="decimal" dir="ltr" className="field tabular" placeholder="%" required /></div>
          <SubmitButton className="btn btn-outline btn-sm">הוספת כלל</SubmitButton></form></div>
        <form action={setDemoAction} className="card flex items-center justify-between p-5 text-sm"><input type="hidden" name="id" value={id} /><input type="hidden" name="is_demo" value={p.is_demo ? "0" : "1"} /><span>ספק לדוגמה: <b>{p.is_demo ? "כן" : "לא"}</b></span><button className="btn btn-outline btn-sm">{p.is_demo ? "סימון כאמיתי" : "סימון כהדגמה"}</button></form>
      </div>
    </div>
  );
}
