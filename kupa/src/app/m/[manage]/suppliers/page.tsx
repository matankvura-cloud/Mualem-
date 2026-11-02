import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { SUPPLIERS } from '@/data/suppliers';
import FamilyShell from '@/components/FamilyShell';
import { SUP_ICON } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הטבות וספקים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function SuppliersPage({ params }: Props) {
  const { manage } = await params;
  await loadFamily(manage);
  const base = `/m/${manage}`;
  return (
    <FamilyShell manage={manage} active="suppliers">
      <header className="fam-head"><div><h1>הטבות וספקים</h1><p>ספקים שמקבלים את כרטיס המשפחה. התשלום יוצא מהקופה אחרי אישור, בלי שתצטרכו להוציא כסף מהכיס.</p></div></header>
      {SUPPLIERS.some((s) => s.example) ? <div className="notice notice-warn" style={{ marginBottom: 14 }}>הספקים המסומנים "הסדר לדוגמה" הם להמחשה, עד שייחתמו הסדרים. אפשר לבקש תשלום לכל ספק, גם כזה שלא ברשימה.</div> : null}
      <div className="sups">{SUPPLIERS.map((s) => { const I = SUP_ICON[s.icon]; return (
        <div className="sup" key={s.id}><div className="img"><I /></div>
          <div className="body"><b>{s.name}</b><span className="benefit">{s.benefit}</span><p>{s.description}</p>
            {s.city || s.phone ? <small className="muted">{[s.city, s.phone].filter(Boolean).join(' · ')}</small> : null}
            <Link className="btn-copper" href={`${base}/card?payee=${encodeURIComponent(s.name)}`}>תשלום בכרטיס</Link></div></div>); })}
      </div>
      <p className="muted" style={{ marginTop: 14 }}>ספק שלא ברשימה? <Link href={`${base}/card`}>בקשו תשלום</Link> עם שם הספק וטלפון, ונסדר את זה מולו.</p>
    </FamilyShell>
  );
}
