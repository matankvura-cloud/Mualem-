"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asUser, dbErrorCode } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

export async function createInviteAction(formData: FormData) {
  const user = await requireUser("/wallet/share");
  if (!user.walletId) redirect("/wallet");
  const label = String(formData.get("label") ?? "");
  const r = (await asUser(user.id, (tx) => tx`select create_wallet_invite(${user.walletId}::uuid, ${label}) as r`))[0].r;
  redirect(`/wallet/share?token=${encodeURIComponent(r.token)}`);
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser("/wallet/share");
  const target = String(formData.get("userId"));
  try { await asUser(user.id, (tx) => tx`select remove_wallet_member(${user.walletId}::uuid, ${target}::uuid)`); }
  catch (e) { redirect(`/wallet/share?error=${dbErrorCode(e) ?? "generic"}`); }
  revalidatePath("/wallet/share");
  redirect("/wallet/share");
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token"));
  const user = await requireUser(`/wallet/join/${token}`);
  try { await asUser(user.id, (tx) => tx`select accept_wallet_invite(${token})`); }
  catch (e) { redirect(`/wallet/join/${token}?error=${dbErrorCode(e) ?? "generic"}`); }
  redirect("/wallet?joined=1");
}

export async function updateNameAction(formData: FormData) {
  const user = await requireUser("/wallet");
  const name = String(formData.get("fullName") ?? "").trim().slice(0, 80);
  await asUser(user.id, (tx) => tx`update profiles set full_name = ${name || null}, updated_at = now() where id = ${user.id}::uuid`);
  revalidatePath("/wallet");
  redirect("/wallet");
}
