import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const tabs = [["/admin", "לוח"], ["/admin/providers", "ספקים"], ["/admin/catalog", "קטלוג"], ["/admin/orders", "הזמנות"], ["/admin/vouchers", "שוברים"], ["/admin/redemptions", "מימושים"], ["/admin/issues", "פניות"], ["/admin/audit", "יומן"], ["/admin/settings", "הגדרות"]];
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between"><div><p className="text-xs text-muted">ניהול מערכת</p><h1 className="text-2xl">מתנה של נחמה</h1></div></div>
      <nav className="mt-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 text-sm" aria-label="ניהול">{tabs.map(([h, l]) => <Link key={h} href={h} className="whitespace-nowrap rounded-full px-4 py-2 hover:bg-cream">{l}</Link>)}</nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
