// המעטפת של צד המשפחה: סרגל צד במחשב, ניווט תחתון בנייד. לפי ההמחשה.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FAMILY_BRAND, SLOGAN, HOME_URL } from '@/lib/site';
import { IcHome, IcFolder, IcCard, IcShop, IcPeople, IcHeadset, IcChat } from './icons';

export const FAM_NAV = [
  { key: 'home', label: 'הבית שלי', path: '', Icon: IcHome },
  { key: 'assistant', label: 'העוזר', path: '/assistant', Icon: IcChat },
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
        <a href={HOME_URL} className="brand">{FAMILY_BRAND}<small>{SLOGAN}</small></a>
        {FAM_NAV.map((n) => (
          <Link key={n.key} href={base + n.path} className="nav" aria-current={n.key === active ? 'page' : undefined}><n.Icon />{n.label}</Link>
        ))}
        <p className="side-foot">הקישור הזה הוא של המשפחה. לא מעבירים הלאה.</p>
      </aside>
      <main className="fam-main">
        <div className="fam-mobile-brand"><a href={HOME_URL} className="brand">{FAMILY_BRAND}</a><span className="muted">{SLOGAN}</span></div>
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
