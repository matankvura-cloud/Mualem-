import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const PRESETS = [15000, 30000, 50000, 100000];
export type GiftDraft = {
  idem: string; kind: "personal" | "group"; amount: number | null; scope: string | null;
  buyerName: string; buyerPhone: string; buyerEmail: string; recipientName: string; recipientPhone: string;
  dedication: string; deliverAt: string; channel: "link" | "whatsapp";
};
const KEY = "mn_gift";
const empty = (): GiftDraft => ({ idem: randomUUID(), kind: "personal", amount: null, scope: null, buyerName: "", buyerPhone: "", buyerEmail: "", recipientName: "", recipientPhone: "", dedication: "", deliverAt: "", channel: "whatsapp" });

export async function readDraft(): Promise<GiftDraft> {
  const jar = await cookies();
  const raw = jar.get(KEY)?.value;
  if (!raw) return empty();
  try { return { ...empty(), ...(JSON.parse(raw) as Partial<GiftDraft>) }; } catch { return empty(); }
}
export async function writeDraft(d: GiftDraft) {
  const jar = await cookies();
  jar.set(KEY, JSON.stringify(d), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400, secure: process.env.NODE_ENV === "production" });
}
export async function clearDraft() { (await cookies()).delete(KEY); }

export const orderCookie = (orderId: string) => `mn_o_${orderId}`;
export const claimCookie = (orderId: string) => `mn_c_${orderId}`;
export async function setPrivateCookie(name: string, value: string, days = 30) {
  (await cookies()).set(name, value, { httpOnly: true, sameSite: "lax", path: "/", maxAge: days * 86400, secure: process.env.NODE_ENV === "production" });
}
export async function getCookie(name: string) { return (await cookies()).get(name)?.value ?? null; }
export const STEPS = ["פרטי מתנה", "למי שולחים", "סיכום ותשלום"];
