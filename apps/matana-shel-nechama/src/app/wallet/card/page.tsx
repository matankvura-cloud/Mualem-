import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { asUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { dateHe } from "@/lib/format";
import { LogoMark } from "@/components/site/Logo";

export const metadata: Metadata = { title: "כרטיס הטבות" };
export const dynamic = "force-dynamic";

export default async function CardPage() {
  const user = await requireUser("/wallet/card");
  if (!user.walletId) redirect("/wallet");
  const [card] = await asUser(user.id, (tx) => tx`select c.card_code, c.status, c.issued_at, w.name_he from benefit_cards c join wallets w on w.id = c.wallet_id where c.wallet_id = ${user.walletId}::uuid`);
  const used = await asUser(user.id, (tx) => tx`select br.created_at, b.title_he, p.display_name from benefit_redemptions br join benefits b on b.id = br.benefit_id join providers p on p.id = br.provider_id join benefit_cards c on c.id = br.card_id where c.wallet_id = ${user.walletId}::uuid order by br.created_at desc`);
  const benefits = await asUser(user.id, (tx) => tx`select b.id, b.title_he, b.terms_he, p.display_name, p.slug, p.is_demo from benefits b join providers p on p.id = b.provider_id where b.status = 'approved' and p.status = 'approved' order by p.display_name`);
  const qr = card ? await QRCode.toString(card.card_code, { type: "svg", margin: 1, color: { dark: "#0F1C33", light: "#FFFFFF" } }) : "";
  return (
    <div>
      <h1 className="text-3xl">כרטיס ההטבות המשפחתי</h1>
      <p className="mt-1 text-muted">חינמי. מציגים לספק משתתף ומקבלים את ההטבה שפרסם. לא כרוך ביתרת שובר.</p>
      {card && (
        <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl bg-navy text-cream shadow-lg" style={{ backgroundImage: "radial-gradient(200px 140px at 85% 10%, rgba(201,167,91,.4), transparent 70%)" }}>
          <div className="flex items-center justify-between p-5"><span className="flex items-center gap-2 font-display"><LogoMark className="h-5 w-5 text-gold" />מתנה של נחמה</span><span className="badge badge-gold">כרטיס הטבות</span></div>
          <div className="flex items-center gap-4 px-5 pb-5">
            <div className="w-[110px] flex-none rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qr }} aria-label="קוד QR של הכרטיס" />
            <div><p className="text-sm text-cream/70">{card.name_he}</p><p className="font-mono text-xl tracking-wider" dir="ltr" data-testid="card-code">{card.card_code}</p><p className="mt-1 text-xs text-cream/60">הונפק {dateHe(card.issued_at)}</p></div>
          </div>
        </div>
      )}
      <h2 className="mt-8 text-xl">הטבות זמינות</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b.id} className="card p-4"><p className="font-medium">{b.title_he}</p><p className="text-sm text-muted">{b.terms_he}</p><p className="mt-2 text-sm"><Link href={`/providers/${b.slug}`} className="underline">{b.display_name}</Link>{b.is_demo && <span className="badge badge-warn ms-2">לדוגמה</span>}</p></li>
        ))}
        {benefits.length === 0 && <li className="text-muted">אין הטבות מאושרות כרגע.</li>}
      </ul>
      {used.length > 0 && (<><h2 className="mt-8 text-xl">הטבות שמומשו</h2><ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white text-sm">{used.map((u, i) => <li key={i} className="flex justify-between px-4 py-3"><span>{u.title_he} · {u.display_name}</span><span className="text-muted">{dateHe(u.created_at)}</span></li>)}</ul></>)}
    </div>
  );
}
