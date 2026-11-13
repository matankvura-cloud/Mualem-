import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asAnon } from "@/lib/db";
import { getCookie, orderCookie, claimCookie, setPrivateCookie } from "@/lib/gift/draft";
import { money, dateHe } from "@/lib/format";
import { ShareClaim } from "@/components/gift/ShareClaim";
import { Alert } from "@/components/ui/Alert";
import { he } from "../../../../../messages/he";

export const metadata: Metadata = { title: "ההזמנה הושלמה" };

async function regenerateAction(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId")); const orderNo = String(formData.get("orderNo"));
  const token = await getCookie(orderCookie(orderId));
  if (!token) redirect("/gift");
  const r = (await asAnon((tx) => tx`select regenerate_claim_token(${orderId}::uuid, ${token}) as r`))[0].r;
  await setPrivateCookie(claimCookie(orderId), r.claim_token);
  redirect(`/gift/done/${orderNo}?o=${orderId}`);
}

export default async function GiftDone({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { orderNo } = await params; const sp = await searchParams;
  const orderId = sp.o ?? "";
  const token = orderId ? await getCookie(orderCookie(orderId)) : null;
  if (!token) notFound();
  const order = (await asAnon((tx) => tx`select get_buyer_order(${orderId}::uuid, ${token}) as r`))[0].r;
  if (!order || order.order_no !== orderNo) notFound();
  const claim = await getCookie(claimCookie(orderId));
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const claimUrl = claim ? `${base}/v/${claim}` : null;
  const v = order.voucher;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold-soft text-2xl text-gold-ink">✓</span>
        <h1 className="mt-4 text-3xl">ההזמנה הושלמה</h1>
        <p className="mt-1 text-muted">מספר הזמנה <bdi className="font-medium text-ink">{order.order_no}</bdi> · {dateHe(order.created_at, true)}</p>
      </div>
      {order.is_test && <div className="mt-6"><Alert kind="warn">שובר בדיקה. לא בוצע חיוב ואין לו ערך כספי.</Alert></div>}

      <section className="card mt-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm text-muted">מתנה ל{order.recipient_name}</p><p className="font-display text-3xl tabular">{money(order.amount_agorot)}</p><p className="text-sm text-muted">{order.scope_category ?? "לכל השירותים"}</p></div>
          <span className={`badge ${v?.status === "active" ? "badge-ok" : "badge-gold"}`}>{v ? (v.status === "pending" ? "ממתין לשמירה בארנק" : he.voucherStatus[v.status]) : "—"}</span>
        </div>
        {order.dedication_he && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-cream-2 p-3 font-display text-[17px]">{order.dedication_he}</p>}
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="text-xl">עכשיו שולחים למשפחה</h2>
        {v?.status !== "pending" ? (
          <p className="mt-2 text-[15px] text-ok">המשפחה כבר שמרה את השובר בארנק שלה ({dateHe(v?.claimed_at, true)}). אין צורך לשלוח שוב.</p>
        ) : claimUrl ? (
          <>
            <p className="mt-1 text-[15px] text-muted">זהו קישור אישי. מי שפותח אותו יכול לשמור את השובר בארנק המשפחתי, לכן שלחו אותו ישירות לבן משפחה.</p>
            <div className="mt-4"><ShareClaim url={claimUrl} recipientName={order.recipient_name} buyerName={order.buyer_name} /></div>
          </>
        ) : (
          <form action={regenerateAction} className="mt-3">
            <input type="hidden" name="orderId" value={orderId} /><input type="hidden" name="orderNo" value={orderNo} />
            <p className="text-[15px] text-muted">הקישור לא נשמר בדפדפן הזה. אפשר להנפיק קישור חדש; הקודם יתבטל.</p>
            <button className="btn btn-navy mt-3">הנפקת קישור חדש</button>
          </form>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/gift" className="btn btn-outline">שליחת מתנה נוספת</Link>
        <Link href="/" className="btn btn-quiet">לדף הבית</Link>
      </div>
      <p className="mt-6 text-xs text-muted">שמרו את העמוד הזה. הוא נגיש מהדפדפן הזה למשך 30 יום. לשאלות: <Link href="/contact" className="underline">יצירת קשר</Link>.</p>
    </div>
  );
}
