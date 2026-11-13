import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomInt } from "node:crypto";
import { asService } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";
import { createSession, sha256 } from "@/lib/auth/session";
import { isEmail, normalizePhone } from "@/lib/format";

const OTP_COOKIE = "mn_otp";
const OTP_MINUTES = 10;
const MAX_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

export type StartResult = { ok: true; channel: "email" | "sms"; identifier: string; masked: string } | { ok: false; error: string };

export function phoneAuthEnabled() {
  return process.env.AUTH_PHONE_ENABLED === "true";
}

function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/wallet";
  return next;
}

/** שלב 1: שליחת קוד (ובאימייל גם קישור) */
export async function startOtp(rawIdentifier: string, next?: string | null): Promise<StartResult> {
  const trimmed = rawIdentifier.trim();
  let channel: "email" | "sms"; let identifier: string;
  if (isEmail(trimmed)) { channel = "email"; identifier = trimmed.toLowerCase(); }
  else {
    const p = normalizePhone(trimmed);
    if (!p) return { ok: false, error: "identifier_invalid" };
    if (!phoneAuthEnabled()) return { ok: false, error: "phone_disabled" };
    channel = "sms"; identifier = p;
  }
  const [{ n }] = await asService((tx) => tx`select count(*)::int as n from auth.otp_codes where identifier = ${identifier} and created_at > now() - interval '15 minutes'`);
  if (n >= MAX_PER_WINDOW) return { ok: false, error: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const link = channel === "email" ? randomBytes(24).toString("base64url") : null;
  const [row] = await asService((tx) => tx`
    insert into auth.otp_codes (identifier, channel, code_hash, link_hash, next_path, expires_at)
    values (${identifier}, ${channel}, ${sha256(code)}, ${link ? sha256(link) : null}, ${safeNext(next)}, now() + ${OTP_MINUTES + " minutes"}::interval) returning id`);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (channel === "email") {
    await sendMessage({ channel: "email", to: identifier, subject: `${code} — קוד הכניסה שלך למתנה של נחמה`,
      body: `שלום,\nקוד הכניסה שלך: ${code}\nאו לחצו על הקישור: ${appUrl}/auth/link?token=${link}\nהקוד תקף ל-${OTP_MINUTES} דקות. אם לא ביקשתם להתחבר, התעלמו מהודעה זו.` });
  } else {
    await sendMessage({ channel: "sms", to: identifier, body: `מתנה של נחמה: קוד הכניסה שלך ${code}. תקף ל-${OTP_MINUTES} דקות.` });
  }
  const jar = await cookies();
  jar.set(OTP_COOKIE, row.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: OTP_MINUTES * 60 });
  const masked = channel === "email" ? identifier.replace(/^(.{2}).*(@.*)$/, "$1•••$2") : identifier.replace(/^\+972/, "0").replace(/(\d{3})\d{4}(\d{3})$/, "$1••••$2");
  return { ok: true, channel, identifier, masked };
}

async function finishLogin(otp: { id: string; identifier: string; channel: string; next_path: string | null }) {
  const userId = await asService(async (tx) => {
    await tx`update auth.otp_codes set consumed_at = now() where id = ${otp.id}::uuid`;
    const col = otp.channel === "email" ? "email" : "phone";
    const existing = otp.channel === "email"
      ? await tx`select id from auth.users where email = ${otp.identifier}`
      : await tx`select id from auth.users where phone = ${otp.identifier}`;
    let id: string;
    if (existing.length) {
      id = existing[0].id;
      if (col === "email") await tx`update auth.users set email_verified_at = coalesce(email_verified_at, now()) where id = ${id}::uuid`;
      else await tx`update auth.users set phone_verified_at = coalesce(phone_verified_at, now()) where id = ${id}::uuid`;
    } else {
      const [u] = col === "email"
        ? await tx`insert into auth.users (email, email_verified_at) values (${otp.identifier}, now()) returning id`
        : await tx`insert into auth.users (phone, phone_verified_at) values (${otp.identifier}, now()) returning id`;
      id = u.id;
    }
    await tx`insert into profiles (id) values (${id}::uuid) on conflict do nothing`;
    return id;
  });
  await createSession(userId);
  const jar = await cookies();
  jar.delete(OTP_COOKIE);
  const next = safeNext(otp.next_path);
  if (next !== "/wallet") return next;
  // ללא יעד מפורש: לפי תפקיד
  const [r] = await asService((tx) => tx`select exists (select 1 from user_roles where user_id = ${userId}::uuid and role = 'admin') as admin, exists (select 1 from provider_members where user_id = ${userId}::uuid) as provider`);
  return r.admin ? "/admin" : r.provider ? "/provider" : "/wallet";
}

/** שלב 2: אימות קוד. מחזיר נתיב יעד או שגיאה */
export async function verifyOtpCode(code: string): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const jar = await cookies();
  const id = jar.get(OTP_COOKIE)?.value;
  if (!id) return { ok: false, error: "code_expired" };
  const rows = await asService((tx) => tx`select id, identifier, channel, code_hash, next_path, expires_at, attempts, consumed_at from auth.otp_codes where id = ${id}::uuid`);
  if (!rows.length) return { ok: false, error: "code_expired" };
  const otp = rows[0] as { id: string; identifier: string; channel: string; code_hash: string; next_path: string | null; expires_at: string; attempts: number; consumed_at: string | null };
  if (otp.consumed_at || new Date(otp.expires_at) < new Date()) return { ok: false, error: "code_expired" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };
  const clean = code.replace(/\D/g, "");
  if (sha256(clean) !== otp.code_hash) {
    await asService((tx) => tx`update auth.otp_codes set attempts = attempts + 1 where id = ${id}::uuid`);
    return { ok: false, error: otp.attempts + 1 >= MAX_ATTEMPTS ? "too_many_attempts" : "code_invalid" };
  }
  const next = await finishLogin(otp);
  return { ok: true, next };
}

/** קישור קסם מאימייל */
export async function verifyMagicLink(token: string): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const rows = await asService((tx) => tx`select id, identifier, channel, next_path, expires_at, consumed_at from auth.otp_codes where link_hash = ${sha256(token)}`);
  if (!rows.length) return { ok: false, error: "code_invalid" };
  const otp = rows[0] as { id: string; identifier: string; channel: string; code_hash: string; next_path: string | null; expires_at: string; attempts: number; consumed_at: string | null };
  if (otp.consumed_at || new Date(otp.expires_at) < new Date()) return { ok: false, error: "code_expired" };
  const next = await finishLogin(otp);
  return { ok: true, next };
}
