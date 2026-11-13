import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asAnon, asUser, dbErrorCode } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LogoMark } from "@/components/site/Logo";
import { errText } from "../../../../messages/he";

export const metadata: Metadata = { title: "קיבלתם מתנה" };

async function claimAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/v/${token}?claim=1`)}`);
  try {
    await asUser(user.id, (tx) => tx`select claim_voucher(${token}, null)`);
  } catch (e) {
    redirect(`/v/${token}?error=${dbErrorCode(e) ?? "generic"}`);
  }
  redirect("/wallet?claimed=1");
}

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params; const sp = await searchParams;
  const gift = (await asAnon((tx) => tx`select peek_claim(${token}) as r`))[0].r;
  const user = await getCurrentUser();
  if (gift && user && sp.claim === "1" && !gift.claimed && !sp.error) {
    try { await asUser(user.id, (tx) => tx`select claim_voucher(${token}, null)`); redirect("/wallet?claimed=1"); }
    catch (e) { if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e; }
  }
  if (!gift) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-2xl">הקישור אינו תקין</h1><p className="mt-2 text-muted">ייתכן שהונפק קישור חדש או שהכתובת שגויה. בקשו מהשולח לשלוח שוב.</p><Link href="/" className="btn btn-outline mt-6">לדף הבית</Link></div>
  );
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card overflow-hidden">
        <div className="bg-navy-deep px-6 py-6 text-cream" style={{ backgroundImage: "radial-gradient(240px 160px at 20% 20%, rgba(201,167,91,.35), transparent 70%)" }}>
          <div className="flex items-center gap-2 text-sm text-cream/80"><LogoMark className="h-5 w-5 text-gold" />מתנה של נחמה</div>
          <h1 className="mt-3 text-2xl">ל{gift.recipient_name},</h1>
          <p className="mt-1 text-cream/80">{gift.buyer_name} שלח/ה לכם מתנה.</p>
          <p className="mt-4 font-display text-4xl tabular">{money(gift.initial_agorot)}</p>
          <p className="text-sm text-cream/70">{gift.scope_category ? `לשירותי ${gift.scope_category}` : "לכל השירותים המשתתפים"}</p>
        </div>
        <div className="space-y-4 p-5">
          {gift.dedication_he && <p className="whitespace-pre-wrap rounded-lg bg-cream-2 p-4 font-display text-[18px] leading-relaxed">{gift.dedication_he}</p>}
          {gift.is_test && <Alert kind="warn">שובר בדיקה ללא ערך כספי.</Alert>}
          {sp.error && <Alert kind="danger">{errText(sp.error)}</Alert>}
          {gift.claimed ? (
            gift.mine ? <Link href="/wallet" className="btn btn-navy w-full">השובר בארנק שלכם ←</Link>
              : <Alert kind="info">השובר כבר נשמר בארנק משפחתי. אם זה הארנק שלכם, התחברו עם אותו מספר או אימייל, או בקשו הזמנה לארנק מבן המשפחה ששמר אותו.</Alert>
          ) : (
            <form action={claimAction}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="btn btn-primary w-full">{user ? "שמירת השובר בארנק שלי" : "שמירה בארנק המשפחתי"}</SubmitButton>
              <p className="mt-2 text-center text-xs text-muted">{user ? "" : "נזדהה בקוד חד-פעמי לנייד או לאימייל. בלי סיסמאות."}</p>
            </form>
          )}
          <p className="text-xs text-muted">מה אפשר לעשות עם השובר? לממש בכמה פעמים אצל ספקים מאושרים: קייטרינג לשבעה, ציוד, עזרה בבית, הנצחה ועוד. <Link href="/catalog" className="underline">לרשימת הספקים</Link>.</p>
        </div>
      </div>
    </div>
  );
}
