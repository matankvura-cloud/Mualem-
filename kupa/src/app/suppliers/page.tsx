// מדריך הספקים הציבורי: ספקים שמקבלים את כרטיס המשפחה, לפי תחום. מאונדקס.
import type { Metadata } from 'next';
import Link from 'next/link';
import { activeSuppliers, liveBenefits } from '@/lib/funds';
import { fmtBenefit } from '@/lib/card';
import { FAMILY_BRAND } from '@/lib/site';
import { SupplierLogo, Stars } from '@/components/SupplierHeader';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ספקים והטבות לכרטיס המשפחה',
  description: 'ספקים שמקבלים את כרטיס המשפחה של אבלות ישראל: קייטרינג לשבעה, מצבות, ציוד, הסעות ועוד, עם הטבה למשפחות.',
};
type Props = { searchParams: Promise<{ f?: string; c?: string }> };

export default async function Directory({ searchParams }: Props) {
  const { f, c } = await searchParams;
  const [sups, bens] = await Promise.all([activeSuppliers(), liveBenefits()]);
  const cats = [...new Set(sups.map((s) => s.category))];
  const shown = c ? sups.filter((s) => s.category === c) : sups;
  const q = f ? `?f=${encodeURIComponent(f)}` : '';
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><Link href="/suppliers/join" className="btn-ghost" style={{ minHeight: 36, fontSize: 13 }}>ספקים: להצטרף</Link></div>
      <section className="land-hero" style={{ padding: '28px 20px' }}>
        <p className="fd-eyebrow">כרטיס המשפחה</p>
        <h1>ספקים שמקבלים את הכרטיס</h1>
        <p>משפחה עם כרטיס המשפחה של {FAMILY_BRAND} מקבלת אצלם הטבה. לוחצים על ספק, מבקשים הצעה, והספק חוזר אליכם.</p>
        <Link className="btn" href="/card" style={{ background: '#fff', color: 'var(--navy)' }}>מה זה כרטיס המשפחה?</Link>
      </section>
      <div className="pad stack" style={{ gap: 16 }}>
        {cats.length > 1 ? <nav className="chips" aria-label="תחומים"><Link href={`/suppliers${q}`} className={!c ? 'on' : ''}>הכול</Link>{cats.map((k) => <Link key={k} href={`/suppliers?c=${encodeURIComponent(k)}${f ? `&f=${encodeURIComponent(f)}` : ''}`} className={c === k ? 'on' : ''}>{k}</Link>)}</nav> : null}
        {shown.length ? (
          <div className="sups">{shown.map((s) => { const bs = bens.filter((b) => b.supplier_id === s.id); return (
            <Link href={`/suppliers/${s.slug}${q}`} className="sup" key={s.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="img" style={{ height: 120 }}><SupplierLogo s={s} size={76} /></div>
              <div className="body"><b>{s.name}{s.verified ? <span className="pill pill-ok" style={{ marginInlineStart: 6, fontSize: 11 }}>✓ מאומת</span> : null}</b><small className="muted">{[s.category, s.city || s.areas].filter(Boolean).join(' · ')}</small>
                <Stars avg={s.rating_avg} count={s.rating_count} />
                {bs.slice(0, 2).map((b) => <span className="benefit" key={b.id}>{fmtBenefit(b)}</span>)}
                {s.description ? <p>{s.description.length > 110 ? `${s.description.slice(0, 110)}…` : s.description}</p> : null}
                <span className="btn-copper" style={{ marginTop: 'auto' }}>לקבל הצעה</span></div></Link>); })}
          </div>
        ) : <div className="fd-note">עדיין אין ספקים בתחום הזה. <Link href="/suppliers/join">ספק? הצטרפו</Link>.</div>}
        <div className="fd-note"><b>ספקים:</b> הצטרפות לרשת חינם, ופניות ממשפחות מגיעות ישירות לוואטסאפ שלכם. <Link href="/suppliers/join">להצטרף</Link>.</div>
      </div>
      <Footer />
    </div>
  );
}
