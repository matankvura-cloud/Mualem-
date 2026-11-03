// עמוד ספק ציבורי: ההטבות, הפרטים, ובקשת הצעה (ליד).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supplierBySlug, liveBenefitsOf, fundByToken } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { fmtBenefit } from '@/lib/card';
import { FAMILY_BRAND } from '@/lib/site';
import { familyName } from '@/lib/format';
import { SUP_ICON } from '@/components/icons';
import LeadForm from '../LeadForm';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ f?: string }> };
type IconKey = keyof typeof SUP_ICON;
const safeDecode = (v: string) => { try { return decodeURIComponent(v); } catch { return v; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await supplierBySlug(safeDecode(slug));
  return s && s.status === 'active' ? { title: `${s.name} · הטבה לכרטיס המשפחה`, description: s.description || `${s.name}, ${s.category}. הטבה למשפחות עם כרטיס המשפחה של ${FAMILY_BRAND}.` } : { title: 'ספק', robots: { index: false } };
}

export default async function SupplierPublic({ params, searchParams }: Props) {
  const { slug } = await params;
  const { f } = await searchParams;
  const sup = await supplierBySlug(safeDecode(slug));
  if (!sup || sup.status !== 'active') notFound();
  const [bens, fund] = await Promise.all([liveBenefitsOf(sup.id), f && TOKEN_RE.test(f) ? fundByToken(f) : null]);
  const I = SUP_ICON[(sup.icon in SUP_ICON ? sup.icon : 'meal') as IconKey];
  return (
    <div className="fd">
      <div className="topbar"><Link className="fd-back" href={`/suppliers${f ? `?f=${encodeURIComponent(f)}` : ''}`}>&rsaquo; כל הספקים</Link><Link className="brand" href="/">{FAMILY_BRAND}</Link></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div className="sup" style={{ flexDirection: 'row', alignItems: 'center' }}><div className="img" style={{ width: 96, height: 96, flex: 'none' }}><I /></div>
          <div className="body"><h1 className="page-title" style={{ fontSize: 22 }}>{sup.name}</h1><small className="muted">{[sup.category, sup.city].filter(Boolean).join(' · ')}</small></div></div>
        {sup.description ? <p className="lead">{sup.description}</p> : null}
        <section className="panel">
          <h2>ההטבה לכרטיס המשפחה</h2>
          {bens.length ? <ul className="checks">{bens.map((b) => <li key={b.id} className="done"><i /><b>{fmtBenefit(b)}</b>{b.kind !== 'gift' ? ` · ${b.title}` : ''}{b.terms ? <><br /><small className="muted">{b.terms}</small></> : null}</li>)}</ul> : <p className="muted">הספק מקבל את הכרטיס. פרטי ההטבה בתיאום.</p>}
        </section>
        <section className="panel">
          <h2>לקבל הצעה מ{sup.name}</h2>
          <LeadForm supplierId={sup.id} fundToken={fund ? fund.token : null} family={fund ? familyName(fund.display_name) : null} />
        </section>
        {sup.phone ? <p className="muted">או ישירות: <a href={`tel:${sup.phone}`} dir="ltr">{sup.phone}</a>. אמרו שאתם עם כרטיס המשפחה.</p> : null}
        {!fund ? <div className="fd-note">אין לכם עדיין כרטיס? <Link href="/card">כרטיס המשפחה</Link> ניתן חינם לכל משפחה שפותחת קופה.</div> : null}
      </div>
      <Footer />
    </div>
  );
}
