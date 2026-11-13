import Link from "next/link";
import { he } from "../../../messages/he";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <path d="M20 35s-13-8.2-13-18.3A7.3 7.3 0 0 1 20 12a7.3 7.3 0 0 1 13 4.7C33 26.8 20 35 20 35z" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 6c1.6 2.4 1.6 4.6 0 6.6-1.6-2-1.6-4.2 0-6.6z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ light = false, credit = true }: { light?: boolean; credit?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${light ? "text-cream" : "text-navy"}`} aria-label={he.brand}>
      <LogoMark className="h-8 w-8 text-gold" />
      <span className="leading-tight">
        <span className="block font-display text-[19px] font-medium">{he.brand}</span>
        {credit && <span className={`block text-[10.5px] ${light ? "text-cream/70" : "text-muted"}`}>{he.poweredBy}</span>}
      </span>
    </Link>
  );
}
