"use server";
import { redirect } from "next/navigation";
import { asAnon, asUser, dbErrorCode } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PRESETS, readDraft, writeDraft, clearDraft, orderCookie, setPrivateCookie } from "@/lib/gift/draft";
import { normalizePhone, isEmail } from "@/lib/format";

const MIN = 5000, MAX = 500000;

export async function saveStep1(formData: FormData) {
  const d = await readDraft();
  const kind = formData.get("kind") === "group" ? "group" : "personal";
  const preset = String(formData.get("amount") ?? "");
  let amount: number | null = null;
  if (preset === "custom") {
    const n = Math.round(Number(String(formData.get("custom") ?? "").replace(/[^\d.]/g, "")) * 100);
    amount = Number.isFinite(n) ? n : null;
  } else if (PRESETS.includes(Number(preset))) amount = Number(preset);
  const scopeRaw = String(formData.get("scope") ?? "all");
  const scope = scopeRaw === "all" ? null : scopeRaw;
  if (!amount || amount < MIN || amount > MAX || amount % 100 !== 0) {
    await writeDraft({ ...d, kind, scope });
    redirect("/gift?error=amount");
  }
  await writeDraft({ ...d, kind, amount, scope });
  redirect("/gift/recipient");
}

export async function saveStep2(formData: FormData) {
  const d = await readDraft();
  if (!d.amount) redirect("/gift");
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const next = { ...d, buyerName: get("buyerName"), buyerPhone: get("buyerPhone"), buyerEmail: get("buyerEmail"), recipientName: get("recipientName"),
    recipientPhone: get("recipientPhone"), dedication: get("dedication").slice(0, 250), deliverAt: get("deliverAt"), channel: (get("channel") === "link" ? "link" : "whatsapp") as "link" | "whatsapp" };
  await writeDraft(next);
  const errors: string[] = [];
  if (!next.buyerName) errors.push("buyerName");
  if (!next.recipientName) errors.push("recipientName");
  if (next.buyerPhone && !normalizePhone(next.buyerPhone)) errors.push("buyerPhone");
  if (next.recipientPhone && !normalizePhone(next.recipientPhone)) errors.push("recipientPhone");
  if (next.buyerEmail && !isEmail(next.buyerEmail)) errors.push("buyerEmail");
  if (errors.length) redirect(`/gift/recipient?error=${errors.join(",")}`);
  redirect("/gift/review");
}

export async function createOrderAction(formData: FormData) {
  const d = await readDraft();
  if (!d.amount || !d.buyerName || !d.recipientName) redirect("/gift");
  if (formData.get("terms") !== "on") redirect("/gift/review?error=terms");
  const user = await getCurrentUser();
  const payload = {
    amount_agorot: d.amount, idempotency_key: d.idem, kind: d.kind, scope_category_id: d.scope,
    buyer_name: d.buyerName, buyer_phone: d.buyerPhone || null, buyer_email: d.buyerEmail || null,
    recipient_name: d.recipientName, recipient_phone: d.recipientPhone || null, dedication_he: d.dedication || null,
    deliver_at: d.deliverAt ? new Date(d.deliverAt).toISOString() : null, delivery_channel: d.channel,
  };
  let res: { order_id: string; order_no: string; access_token: string | null; existing: boolean };
  try {
    const run = (tx: Parameters<Parameters<typeof asAnon>[0]>[0]) => tx`select create_gift_order(${tx.json(payload)}) as r`;
    const rows = user ? await asUser(user.id, run) : await asAnon(run);
    res = rows[0].r;
  } catch (e) {
    redirect(`/gift/review?error=${dbErrorCode(e) ?? "generic"}`);
  }
  if (res.access_token) await setPrivateCookie(orderCookie(res.order_id), res.access_token);
  redirect(`/pay/sandbox/${res.order_id}`);
}

export async function resetDraftAction() { await clearDraft(); redirect("/gift"); }
