import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { createInviteAction, removeMemberAction } from "../actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { errText } from "../../../../messages/he";

export const metadata: Metadata = { title: "בני משפחה" };
export const dynamic = "force-dynamic";

export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/wallet/share");
  if (!user.walletId) redirect("/wallet");
  const members = await asUser(user.id, (tx) => tx`select wm.user_id, wm.role, wm.created_at, p.full_name from wallet_members wm left join profiles p on p.id = wm.user_id where wm.wallet_id = ${user.walletId}::uuid order by wm.created_at`);
  const me = members.find((m) => m.user_id === user.id);
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const inviteUrl = sp.token ? `${base}/wallet/join/${sp.token}` : null;
  return (
    <div>
      <h1 className="text-3xl">בני משפחה בארנק</h1>
      <p className="mt-1 text-muted">כל מי שמצורף רואה את השוברים ויכול להציג אותם לספק. הסרה אפשרית בכל רגע.</p>
      {sp.error && <div className="mt-4"><Alert kind="danger">{errText(sp.error)}</Alert></div>}
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-white">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{m.full_name ?? "בן/בת משפחה"}{m.user_id === user.id && " (אני)"} <span className="badge badge-muted ms-1">{m.role === "owner" ? "מנהל/ת" : "חבר/ה"}</span></span>
            {me?.role === "owner" && m.user_id !== user.id && <form action={removeMemberAction}><input type="hidden" name="userId" value={m.user_id} /><button className="btn btn-danger btn-sm">הסרה</button></form>}
          </li>
        ))}
      </ul>
      <section className="card mt-6 p-5">
        <h2 className="text-xl">הזמנת בן משפחה</h2>
        {inviteUrl ? (
          <div className="mt-3 space-y-3">
            <Alert kind="ok">נוצר קישור הזמנה. תקף 7 ימים, לשימוש חד-פעמי. שלחו אותו ישירות לבן המשפחה.</Alert>
            <div className="rounded-xl border border-line bg-cream-2 p-3 text-[13px]" dir="ltr"><span className="break-all font-mono" data-testid="invite-url">{inviteUrl}</span></div>
            <div className="flex flex-wrap gap-2"><a href={`https://wa.me/?text=${encodeURIComponent(`הצטרפו לארנק המשפחתי שלנו במתנה של נחמה: ${inviteUrl}`)}`} target="_blank" rel="noopener" className="btn btn-primary btn-sm">שליחה בוואטסאפ</a><CopyButton text={inviteUrl} /></div>
          </div>
        ) : (
          <form action={createInviteAction} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1"><label htmlFor="label" className="field-label">למי ההזמנה? <span className="font-normal text-muted">(לתיעוד)</span></label><input id="label" name="label" className="field" placeholder="למשל: אמא" /></div>
            <SubmitButton className="btn btn-navy">יצירת קישור הזמנה</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
