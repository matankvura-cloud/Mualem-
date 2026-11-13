import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asUser } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { money } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { he } from "../../../../../messages/he";

export const metadata: Metadata = { title: "שירותים ומחירים" };
export const dynamic = "force-dynamic";

async function saveService(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/services");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title_he") ?? "").trim(); const desc = String(formData.get("description_he") ?? "").trim();
  const category = String(formData.get("category_id") ?? ""); const note = String(formData.get("price_note_he") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").replace(/[^\d.]/g, "");
  const price = priceRaw ? Math.round(Number(priceRaw) * 100) : null;
  if (!title || !category) redirect("/provider/services?error=fields");
  await asUser(user.id, async (tx) => {
    if (id) await tx`update provider_services set title_he = ${title}, description_he = ${desc || null}, category_id = ${category}::uuid, price_agorot = ${price}, price_note_he = ${note || null} where id = ${id}::uuid and provider_id = ${user.providerId}::uuid`;
    else await tx`insert into provider_services (provider_id, category_id, title_he, description_he, price_agorot, price_note_he, status) values (${user.providerId}::uuid, ${category}::uuid, ${title}, ${desc || null}, ${price}, ${note || null}, 'pending_review')`;
  });
  revalidatePath("/provider/services"); redirect("/provider/services?saved=1");
}
async function deleteService(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/services");
  await asUser(user.id, (tx) => tx`delete from provider_services where id = ${String(formData.get("id"))}::uuid and provider_id = ${user.providerId}::uuid`);
  revalidatePath("/provider/services"); redirect("/provider/services");
}
async function toggleService(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/services");
  const to = formData.get("to") === "paused" ? "paused" : "pending_review";
  await asUser(user.id, (tx) => tx`update provider_services set status = ${to}::offer_status where id = ${String(formData.get("id"))}::uuid and provider_id = ${user.providerId}::uuid`);
  revalidatePath("/provider/services"); redirect("/provider/services");
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireProvider("/provider/services");
  const myCats = await asUser(user.id, (tx) => tx`select c.id, c.name_he from provider_categories pc join categories c on c.id = pc.category_id where pc.provider_id = ${user.providerId}::uuid order by c.sort_order`);
  const allCats = await asUser(user.id, (tx) => tx`select id, name_he from categories where is_active order by sort_order`);
  const cats = myCats.length ? myCats : allCats;
  const services = await asUser(user.id, (tx) => tx`select s.*, c.name_he as category from provider_services s join categories c on c.id = s.category_id where s.provider_id = ${user.providerId}::uuid order by s.sort_order, s.created_at`);
  const editing = sp.edit ? services.find((s) => s.id === sp.edit) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <h2 className="text-xl">השירותים שלכם</h2>
        <p className="mt-1 text-sm text-muted">כל שירות חדש או שינוי מחיר נבדק על ידי מנהל לפני שהוא מוצג למשפחות.</p>
        {sp.saved && <div className="mt-3"><Alert kind="ok">נשמר ונשלח לאישור.</Alert></div>}
        <ul className="mt-4 space-y-2">
          {services.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-medium">{s.title_he} <span className={`badge ms-1 ${s.status === "approved" ? "badge-ok" : s.status === "pending_review" ? "badge-warn" : "badge-muted"}`}>{he.offerStatus[s.status]}</span></p><p className="text-sm text-muted">{s.category} · {s.price_agorot != null ? money(s.price_agorot) : "ללא מחיר"}{s.price_note_he ? ` · ${s.price_note_he}` : ""}</p></div>
              <div className="flex gap-2 text-sm">
                <a href={`/provider/services?edit=${s.id}`} className="btn btn-outline btn-sm">עריכה</a>
                <form action={toggleService}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="to" value={s.status === "paused" ? "pending_review" : "paused"} /><button className="btn btn-outline btn-sm">{s.status === "paused" ? "הפעלה" : "השהיה"}</button></form>
                <form action={deleteService}><input type="hidden" name="id" value={s.id} /><button className="btn btn-danger btn-sm">מחיקה</button></form>
              </div>
            </li>
          ))}
          {services.length === 0 && <li className="text-muted">עדיין אין שירותים. הוסיפו את הראשון.</li>}
        </ul>
      </section>
      <section className="card h-fit p-5">
        <h2 className="text-lg">{editing ? "עריכת שירות" : "שירות חדש"}</h2>
        <form action={saveService} className="mt-3 space-y-3">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div><label className="field-label" htmlFor="title_he">שם השירות</label><input id="title_he" name="title_he" className="field" required defaultValue={editing?.title_he ?? ""} /></div>
          <div><label className="field-label" htmlFor="category_id">קטגוריה</label><select id="category_id" name="category_id" className="field" defaultValue={editing?.category_id ?? cats[0]?.id}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}</select></div>
          <div><label className="field-label" htmlFor="description_he">תיאור קצר</label><textarea id="description_he" name="description_he" rows={2} className="field" defaultValue={editing?.description_he ?? ""} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="field-label" htmlFor="price">מחיר (₪)</label><input id="price" name="price" inputMode="decimal" dir="ltr" className="field tabular" defaultValue={editing?.price_agorot != null ? editing.price_agorot / 100 : ""} /></div>
            <div><label className="field-label" htmlFor="price_note_he">הערת מחיר</label><input id="price_note_he" name="price_note_he" className="field" placeholder="לשבוע / החל מ-" defaultValue={editing?.price_note_he ?? ""} /></div>
          </div>
          {sp.error && <Alert kind="danger">יש למלא שם וקטגוריה.</Alert>}
          <div className="flex gap-2"><SubmitButton className="btn btn-navy">{editing ? "שמירה" : "הוספה"}</SubmitButton>{editing && <a href="/provider/services" className="btn btn-outline">ביטול</a>}</div>
        </form>
      </section>
    </div>
  );
}
