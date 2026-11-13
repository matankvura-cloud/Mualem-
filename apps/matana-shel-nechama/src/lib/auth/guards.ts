import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

export async function requireUser(next: string): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}
export async function requireAdmin(next = "/admin"): Promise<SessionUser> {
  const u = await requireUser(next);
  if (!u.isAdmin) redirect("/login?denied=admin");
  return u;
}
export async function requireProvider(next = "/provider"): Promise<SessionUser & { providerId: string }> {
  const u = await requireUser(next);
  if (!u.providerId) redirect("/provider/none");
  return u as SessionUser & { providerId: string };
}
