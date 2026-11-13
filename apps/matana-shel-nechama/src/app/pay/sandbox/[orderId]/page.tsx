import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asAnon, dbErrorCode } from "@/lib/db";
import { getCookie, orderCookie, claimCookie, setPrivateCookie, clearDraft } from "@/lib/gift/draft";
import { money } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { LogoMark } from "@/components/site/Logo";

export const metadata: Metadata = { title: "תשלום (הדמיה)" };

async function payAction(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId"));
  const outcome = formData.get("outcome") === "decline" ? "decline" : "approve";
  const token = await getCookie(orderCookie(orderId));
  if (!token) redirect("/gift");
  let res: { status: string; order_no: string; claim_token: string | null };
  try {
    res = (await asAnon((tx) => tx`select sandbox_pay(${orderId}::uuid, ${token}, ${outcome}) as r`))[0].r;
  } catch (e) {
    redirect(`/pay/sandbox/${orderId}?error=${dbErrorCode(e) ?? "generic"}`);
  }
  if (res.claim_token) await setPrivateCookie(claimCookie(orderId), res.claim_token);
  if (res.status === "paid") { await clearDraft(); redirect(`/gift/done/${res.order_no}?o=${orderId}`); }
  redirect(`/pay/sandbox/${orderId}?declined=1`);
}

export default async function SandboxPay({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { orderId } = await params; const sp = await searchParams;
  const token = await getCookie(orderCookie(orderId));
  if (!token) notFound();
  const order = (await asAnon((tx) => tx`select get_buyer_order(${orderId}::uuid, ${token}) as r`))[0].r;
  if (!order) notFound();
  if (order.status === "paid") redirect(`/gift/done/${order.order_no}?o=${orderId}`);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card overflow-hidden">
        <div className="bg-navy-deep px-5 py-4 text-cream">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-display text-lg"><LogoMark className="h-6 w-6 text-gold" />תשלום מאובטח</span><span className="badge badge-gold">סולק הדמיה</span></div>
          <p className="mt-1 text-xs text-cream/70">הזמנה {order.order_no}</p>
        </div>
        <div className="space-y-5 p-5">
          <Alert kind="warn">זהו מסך הדמיה לסביבת הבדיקה. לא מתבצע חיוב, לא נאספים פרטי כרטיס, והשובר שייווצר ללא ערך כספי. בפיילוט יוחלף המסך בטופס מאובטח של ספק סליקה מורשה.</Alert>
          <dl className="divide-y divide-line text-[15px]">
            <div className="flex justify-between py-2"><dt className="text-muted">למי</dt><dd>{order.recipient_name}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-muted">סכום</dt><dd className="tabular text-lg font-medium">{money(order.total_agorot)}</dd></div>
          </dl>
          {order.status === "failed" || sp.declined ? <Alert kind="danger">התשלום נדחה (הדמיה). לא נוצר שובר. אפשר לחזור ולנסות שוב.</Alert> : null}
          {sp.error && <Alert kind="danger">אירעה שגיאה. נסו שוב.</Alert>}
          {order.status === "pending_payment" ? (
            <form action={payAction} className="space-y-2">
              <input type="hidden" name="orderId" value={orderId} />
              <SubmitButton className="btn btn-primary w-full" pendingText="מאשרים…">אישור תשלום (הדמיה)</SubmitButton>
              <button type="submit" name="outcome" value="decline" className="btn btn-outline w-full">הדמיית תשלום שנדחה</button>
            </form>
          ) : (
            <Link href="/gift" className="btn btn-navy w-full">להזמנה חדשה</Link>
          )}
        </div>
      </div>
    </div>
  );
}
