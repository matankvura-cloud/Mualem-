import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asAnon } from "@/lib/db";
import { money } from "@/lib/format";
import { CategoryArt } from "@/components/site/CategoryArt";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const [p] = await asAnon((tx) => tx`select display_name from providers where slug = ${slug} and status = 'approved'`);
  return { title: p?.display_name ?? "ספק" };
}

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug);   // slug עשוי להכיל עברית
  const [p] = await asAnon((tx) => tx`select * from providers where slug = ${slug} and status = 'approved'`);
  if (!p) notFound();
  const cats = await asAnon((tx) => tx`select c.name_he, c.icon, c.slug from provider_categories pc join categories c on c.id = pc.category_id where pc.provider_id = ${p.id}::uuid order by c.sort_order`);
  const services = await asAnon((tx) => tx`select s.*, c.name_he as category from provider_services s join categories c on c.id = s.category_id where s.provider_id = ${p.id}::uuid and s.status = 'approved' order by s.sort_order, s.created_at`);
  const benefits = await asAnon((tx) => tx`select * from benefits where provider_id = ${p.id}::uuid and status = 'approved' order by created_at`);
  const phoneDisplay = p.phone_e164?.replace(/^\+972/, "0");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/catalog" className="text-sm text-muted hover:text-ink">→ כל הספקים</Link>
      <div className="card mt-3 overflow-hidden">
        <div className="h-36"><CategoryArt icon={cats[0]?.icon ?? null} /></div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="text-3xl">{p.display_name}</h1><p className="text-muted">{cats.map((c) => c.name_he).join(" · ")}{p.city ? ` · ${p.city}` : ""}{p.service_area ? ` · ${p.service_area}` : ""}</p></div>
            <div className="flex gap-2">{p.is_demo && <span className="badge badge-warn">ספק לדוגמה</span>}<span className="badge badge-ok">מאושר למימוש שוברים</span></div>
          </div>
          {p.description_he && <p className="mt-4 whitespace-pre-wrap">{p.description_he}</p>}
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {p.kosher_note && <div><dt className="text-muted">כשרות</dt><dd>{p.kosher_note}</dd></div>}
            {phoneDisplay && <div><dt className="text-muted">טלפון</dt><dd dir="ltr" className="text-start"><a href={`tel:${p.phone_e164}`} className="underline">{phoneDisplay}</a></dd></div>}
            {p.whatsapp_e164 && <div><dt className="text-muted">וואטסאפ</dt><dd><a href={`https://wa.me/${p.whatsapp_e164.replace("+", "")}`} className="underline" target="_blank" rel="noopener">פתיחת שיחה</a></dd></div>}
            {p.website && <div><dt className="text-muted">אתר</dt><dd><a href={p.website} className="underline break-all" target="_blank" rel="noopener" dir="ltr">{p.website}</a></dd></div>}
          </dl>
        </div>
      </div>

      <h2 className="mt-8 text-2xl">שירותים ומחירים</h2>
      <p className="text-sm text-muted">מחירים כפי שאושרו על ידי הספק. ההזמנה והתיאום נעשים ישירות מול הספק; התשלום בשובר מתבצע במעמד המימוש.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.id} className="card p-4"><div className="flex items-start justify-between gap-3"><p className="font-medium">{s.title_he}</p><p className="tabular whitespace-nowrap font-medium">{s.price_agorot != null ? money(s.price_agorot) : ""}</p></div>{s.description_he && <p className="mt-1 text-sm text-muted">{s.description_he}</p>}<p className="mt-1 text-xs text-muted">{s.category}{s.price_note_he ? ` · ${s.price_note_he}` : ""}</p></li>
        ))}
        {services.length === 0 && <li className="text-muted">הספק טרם פרסם שירותים מאושרים.</li>}
      </ul>

      {benefits.length > 0 && (<>
        <h2 className="mt-8 text-2xl">הטבות למחזיקי כרטיס ההטבות</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">{benefits.map((b) => <li key={b.id} className="card border-gold/40 p-4"><p className="font-medium">{b.title_he}</p><p className="text-sm text-muted">{b.terms_he}</p></li>)}</ul>
      </>)}

      <div className="mt-8 rounded-2xl bg-navy p-5 text-cream">
        <p className="font-display text-xl">רוצים לעזור למשפחה דרך הספק הזה?</p>
        <p className="mt-1 text-sm text-cream/80">שלחו שובר של מתנה של נחמה. המשפחה תבחר בעצמה מה לממש, כאן או אצל ספקים אחרים.</p>
        <Link href="/gift" className="btn btn-primary mt-4">שליחת מתנה</Link>
      </div>
    </div>
  );
}
