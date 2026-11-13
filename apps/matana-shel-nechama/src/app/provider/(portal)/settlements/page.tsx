import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { money, dateHe } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "התחשבנות" };
export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const user = await requireProvider("/provider/settlements");
  const months = await asUser(user.id, (tx) => tx`select * from provider_monthly_settlement where provider_id = ${user.providerId}::uuid order by month desc`);
  const rows = await asUser(user.id, (tx) => tx`select id, amount_agorot, commission_pct, commission_agorot, status, note, created_at, reversed_at from redemptions where provider_id = ${user.providerId}::uuid order by created_at desc limit 200`);
  return (
    <div className="space-y-6">
      <Alert kind="info">העמלה מחושבת ונרשמת לכל מימוש לצורך שקיפות. <b>היא אינה נגבית ואין התחשבנות בפועל</b> עד להסדרת הסכם הספק וחיבור סליקה. דוחות תקופתיים וחשבוניות יתווספו בשלב הפיילוט.</Alert>
      <section>
        <h2 className="text-xl">סיכום חודשי</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[520px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">חודש</th><th className="px-4 py-2 text-start">מימושים</th><th className="px-4 py-2 text-start">ברוטו</th><th className="px-4 py-2 text-start">עמלה רשומה</th><th className="px-4 py-2 text-start">נטו לספק</th></tr></thead>
            <tbody className="divide-y divide-line tabular">{months.map((m) => <tr key={m.month}><td className="px-4 py-2">{new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(m.month))}</td><td className="px-4 py-2">{m.redemptions}</td><td className="px-4 py-2">{money(m.gross_agorot)}</td><td className="px-4 py-2">{money(m.commission_agorot)}</td><td className="px-4 py-2 font-medium">{money(m.net_agorot)}</td></tr>)}
            {months.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-muted">אין מימושים עדיין.</td></tr>}</tbody></table>
        </div>
      </section>
      <section>
        <h2 className="text-xl">כל העסקאות</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm"><thead className="text-xs text-muted"><tr><th className="px-4 py-2 text-start">תאריך</th><th className="px-4 py-2 text-start">סכום</th><th className="px-4 py-2 text-start">עמלה</th><th className="px-4 py-2 text-start">סטטוס</th><th className="px-4 py-2 text-start">הערה</th></tr></thead>
            <tbody className="divide-y divide-line tabular">{rows.map((r) => <tr key={r.id}><td className="px-4 py-2">{dateHe(r.created_at, true)}</td><td className="px-4 py-2">{money(r.amount_agorot)}</td><td className="px-4 py-2">{money(r.commission_agorot)} ({r.commission_pct}%)</td><td className="px-4 py-2">{r.status === "reversed" ? <span className="badge badge-warn">בוטל</span> : <span className="badge badge-ok">אושר</span>}</td><td className="px-4 py-2 text-muted">{r.note ?? ""}</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}
