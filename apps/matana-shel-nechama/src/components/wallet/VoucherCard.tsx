import Link from "next/link";
import { money } from "@/lib/format";
import { he } from "../../../messages/he";

export type VoucherRow = { id: string; code: string; status: string; balance_agorot: number; initial_agorot: number; scope_category: string | null; buyer_name: string; is_test: boolean };

export function VoucherCard({ v }: { v: VoucherRow }) {
  const pct = v.initial_agorot ? Math.round((v.balance_agorot / v.initial_agorot) * 100) : 0;
  return (
    <Link href={`/wallet/vouchers/${v.id}`} className="card block p-4 transition-transform hover:-translate-y-0.5" data-testid="voucher-card">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm text-muted">מאת {v.buyer_name}</p><p className="font-display text-2xl tabular">{money(v.balance_agorot)}</p><p className="text-xs text-muted">מתוך {money(v.initial_agorot)} · {v.scope_category ?? "לכל השירותים"}</p></div>
        <span className={`badge ${v.status === "active" ? "badge-ok" : v.status === "redeemed" ? "badge-muted" : "badge-warn"}`}>{he.voucherStatus[v.status]}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div>
    </Link>
  );
}
