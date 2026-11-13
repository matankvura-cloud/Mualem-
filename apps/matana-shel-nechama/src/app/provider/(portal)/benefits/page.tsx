import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asUser } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { he } from "../../../../../messages/he";

export const metadata: Metadata = { title: "הטבות לכרטיס" };
export const dynamic = "force-dynamic";

async function saveBenefit(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/benefits");
  const id = String(formData.get("id") ?? ""); const title = String(formData.get("title_he") ?? "").trim(); const terms = String(formData.get("terms_he") ?? "").trim();
  const kind = ["percent", "fixed", "gift"].includes(String(formData.get("kind"))) ? String(formData.get("kind")) : "percent";
  const valueRaw = String(formData.get("value") ?? "").replace(/[^\d.]/g, ""); const value = valueRaw ? Number(valueRaw) : null;
  const maxRaw = String(formData.get("max_per_card") ?? "").replace(/\D/g, ""); const max = maxRaw ? Number(maxRaw) : null;
  const from = String(formData.get("valid_from") ?? "") || null; const until = String(formData.get("valid_until") ?? "") || null;
  if (!title || !terms) redirect("/provider/benefits?error=fields");
  await asUser(user.id, async (tx) => {
    if (id) await tx`update benefits set title_he = ${title}, terms_he = ${terms}, kind = ${kind}, value = ${value}, max_per_card = ${max}, valid_from = ${from}, valid_until = ${until} where id = ${id}::uuid and provider_id = ${user.providerId}::uuid`;
    else await tx`insert into benefits (provider_id, title_he, terms_he, kind, value, max_per_card, valid_from, valid_until, status) values (${user.providerId}::uuid, ${title}, ${terms}, ${kind}, ${value}, ${max}, ${from}, ${until}, 'pending_review')`;
  });
  revalidatePath("/provider/benefits"); redirect("/provider/benefits?saved=1");
}
async function deleteBenefit(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/benefits");
  await asUser(user.id, (tx) => tx`delete from benefits where id = ${String(formData.get("id"))}::uuid and provider_id = ${user.providerId}::uuid`);
  revalidatePath("/provider/benefits"); redirect("/provider/benefits");
}

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireProvider("/provider/benefits");
  const benefits = await asUser(user.id, (tx) => tx`select * from benefits where provider_id = ${user.providerId}::uuid order by created_at`);
  const editing = sp.edit ? benefits.find((b) => b.id === sp.edit) : null;
  const kindLabel: Record<string, string> = { percent: "אחוז הנחה", fixed: "הנחה בש״ח", gift: "תוספת מתנה" };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <h2 className="text-xl">הטבות למחזיקי כרטיס</h2>
        <p className="mt-1 text-sm text-muted">הטבה היא הנחה או תוספת שאתם נותנים למשפחה שמציגה כרטיס הטבות, ללא קשר לשובר. מוצגת רק לאחר אישור מנהל.</p>
        {sp.saved && <div className="mt-3"><Alert kind="ok">נשמר ונשלח לאישור.</Alert></div>}
        <ul className="mt-4 space-y-2">
          {benefits.map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-medium">{b.title_he} <span className={`badge ms-1 ${b.status === "approved" ? "badge-ok" : b.status === "pending_review" ? "badge-warn" : "badge-muted"}`}>{he.offerStatus[b.status]}</span></p><p className="text-sm text-muted">{kindLabel[b.kind]}{b.value != null ? ` ${b.value}` : ""} · {b.terms_he}{b.max_per_card ? ` · עד ${b.max_per_card} פעמים לכרטיס` : ""}</p></div>
              <div className="flex gap-2"><a href={`/provider/benefits?edit=${b.id}`} className="btn btn-outline btn-sm">עריכה</a><form action={deleteBenefit}><input type="hidden" name="id" value={b.id} /><button className="btn btn-danger btn-sm">מחיקה</button></form></div>
            </li>
          ))}
          {benefits.length === 0 && <li className="text-muted">אין הטבות עדיין.</li>}
        </ul>
      </section>
      <section className="card h-fit p-5">
        <h2 className="text-lg">{editing ? "עריכת הטבה" : "הטבה חדשה"}</h2>
        <form action={saveBenefit} className="mt-3 space-y-3">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div><label className="field-label" htmlFor="title_he">כותרת</label><input id="title_he" name="title_he" className="field" required defaultValue={editing?.title_he ?? ""} placeholder="10% הנחה למחזיקי כרטיס" /></div>
          <div><label className="field-label" htmlFor="terms_he">תנאים</label><textarea id="terms_he" name="terms_he" rows={2} className="field" required defaultValue={editing?.terms_he ?? ""} placeholder="על הזמנה לשבעה, לא כולל משלוח" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="field-label" htmlFor="kind">סוג</label><select id="kind" name="kind" className="field" defaultValue={editing?.kind ?? "percent"}><option value="percent">אחוז הנחה</option><option value="fixed">הנחה בש״ח</option><option value="gift">תוספת מתנה</option></select></div>
            <div><label className="field-label" htmlFor="value">ערך</label><input id="value" name="value" inputMode="decimal" dir="ltr" className="field tabular" defaultValue={editing?.value ?? ""} /></div>
            <div><label className="field-label" htmlFor="max_per_card">מקסימום לכרטיס</label><input id="max_per_card" name="max_per_card" inputMode="numeric" dir="ltr" className="field tabular" defaultValue={editing?.max_per_card ?? ""} /></div>
            <div><label className="field-label" htmlFor="valid_until">בתוקף עד</label><input id="valid_until" name="valid_until" type="date" dir="ltr" className="field" defaultValue={editing?.valid_until ?? ""} /></div>
          </div>
          <input type="hidden" name="valid_from" value={editing?.valid_from ?? ""} />
          {sp.error && <Alert kind="danger">יש למלא כותרת ותנאים.</Alert>}
          <div className="flex gap-2"><SubmitButton className="btn btn-navy">{editing ? "שמירה" : "הוספה"}</SubmitButton>{editing && <a href="/provider/benefits" className="btn btn-outline">ביטול</a>}</div>
        </form>
      </section>
    </div>
  );
}
