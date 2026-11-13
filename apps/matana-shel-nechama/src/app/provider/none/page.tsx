import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
export default async function ProviderNone() {
  const u = await requireUser("/provider");
  if (u.providerId) redirect("/provider");
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl">החשבון אינו משויך לספק</h1>
      <p className="mt-2 text-muted">אם הגשתם בקשת הצטרפות, הגישה תיפתח לאחר אישור, עם האימייל שציינתם בבקשה. אם טרם הגשתם, אפשר להצטרף כאן.</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/join" className="btn btn-navy">בקשת הצטרפות</Link><Link href="/" className="btn btn-outline">לדף הבית</Link></div>
    </div>
  );
}
