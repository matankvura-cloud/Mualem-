import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asUser } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";
import { normalizePhone } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "פרופיל העסק" };
export const dynamic = "force-dynamic";

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireProvider("/provider/profile");
  const g = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const cats = formData.getAll("category_ids").map(String);
  if (!g("display_name")) redirect("/provider/profile?error=1");
  await asUser(user.id, async (tx) => {
    await tx`update providers set display_name = ${g("display_name")}, legal_name = ${g("legal_name")}, business_id = ${g("business_id")}, contact_name = ${g("contact_name")},
      phone_e164 = ${normalizePhone(g("phone") ?? "")}, whatsapp_e164 = ${normalizePhone(g("whatsapp") ?? "")}, website = ${g("website")}, city = ${g("city")}, service_area = ${g("service_area")},
      description_he = ${g("description_he")}, kosher_note = ${g("kosher_note")} where id = ${user.providerId}::uuid`;
    await tx`delete from provider_categories where provider_id = ${user.providerId}::uuid`;
    for (const c of cats) await tx`insert into provider_categories (provider_id, category_id) values (${user.providerId}::uuid, ${c}::uuid) on conflict do nothing`;
  });
  revalidatePath("/provider/profile"); redirect("/provider/profile?saved=1");
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireProvider("/provider/profile");
  const [p] = await asUser(user.id, (tx) => tx`select * from providers where id = ${user.providerId}::uuid`);
  const cats = await asUser(user.id, (tx) => tx`select c.id, c.name_he, exists (select 1 from provider_categories pc where pc.provider_id = ${user.providerId}::uuid and pc.category_id = c.id) as on from categories c where c.is_active order by c.sort_order`);
  const f = (k: string, label: string, extra: Record<string, string> = {}) => <div><label className="field-label" htmlFor={k}>{label}</label><input id={k} name={k} className="field" defaultValue={p[k === "phone" ? "phone_e164" : k === "whatsapp" ? "whatsapp_e164" : k]?.toString().replace(/^\+972/, "0") ?? ""} {...extra} /></div>;
  return (
    <form action={saveProfile} className="card max-w-3xl space-y-5 p-5 sm:p-6">
      <h2 className="text-xl">פרופיל העסק</h2>
      {sp.saved && <Alert kind="ok">הפרופיל נשמר.</Alert>}
      {sp.error && <Alert kind="danger">יש למלא שם עסק.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {f("display_name", "שם להצגה", { required: "true" })}{f("legal_name", "שם משפטי")}{f("business_id", "ח.פ / ע.מ", { dir: "ltr" })}{f("contact_name", "איש/אשת קשר")}
        {f("phone", "טלפון", { dir: "ltr" })}{f("whatsapp", "וואטסאפ", { dir: "ltr" })}{f("website", "אתר", { dir: "ltr" })}{f("city", "עיר")}{f("service_area", "אזור שירות")}{f("kosher_note", "כשרות")}
      </div>
      <div><label className="field-label" htmlFor="description_he">על העסק (מוצג למשפחות)</label><textarea id="description_he" name="description_he" rows={4} className="field" defaultValue={p.description_he ?? ""} /></div>
      <fieldset><legend className="field-label">תחומי שירות</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{cats.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="category_ids" value={c.id} defaultChecked={c.on} className="h-4 w-4 accent-navy" />{c.name_he}</label>)}</div><p className="field-hint">שוברים המוגבלים לתחום ניתנים למימוש רק אצל ספקים באותו תחום.</p></fieldset>
      <p className="text-xs text-muted">אימייל כניסה: <bdi>{p.contact_email}</bdi> · עמלה: {p.commission_pct ?? "ברירת מחדל"}% · שינוי אימייל או עמלה דרך צוות מתנה של נחמה.</p>
      <SubmitButton className="btn btn-navy">שמירה</SubmitButton>
    </form>
  );
}
