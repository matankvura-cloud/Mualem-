import type { Metadata } from "next";
import Link from "next/link";
import { asUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { money } from "@/lib/format";
import { VoucherCard, type VoucherRow } from "@/components/wallet/VoucherCard";
import { Alert } from "@/components/ui/Alert";
import { updateNameAction } from "./actions";

export const metadata: Metadata = { title: "הארנק שלי" };
export const dynamic = "force-dynamic";

export default async function WalletPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/wallet");
  if (!user.walletId) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-3xl">עדיין אין כאן ארנק</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">ארנק משפחתי נוצר אוטומטית כשפותחים קישור של שובר שקיבלתם, או כשמצטרפים לארנק של בן משפחה דרך הזמנה.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/catalog" className="btn btn-outline">לרשימת הספקים</Link><Link href="/gift" className="btn btn-navy">שליחת מתנה למשפחה אחרת</Link></div>
        {user.providerId && <p className="mt-6 text-sm"><Link href="/provider" className="underline">לפורטל הספק</Link></p>}
      </div>
    );
  }
  const [wallet] = await asUser(user.id, (tx) => tx`select name_he from wallets where id = ${user.walletId}::uuid`);
  const vouchers = await asUser(user.id, (tx) => tx<VoucherRow[]>`
    select v.id, v.code, v.status, v.balance_agorot, v.initial_agorot, o.buyer_name, v.is_test,
      (select name_he from categories c where c.id = v.scope_category_id) as scope_category
    from vouchers v join orders o on o.id = v.order_id where v.wallet_id = ${user.walletId}::uuid order by v.claimed_at desc`);
  const total = vouchers.filter((v) => v.status === "active").reduce((s, v) => s + Number(v.balance_agorot), 0);
  const recent = await asUser(user.id, (tx) => tx`
    select r.id, r.amount_agorot, r.created_at, r.status, p.display_name from redemptions r join vouchers v on v.id = r.voucher_id join providers p on p.id = r.provider_id
    where v.wallet_id = ${user.walletId}::uuid order by r.created_at desc limit 5`);
  return (
    <div>
      {sp.claimed && <div className="mb-4"><Alert kind="ok">השובר נשמר בארנק. אפשר להתחיל לממש אצל ספקים מאושרים.</Alert></div>}
      {sp.joined && <div className="mb-4"><Alert kind="ok">הצטרפתם לארנק המשפחתי.</Alert></div>}
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-sm text-muted">שלום{user.fullName ? `, ${user.fullName}` : ""}</p><h1 className="text-3xl">{wallet?.name_he}</h1></div>
      </div>
      <div className="mt-5 rounded-2xl bg-navy p-5 text-cream" style={{ backgroundImage: "radial-gradient(220px 140px at 15% 20%, rgba(201,167,91,.35), transparent 70%)" }}>
        <p className="text-sm text-cream/80">יתרה זמינה</p>
        <p className="font-display text-4xl tabular" data-testid="wallet-balance">{money(total)}</p>
        <p className="mt-1 text-xs text-cream/70">{vouchers.filter((v) => v.status === "active").length} שוברים פעילים · למימוש אצל ספקים מאושרים</p>
      </div>
      <h2 className="mt-8 text-xl">השוברים שלי</h2>
      {vouchers.length === 0 ? <p className="mt-2 text-muted">אין שוברים עדיין.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{vouchers.map((v) => <VoucherCard key={v.id} v={v} />)}</div>}
      <h2 className="mt-8 text-xl">מימושים אחרונים</h2>
      {recent.length === 0 ? <p className="mt-2 text-muted">עדיין לא בוצעו מימושים. מראים לספק את קוד השובר, והוא מזין את הסכום.</p> : (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {recent.map((r) => <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm"><span>{r.display_name}{r.status === "reversed" && <span className="badge badge-warn ms-2">בוטל</span>}</span><span className="tabular font-medium">−{money(r.amount_agorot)}</span></li>)}
        </ul>
      )}
      {!user.fullName && (
        <form action={updateNameAction} className="card mt-8 flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[200px]"><label htmlFor="fullName" className="field-label">איך לפנות אליכם? <span className="font-normal text-muted">(לא חובה)</span></label><input id="fullName" name="fullName" className="field" placeholder="שם פרטי" /></div>
          <button className="btn btn-outline btn-sm">שמירה</button>
        </form>
      )}
    </div>
  );
}
