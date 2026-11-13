import type { Metadata } from "next";
import Link from "next/link";
import { asAnon } from "@/lib/db";
import { CategoryArt } from "@/components/site/CategoryArt";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "הטבות ושירותים" };
export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const categories = await asAnon((tx) => tx`select id, slug, name_he, blurb_he, icon from categories where is_active order by sort_order`);
  const active = categories.find((c) => c.slug === sp.category) ?? null;
  const providers = await asAnon((tx) => tx`
    select p.id, p.slug, p.display_name, p.city, p.service_area, p.description_he, p.kosher_note, p.is_demo,
      (select coalesce(json_agg(c.name_he order by c.sort_order), '[]') from provider_categories pc join categories c on c.id = pc.category_id where pc.provider_id = p.id) as categories,
      (select count(*) from provider_services s where s.provider_id = p.id and s.status = 'approved') as services_count,
      (select min(s.price_agorot) from provider_services s where s.provider_id = p.id and s.status = 'approved' and s.price_agorot is not null) as min_price,
      (select count(*) from benefits b where b.provider_id = p.id and b.status = 'approved') as benefits_count
    from providers p where p.status = 'approved'
      and (${active?.id ?? null}::uuid is null or exists (select 1 from provider_categories pc where pc.provider_id = p.id and pc.category_id = ${active?.id ?? null}::uuid))
    order by p.is_demo, p.display_name`);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">הטבות ושירותים</h1>
      <p className="mt-1 max-w-2xl text-muted">ספקים שנבדקו ואושרו. המחירים וההטבות מוצגים כפי שהספק התחייב להם, וניתן לממש אצלם שוברים של מתנה של נחמה.</p>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="קטגוריות">
        <Link href="/catalog" className={`badge whitespace-nowrap px-3 py-1.5 text-sm ${!active ? "badge-navy" : "bg-white border border-line"}`}>הכול</Link>
        {categories.map((c) => <Link key={c.slug} href={`/catalog?category=${c.slug}`} className={`badge whitespace-nowrap px-3 py-1.5 text-sm ${active?.slug === c.slug ? "badge-navy" : "bg-white border border-line"}`}>{c.name_he}</Link>)}
      </nav>
      {active && <p className="mt-3 text-sm text-muted">{active.blurb_he}</p>}
      {providers.some((p) => p.is_demo) && <p className="mt-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-2 text-sm text-warn">ספקים המסומנים „לדוגמה” הם ספקי הדגמה של סביבת הבדיקה ואינם עסקים אמיתיים.</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <li key={p.id}><Link href={`/providers/${p.slug}`} className="card block overflow-hidden transition-transform hover:-translate-y-0.5">
            <div className="h-28"><CategoryArt icon={iconFor(p.categories[0], categories)} /></div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2"><h2 className="text-lg">{p.display_name}</h2>{p.is_demo && <span className="badge badge-warn flex-none">לדוגמה</span>}</div>
              <p className="text-sm text-muted">{(p.categories as string[]).join(" · ")}{p.city ? ` · ${p.city}` : ""}</p>
              <p className="mt-2 line-clamp-2 text-sm">{p.description_he}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {p.min_price && <span className="badge badge-muted tabular">החל מ-{money(p.min_price)}</span>}
                {Number(p.benefits_count) > 0 && <span className="badge badge-gold">{p.benefits_count} הטבות לכרטיס</span>}
                {p.kosher_note && <span className="badge badge-muted">{p.kosher_note}</span>}
              </div>
            </div>
          </Link></li>
        ))}
        {providers.length === 0 && <li className="text-muted">אין עדיין ספקים מאושרים בקטגוריה זו. <Link href="/join" className="underline">ספקים מוזמנים להצטרף</Link>.</li>}
      </ul>
    </div>
  );
}
function iconFor(name: string | undefined, cats: readonly { name_he?: string; icon?: string | null }[]) { return cats.find((c) => c.name_he === name)?.icon ?? null; }
