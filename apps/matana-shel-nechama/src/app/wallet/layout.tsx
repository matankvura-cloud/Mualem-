import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";

export default async function WalletLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/wallet");
  const tabs = [["/wallet", "הארנק"], ["/wallet/card", "כרטיס הטבות"], ["/wallet/share", "בני משפחה"], ["/catalog", "ספקים"]];
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {user.walletId && (
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 text-sm" aria-label="ארנק">
          {tabs.map(([href, label]) => <Link key={href} href={href} className="flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center hover:bg-cream">{label}</Link>)}
        </nav>
      )}
      {children}
    </div>
  );
}
