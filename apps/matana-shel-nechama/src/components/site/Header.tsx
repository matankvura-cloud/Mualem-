import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "./Logo";
import { he } from "../../../messages/he";
import { logoutAction } from "@/app/login/actions";

export async function Header() {
  const user = await getCurrentUser();
  const links = [
    { href: "/gift", label: he.nav.gift },
    { href: "/catalog", label: he.nav.catalog },
    { href: "/employers", label: he.nav.employers },
    { href: "/join", label: he.nav.join },
  ];
  const portal = user ? (user.isAdmin ? { href: "/admin", label: he.nav.admin } : user.providerId ? { href: "/provider", label: he.nav.provider } : { href: "/wallet", label: he.nav.wallet }) : null;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Logo />
        <nav className="hidden items-center gap-6 text-[15px] md:flex" aria-label="ראשי">
          {links.map((l) => <Link key={l.href} href={l.href} className="text-ink hover:text-navy">{l.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {portal ? (
            <>
              <Link href={portal.href} className="btn btn-outline btn-sm">{portal.label}</Link>
              <form action={logoutAction}><button className="btn btn-quiet text-sm text-muted" type="submit">{he.nav.logout}</button></form>
            </>
          ) : (
            <Link href="/login" className="btn btn-outline btn-sm">{he.nav.login}</Link>
          )}
          <details className="relative md:hidden">
            <summary className="list-none cursor-pointer rounded-lg p-2 hover:bg-cream" aria-label="תפריט">
              <span className="block h-0.5 w-5 bg-navy mb-1" /><span className="block h-0.5 w-5 bg-navy mb-1" /><span className="block h-0.5 w-5 bg-navy" />
            </summary>
            <nav className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-line bg-white p-2 shadow-lg" aria-label="תפריט נייד">
              {links.map((l) => <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 hover:bg-cream">{l.label}</Link>)}
              {portal && <Link href={portal.href} className="block rounded-lg px-3 py-2 hover:bg-cream">{portal.label}</Link>}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
