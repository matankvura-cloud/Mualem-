// המעטפת של צד המשפחה: סרגל צד במחשב, ניווט תחתון בנייד. לפי ההמחשה.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND, SLOGAN } from '@/lib/site';
import { IcHome, IcFolder, IcCard, IcShop, IcPeople, IcHeadset } from './icons';

export const FAM_NAV = [
  { key: 'home', label: 'הבית שלי', path: '', Icon: IcHome },
  { key: 'file', label: 'התיק המשפחתי', path: '/file', Icon: IcFolder },
  { key: 'card', label: 'כרטיס ותשלומים', path: '/card', Icon: IcCard },
  { key: 'suppliers', label: 'הטבות וספקים', path: '/suppliers', Icon: IcShop },
  { key: 'help', label: 'עזרה מהקרובים', path: '/help', Icon: IcPeople },
  { key: 'support', label: 'ליווי אישי', path: '/support', Icon: IcHeadset },
] as const;
export type FamKey = (typeof FAM_NAV)[number]['key'];

export default function FamilyShell({ manage, active, children }: { manage: string; active: FamKey; children: ReactNode }) {
  const base = `/m/${manage}`;
  return (
    <div className="fam">
      <aside className="fam-side">
        <Link href="/" className="brand">{BRAND}<small>{SLOGAN}</small></Link>
        {FAM_NAV.map((n) => (
          <Link key={n.key} href={base + n.path} className="nav" aria-current={n.key === active ? 'page' : undefined}><n.Icon />{n.label}</Link>
        ))}
        <p className="side-foot">הקישור הזה הוא של המשפחה. לא מעבירים הלאה.</p>
      </aside>
      <main className="fam-main">
        <div className="fam-mobile-brand"><Link href="/" className="brand">{BRAND}</Link><span className="muted">{SLOGAN}</span></div>
        {children}
      </main>
      <nav className="fam-tabs" aria-label="ניווט">
        {FAM_NAV.map((n) => (
          <Link key={n.key} href={base + n.path} aria-current={n.key === active ? 'page' : undefined}><n.Icon />{n.label}</Link>
        ))}
      </nav>
    </div>
  );
}
