"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asUser, dbErrorCode } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

function back(path: string, extra?: Record<string, string>) { const q = extra ? "?" + new URLSearchParams(extra) : ""; revalidatePath(path); redirect(path + q); }
async function run(path: string, fn: (uid: string) => Promise<unknown>, okParam = "saved") {
  const u = await requireAdmin(path);
  try { await fn(u.id); } catch (e) { if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e; back(path, { error: dbErrorCode(e) ?? "generic" }); }
  back(path, { [okParam]: "1" });
}

export async function reviewProviderAction(fd: FormData) {
  const id = String(fd.get("id")); const status = String(fd.get("status")); const comm = String(fd.get("commission_pct") ?? "").trim(); const email = String(fd.get("member_email") ?? "").trim();
  await run(`/admin/providers/${id}`, (uid) => asUser(uid, (tx) => tx`select admin_review_provider(${id}::uuid, ${status}::provider_status, ${comm ? Number(comm) : null}, ${email || null})`));
}
export async function setProviderCategoriesAction(fd: FormData) {
  const id = String(fd.get("id")); const cats = fd.getAll("category_ids").map(String);
  await run(`/admin/providers/${id}`, (uid) => asUser(uid, async (tx) => { await tx`delete from provider_categories where provider_id = ${id}::uuid`; for (const c of cats) await tx`insert into provider_categories (provider_id, category_id) values (${id}::uuid, ${c}::uuid)`; }));
}
export async function setDemoAction(fd: FormData) {
  const id = String(fd.get("id")); const demo = fd.get("is_demo") === "1";
  await run(`/admin/providers/${id}`, (uid) => asUser(uid, (tx) => tx`update providers set is_demo = ${demo} where id = ${id}::uuid`));
}
export async function commissionRuleAction(fd: FormData) {
  const pid = String(fd.get("provider_id") ?? "") || null; const cid = String(fd.get("category_id") ?? "") || null; const pct = Number(fd.get("pct")); const note = String(fd.get("note") ?? "");
  const path = pid ? `/admin/providers/${pid}` : "/admin/settings";
  await run(path, (uid) => asUser(uid, (tx) => tx`select admin_upsert_commission_rule(${pid}::uuid, ${cid}::uuid, ${pct}, ${note || null})`));
}
export async function deleteCommissionRuleAction(fd: FormData) {
  const id = String(fd.get("id")); const path = String(fd.get("path") ?? "/admin/settings");
  await run(path, (uid) => asUser(uid, (tx) => tx`delete from commission_rules where id = ${id}::uuid`));
}
export async function reviewServiceAction(fd: FormData) {
  await run("/admin/catalog", (uid) => asUser(uid, (tx) => tx`select admin_review_service(${String(fd.get("id"))}::uuid, ${String(fd.get("status"))}::offer_status)`));
}
export async function reviewBenefitAction(fd: FormData) {
  await run("/admin/catalog", (uid) => asUser(uid, (tx) => tx`select admin_review_benefit(${String(fd.get("id"))}::uuid, ${String(fd.get("status"))}::offer_status)`));
}
export async function saveCategoryAction(fd: FormData) {
  const id = String(fd.get("id") ?? ""); const name = String(fd.get("name_he") ?? "").trim(); const blurb = String(fd.get("blurb_he") ?? "").trim(); const active = fd.get("is_active") === "on";
  await run("/admin/catalog", (uid) => asUser(uid, (tx) => tx`update categories set name_he = ${name}, blurb_he = ${blurb || null}, is_active = ${active} where id = ${id}::uuid`));
}
export async function cancelVoucherAction(fd: FormData) {
  await run("/admin/vouchers", (uid) => asUser(uid, (tx) => tx`select admin_cancel_voucher(${String(fd.get("id"))}::uuid, ${String(fd.get("reason") ?? "")})`));
}
export async function refundOrderAction(fd: FormData) {
  await run("/admin/orders", (uid) => asUser(uid, (tx) => tx`select admin_refund_order(${String(fd.get("id"))}::uuid, ${String(fd.get("reason") ?? "")})`));
}
export async function reverseRedemptionAction(fd: FormData) {
  await run("/admin/redemptions", (uid) => asUser(uid, (tx) => tx`select reverse_redemption(${String(fd.get("id"))}::uuid, ${String(fd.get("reason") ?? "")})`));
}
export async function issueStatusAction(fd: FormData) {
  await run("/admin/issues", (uid) => asUser(uid, (tx) => tx`update issues set status = ${String(fd.get("status"))} where id = ${String(fd.get("id"))}::uuid`));
}
export async function settingAction(fd: FormData) {
  await run("/admin/settings", (uid) => asUser(uid, (tx) => tx`select admin_set_setting(${String(fd.get("key"))}, ${String(fd.get("value") ?? "").trim()})`));
}
