"use server";
import { redirect } from "next/navigation";
import { asUser, dbErrorCode } from "@/lib/db";
import { requireProvider } from "@/lib/auth/guards";

export async function lookupAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/provider/redeem");
  redirect(`/provider/redeem?code=${encodeURIComponent(code)}`);
}

export async function redeemAction(formData: FormData) {
  const user = await requireProvider("/provider/redeem");
  const code = String(formData.get("code") ?? "");
  const idem = String(formData.get("idem") ?? "");
  const note = String(formData.get("note") ?? "");
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(/[^\d.]/g, "")) * 100);
  if (!amount || amount <= 0) redirect(`/provider/redeem?code=${encodeURIComponent(code)}&error=invalid_amount`);
  try {
    const r = (await asUser(user.id, (tx) => tx`select redeem_voucher(${code}, ${amount}, ${idem}, ${note}) as r`))[0].r;
    redirect(`/provider/redeem?done=${r.redemption_id}&amount=${r.amount_agorot}&balance=${r.balance_agorot}&already=${r.already ? 1 : 0}`);
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/provider/redeem?code=${encodeURIComponent(code)}&error=${dbErrorCode(e) ?? "generic"}`);
  }
}

export async function lookupCardAction(formData: FormData) {
  const card = String(formData.get("card") ?? "").trim();
  redirect(`/provider/redeem?card=${encodeURIComponent(card)}`);
}

export async function redeemBenefitAction(formData: FormData) {
  const user = await requireProvider("/provider/redeem");
  const card = String(formData.get("card") ?? ""); const benefit = String(formData.get("benefit") ?? ""); const idem = String(formData.get("idem") ?? "");
  try {
    await asUser(user.id, (tx) => tx`select redeem_benefit(${card}, ${benefit}::uuid, ${idem}, null)`);
  } catch (e) {
    redirect(`/provider/redeem?card=${encodeURIComponent(card)}&error=${dbErrorCode(e) ?? "generic"}`);
  }
  redirect(`/provider/redeem?card=${encodeURIComponent(card)}&benefit_done=1`);
}
