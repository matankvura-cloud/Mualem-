"use server";
import { redirect } from "next/navigation";
import { startOtp, verifyOtpCode } from "@/lib/auth/otp";
import { destroySession } from "@/lib/auth/session";

export async function startLoginAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "");
  const next = String(formData.get("next") ?? "");
  const res = await startOtp(identifier, next);
  const q = new URLSearchParams({ next });
  if (!res.ok) { q.set("error", res.error); redirect(`/login?${q}`); }
  q.set("step", "verify"); q.set("to", res.masked); q.set("ch", res.channel);
  redirect(`/login?${q}`);
}

export async function verifyCodeAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "");
  const to = String(formData.get("to") ?? ""); const ch = String(formData.get("ch") ?? "");
  const res = await verifyOtpCode(code);
  if (!res.ok) redirect(`/login?${new URLSearchParams({ step: "verify", next, to, ch, error: res.error })}`);
  redirect(res.next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
