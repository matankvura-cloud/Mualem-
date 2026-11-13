import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyMagicLink } from "@/lib/auth/otp";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { errText } from "../../../../messages/he";

export const metadata: Metadata = { title: "כניסה" };

// הקישור מהאימייל לא מתחבר ב-GET (סורקי קישורים ו-prefetch היו צורכים אותו). הכניסה מתבצעת רק בלחיצה.
async function confirmAction(formData: FormData) {
  "use server";
  const res = await verifyMagicLink(String(formData.get("token") ?? ""));
  if (!res.ok) redirect(`/auth/link?error=${res.error}`);
  redirect(res.next);
}

export default async function LinkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-3xl">כניסה למתנה של נחמה</h1>
      {sp.error ? (
        <><div className="mt-4 text-start"><Alert kind="danger">{errText(sp.error)}</Alert></div><Link href="/login" className="btn btn-navy mt-6">בקשת קוד חדש</Link></>
      ) : sp.token ? (
        <form action={confirmAction} className="mt-6"><input type="hidden" name="token" value={sp.token} /><p className="text-muted">לחצו כדי להשלים את הכניסה מהמכשיר הזה.</p><SubmitButton className="btn btn-primary mt-4 w-full">כניסה</SubmitButton></form>
      ) : (
        <Link href="/login" className="btn btn-navy mt-6">לעמוד הכניסה</Link>
      )}
    </div>
  );
}
