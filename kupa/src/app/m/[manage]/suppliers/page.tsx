import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { activeSuppliers, liveBenefits } from '@/lib/funds';
import { SUPPLIERS } from '@/data/suppliers';
import { fmtBenefit } from '@/lib/card';
import FamilyShell from '@/components/FamilyShell';
import { SUP_ICON } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הטבות וספקים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };
type IconKey = keyof typeof SUP_ICON;
const iconOf = (k: string) => SUP_ICON[(k in SUP_ICON ? k : 'meal') as IconKey];

export default async function SuppliersPage({ params }: Props) {
  const { manage } = await params;
  const { fund } = await loadFamily(manage);
  const base = `/m/${manage}`;
  const [sups, bens] = await Promise.all([activeSuppliers(), liveBenefits()]);
  const byId = new Map<string, typeof bens>();
  for (const b of bens) byId.set(b.supplier_id, [...(byId.get(b.supplier_id) || []), b]);
  const real = sups.length > 0;
  return (
    <FamilyShell manage={manage} active="suppliers">
      <header className="fam-head"><div><h1>הטבות וספקים</h1><p>מציגים את הכרטיס אצל ספק משתתף ומקבלים את ההטבה. אפשר גם לבקש תשלום לספק ישירות מהקופה.</p></div></header>
      {!real ? <div className="notice notice-warn" style={{ marginBottom: 14 }}>עדיין אין ספקים משתתפים באזור שלכם. הספקים שלמטה הם להמחשה. אפשר לבקש תשלום לכל ספק, גם כזה שלא ברשימה.</div> : <p className="muted" style={{ marginBottom: 14 }}>לוחצים "לקבל הצעה", הספק חוזר אליכם עם ההטבה. <Link href={`/suppliers?f=${fund.token}`}>למדריך המלא ›</Link></p>}
      <div className="sups">
        {real ? sups.map((s) => { const I = iconOf(s.icon); const bs = byId.get(s.id) || []; return (
          <div className="sup" key={s.id}><div className="img"><I /></div>
            <div className="body"><b>{s.name}</b>
              {bs.length ? bs.map((b) => <span className="benefit" key={b.id} title={b.terms || ''}>{fmtBenefit(b)}{b.kind !== 'gift' ? ` · ${b.title}` : ''}</span>) : <span className="benefit">מקבל את הכרטיס</span>}
              {s.description ? <p>{s.description}</p> : null}
              {s.city || s.phone ? <small className="muted">{[s.city, s.phone].filter(Boolean).join(' · ')}</small> : null}
              <Link className="btn-copper" href={`/suppliers/${s.slug}?f=${fund.token}`}>לקבל הצעה עם ההטבה</Link>
              <Link className="btn-outline" href={`${base}/card?payee=${encodeURIComponent(s.name)}`} style={{ minHeight: 38, fontSize: 13.5 }}>לשלם מהקופה</Link></div></div>); })
        : SUPPLIERS.map((s) => { const I = SUP_ICON[s.icon]; return (
          <div className="sup" key={s.id}><div className="img"><I /></div>
            <div className="body"><b>{s.name}</b><span className="benefit">{s.benefit}</span><p>{s.description}</p>
              <Link className="btn-copper" href={`${base}/card?payee=${encodeURIComponent(s.name)}`}>תשלום בכרטיס</Link></div></div>); })}
      </div>
      <p className="muted" style={{ marginTop: 14 }}>ספק שלא ברשימה? <Link href={`${base}/card`}>בקשו תשלום</Link> עם שם הספק וטלפון, ונסדר את זה מולו.</p>
    </FamilyShell>
  );
}
