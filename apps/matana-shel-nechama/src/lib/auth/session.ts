import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { asService } from "@/lib/db";

export const SESSION_COOKIE = "mn_session";
const SESSION_DAYS = 30;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type SessionUser = {
  id: string; email: string | null; phone: string | null; fullName: string | null;
  roles: string[]; walletId: string | null; providerId: string | null; isAdmin: boolean;
};

/** המשתמש המחובר בבקשה הנוכחית (cache לכל בקשה) */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [id, secret] = raw.split(".");
  if (!id || !secret) return null;
  const rows = await asService((tx) => tx`
    select u.id, u.email, u.phone, p.full_name,
      coalesce((select array_agg(role::text) from user_roles r where r.user_id = u.id), '{}') as roles,
      (select wallet_id from wallet_members wm where wm.user_id = u.id order by created_at limit 1) as wallet_id,
      (select provider_id from provider_members pm where pm.user_id = u.id order by created_at limit 1) as provider_id
    from auth.sessions s join auth.users u on u.id = s.user_id left join profiles p on p.id = u.id
    where s.id = ${id}::uuid and s.token_hash = ${sha256(secret)} and s.revoked_at is null and s.expires_at > now()`);
  if (rows.length === 0) return null;
  const r = rows[0];
  // עדכון last_seen לא חוסם
  asService((tx) => tx`update auth.sessions set last_seen_at = now() where id = ${id}::uuid and last_seen_at < now() - interval '10 minutes'`).catch(() => {});
  const roles: string[] = r.roles ?? [];
  return { id: r.id, email: r.email, phone: r.phone, fullName: r.full_name, roles, walletId: r.wallet_id, providerId: r.provider_id, isAdmin: roles.includes("admin") };
});

export async function createSession(userId: string) {
  const secret = randomBytes(32).toString("base64url");
  const h = await headers();
  const ua = h.get("user-agent")?.slice(0, 200) ?? null;
  const [s] = await asService((tx) => tx`
    insert into auth.sessions (user_id, token_hash, user_agent, expires_at)
    values (${userId}::uuid, ${sha256(secret)}, ${ua}, now() + ${SESSION_DAYS + " days"}::interval) returning id`);
  await asService((tx) => tx`update auth.users set last_sign_in_at = now() where id = ${userId}::uuid`);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${s.id}.${secret}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const [id] = raw.split(".");
    if (id) await asService((tx) => tx`update auth.sessions set revoked_at = now() where id = ${id}::uuid`).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}
