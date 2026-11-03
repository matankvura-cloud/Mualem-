// עמוד ספק ציבורי: פרופיל מלא (כמו מדרג), ההטבות, דירוגים, ובקשת הצעה (ליד).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supplierBySlug, liveBenefitsOf, fundByToken, reviewsOf, BUSINESS_TYPES } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { fmtBenefit } from '@/lib/card';
import { FAMILY_BRAND } from '@/lib/site';
import { familyName, fmtDate } from '@/lib/format';
import { SupplierLogo, SupplierBadges, Stars } from '@/components/SupplierHeader';
import LeadForm from '../LeadForm';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ f?: string }> };
const safeDecode = (v: string) => { try { return decodeURIComponent(v); } catch { return v; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await supplierBySlug(safeDecode(slug));
  return s && s.status === 'active' ? { title: `${s.name} · ${s.category}${s.city ? ` · ${s.city}` : ''} · הטבה לכרטיס המשפחה`, description: s.description || `${s.name}, ${s.category}. הטבה למשפחות עם כרטיס המשפחה של ${FAMILY_BRAND}.` } : { title: 'ספק', robots: { index: false } };
}

export default async function SupplierPublic({ params, searchParams }: Props) {
  const { slug } = await params;
  const { f } = await searchParams;
  const sup = await supplierBySlug(safeDecode(slug));
  if (!sup || sup.status !== 'active') notFound();
  const [bens, fund, reviews] = await Promise.all([liveBenefitsOf(sup.id), f && TOKEN_RE.test(f) ? fundByToken(f) : null, reviewsOf(sup.id)]);
  const services = (sup.services || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const site = sup.website ? sup.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  const ig = sup.instagram ? sup.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : null;
  const details: [string, React.ReactNode][] = [
    ['שם מלא', sup.legal_name], ['ח.פ / ע.מ', sup.business_id ? <span dir="ltr">{sup.business_id}</span> : null], ['סוג עסק', sup.business_type ? BUSINESS_TYPES[sup.business_type] : null],
    ['כתובת', sup.address], ['אזורי שירות', sup.areas], ['שעות', sup.hours], ['איש קשר', sup.contact_name],
    ['טלפון', sup.phone ? <a href={`tel:${sup.phone}`} dir="ltr">{sup.phone}</a> : null],
    ['אתר', site ? <a href={sup.website!} target="_blank" rel="noopener" dir="ltr">{site}</a> : null],
    ['אינסטגרם', ig ? <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener" dir="ltr">@{ig}</a> : null],
    ['פייסבוק', sup.facebook ? <a href={/^https?:/.test(sup.facebook) ? sup.facebook : `https://${sup.facebook}`} target="_blank" rel="noopener">פייסבוק</a> : null],
    ['אמצעי תשלום', sup.payment_methods], ['משלוחים', sup.delivery], ['כשרות', sup.kosher],
  ];
  return (
    <div className="fd">
      <div className="topbar"><Link className="fd-back" href={`/suppliers${f ? `?f=${encodeURIComponent(f)}` : ''}`}>&rsaquo; כל הספקים</Link><Link className="brand" href="/">{FAMILY_BRAND}</Link></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <header className="sup-head">
          <SupplierLogo s={sup} size={84} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <h1 className="page-title" style={{ fontSize: 24 }}>{sup.name}</h1>
            <small className="muted">{[sup.category, sup.city || sup.areas].filter(Boolean).join(' · ')}</small>
            <Stars avg={sup.rating_avg} count={sup.rating_count} />
            <SupplierBadges s={sup} />
          </div>
        </header>
        {bens.length ? (
          <section className="panel benefit-hero">
            <h2>ההטבה לכרטיס המשפחה</h2>
            <ul className="checks">{bens.map((b) => <li key={b.id} className="done"><i /><b>{fmtBenefit(b)}</b>{b.kind !== 'gift' ? ` · ${b.title}` : ''}{b.terms ? <><br /><small className="muted">{b.terms}</small></> : null}</li>)}</ul>
            <a className="btn" href="#lead">לקבל הצעה עם ההטבה</a>
          </section>
        ) : null}
        {sup.description ? <section className="panel"><h2>על העסק</h2><p style={{ lineHeight: 1.7 }}>{sup.description}</p></section> : null}
        {services.length ? <section className="panel"><h2>מה מציעים</h2><ul className="checks">{services.map((x) => <li key={x} className="done"><i /> {x}</li>)}</ul></section> : null}
        <section className="panel">
          <h2>פרטי העסק</h2>
          <dl className="details">{details.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {!sup.verified ? <p className="fd-small">הפרטים נמסרו על ידי העסק. ספק "מאומת" הוא ספק שבדקנו את פרטיו.</p> : <p className="fd-small">✓ ספק מאומת: בדקנו את פרטי העסק.</p>}
        </section>
        <section className="panel">
          <h2>מה משפחות אומרות {Number(sup.rating_count) ? <small className="muted" style={{ fontFamily: 'Heebo, Arial, sans-serif', fontWeight: 400 }}>({String(sup.rating_count)})</small> : null}</h2>
          {reviews.length ? <ul className="reviews">{reviews.map((r) => <li key={r.id}><div className="fd-row"><b>{familyName(r.family)}</b><span className="stars"><i aria-hidden>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</i></span></div>{r.text ? <p>{r.text}</p> : null}<small className="muted">{fmtDate(r.created_at)} · משפחה שעבדה עם הספק דרך הכרטיס</small></li>)}</ul>
            : <p className="muted">עדיין אין דירוגים. רק משפחות שעבדו עם הספק דרך הכרטיס יכולות לדרג.</p>}
        </section>
        <section className="panel" id="lead">
          <h2>לקבל הצעה מ{sup.name}</h2>
          <LeadForm supplierId={sup.id} fundToken={fund ? fund.token : null} family={fund ? familyName(fund.display_name) : null} />
        </section>
        {!fund ? <div className="fd-note">אין לכם עדיין כרטיס? <Link href="/card">כרטיס המשפחה</Link> ניתן חינם לכל משפחה שפותחת קופה.</div> : null}
      </div>
      <Footer />
    </div>
  );
}
