import Link from "next/link";
import { requireProvider } from "@/lib/auth/guards";
import { asUser } from "@/lib/db";
import { he } from "../../../../messages/he";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProvider();
  const [p] = await asUser(user.id, (tx) => tx`select display_name, status, is_demo from providers where id = ${user.providerId}::uuid`);
  const tabs = [["/provider", "לוח"], ["/provider/redeem", "מימוש"], ["/provider/services", "שירותים"], ["/provider/benefits", "הטבות"], ["/provider/settlements", "התחשבנות"], ["/provider/profile", "פרופיל"]];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs text-muted">פורטל ספק</p><h1 className="text-2xl">{p?.display_name}</h1></div>
        <div className="flex gap-2">{p?.is_demo && <span className="badge badge-warn">ספק לדוגמה</span>}<span className={`badge ${p?.status === "approved" ? "badge-ok" : "badge-warn"}`}>{he.providerStatus[p?.status]}</span></div>
      </div>
      <nav className="mt-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 text-sm" aria-label="פורטל ספק">
        {tabs.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-full px-4 py-2 hover:bg-cream">{label}</Link>)}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
