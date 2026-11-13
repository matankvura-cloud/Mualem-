import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asAnon, asUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "יצירת קשר" };

async function contactAction(formData: FormData) {
  "use server";
  const text = String(formData.get("text") ?? "").trim(); const contact = String(formData.get("contact") ?? "").trim(); const kind = String(formData.get("kind") ?? "contact");
  if (!text || !contact) redirect("/contact?error=1");
  const user = await getCurrentUser();
  const run = (tx: Parameters<Parameters<typeof asAnon>[0]>[0]) => tx`select report_issue(${["bug", "redemption", "refund", "provider", "contact", "other"].includes(kind) ? kind : "contact"}, ${text}, ${contact})`;
  if (user) await asUser(user.id, run); else await asAnon(run);
  redirect("/contact?sent=1");
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl">יצירת קשר</h1>
      <p className="mt-2 text-muted">שאלה על שובר, בעיה במימוש או פנייה כללית. נענה בהקדם.</p>
      {sp.sent ? <div className="mt-6"><Alert kind="ok">הפנייה נקלטה. תודה.</Alert></div> : (
        <form action={contactAction} className="card mt-6 space-y-4 p-5">
          <div><label className="field-label" htmlFor="kind">נושא</label><select id="kind" name="kind" className="field"><option value="contact">פנייה כללית</option><option value="redemption">בעיה במימוש שובר</option><option value="refund">ביטול או החזר</option><option value="provider">פנייה של ספק</option><option value="bug">תקלה באתר</option></select></div>
          <div><label className="field-label" htmlFor="contact">איך לחזור אליכם (טלפון או אימייל)</label><input id="contact" name="contact" className="field" dir="ltr" required /></div>
          <div><label className="field-label" htmlFor="text">הפנייה</label><textarea id="text" name="text" rows={5} className="field" required /></div>
          {sp.error && <Alert kind="danger">יש למלא את כל השדות.</Alert>}
          <SubmitButton className="btn btn-navy">שליחה</SubmitButton>
        </form>
      )}
    </div>
  );
}
