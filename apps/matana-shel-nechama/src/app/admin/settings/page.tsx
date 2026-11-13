import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { Alert } from "@/components/ui/Alert";
import { settingAction, commissionRuleAction, deleteCommissionRuleAction } from "../actions";
import { errText } from "../../../../messages/he";
export const metadata: Metadata = { title: "הגדרות" };
export const dynamic = "force-dynamic";
export default async function AdminSettings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const u = await requireAdmin();
  const settings = await asUser(u.id, (tx) => tx`select * from app_settings order by key`);
  const rules = await asUser(u.id, (tx) => tx`select r.id, r.pct, r.note, c.name_he from commission_rules r left join categories c on c.id = r.category_id where r.provider_id is null order by c.sort_order nulls first`);
  const cats = await asUser(u.id, (tx) => tx`select id, name_he from categories order by sort_order`);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {sp.saved && <div className="lg:col-span-2"><Alert kind="ok">נשמר.</Alert></div>}{sp.error && <div className="lg:col-span-2"><Alert kind="danger">{errText(sp.error)}</Alert></div>}
      <section className="card space-y-4 p-5"><h2 className="text-xl">הגדרות מערכת</h2>
        {settings.map((s) => <form key={s.key} action={settingAction} className="space-y-1 border-b border-line pb-3 last:border-0"><input type="hidden" name="key" value={s.key} /><label className="field-label" htmlFor={`s-${s.key}`}><code className="text-xs">{s.key}</code></label><div className="flex gap-2"><input id={`s-${s.key}`} name="value" className="field" dir="ltr" defaultValue={s.value} readOnly={s.key === "payments_mode"} /><button className="btn btn-outline btn-sm" disabled={s.key === "payments_mode"}>שמירה</button></div><p className="field-hint">{s.description}{s.key === "payments_mode" && " נעול: שינוי דורש חיבור סולק ואישור."}</p></form>)}
      </section>
      <div className="card space-y-3 p-5"><h2 className="text-xl">עמלת ברירת מחדל לפי קטגוריה</h2><p className="text-sm text-muted">חלה כשאין עמלה ספציפית לספק. סדר עדיפות: ספק+קטגוריה ← ספק ← קטגוריה ← ברירת מחדל.</p>
        <ul className="text-sm">{rules.map((r) => <li key={r.id} className="flex justify-between py-1"><span>{r.name_he ?? "כל הקטגוריות"}: {r.pct}% {r.note && <span className="text-muted">· {r.note}</span>}</span><form action={deleteCommissionRuleAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="path" value="/admin/settings" /><button className="text-xs text-danger">הסרה</button></form></li>)}{rules.length === 0 && <li className="text-muted">אין כללים.</li>}</ul>
        <form action={commissionRuleAction} className="space-y-2"><div className="grid grid-cols-[1fr_80px] gap-2"><select name="category_id" className="field"><option value="">כל הקטגוריות</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}</select><input name="pct" inputMode="decimal" dir="ltr" className="field tabular" placeholder="%" required /></div><input name="note" className="field" placeholder="הערה" /><button className="btn btn-outline btn-sm">הוספת כלל</button></form>
      </div>
    </div>
  );
}
