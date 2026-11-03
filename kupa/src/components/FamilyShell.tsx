// המעטפת של מרכז המשפחה "לצידכם": סרגל צד במחשב, שורת חיפוש והתראות למעלה,
// ניווט תחתון בנייד. לפי ההמחשה המאושרת.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FAMILY_BRAND, HOME_URL, PRODUCT } from '@/lib/site';
import { fundByManage } from '@/lib/funds';
import { noticesOf } from '@/lib/family';
import { TOKEN_RE } from '@/lib/tokens';
import { IcHome, IcCard, IcShop, IcPeople, IcHeadset, IcBook, IcCalendar, IcSign, IcBell, IcSearch, IcUser, IcLeaf } from './icons';

export const FAM_NAV = [
  { key: 'home', label: 'הבית שלי', path: '', Icon: IcHome },
  { key: 'card', label: 'כרטיס המשפחה', path: '/card', Icon: IcCard },
  { key: 'guides', label: 'מדריכים וזכויות', path: '/guides', Icon: IcBook },
  { key: 'file', label: 'מסמכים וחתימות', path: '/file', Icon: IcSign },
  { key: 'now', label: 'משימות ותזכורות', path: '/now', Icon: IcCalendar },
  { key: 'suppliers', label: 'ספקים והטבות', path: '/suppliers', Icon: IcShop },
  { key: 'help', label: 'עזרה מהקרובים', path: '/help', Icon: IcPeople },
  { key: 'support', label: 'ליווי אישי', path: '/support', Icon: IcHeadset },
] as const;
export type FamKey = (typeof FAM_NAV)[number]['key'] | 'assistant' | 'search' | 'updates';

export default async function FamilyShell({ manage, active, children }: { manage: string; active: FamKey; children: ReactNode }) {
  const base = `/m/${manage}`;
  const fund = TOKEN_RE.test(manage) ? await fundByManage(manage) : null;
  const notices = fund ? await noticesOf(fund, base) : [];
  return (
    <div className="fam">
      <aside className="fam-side">
        <a href={HOME_URL} className="brand"><span className="brand-leaf"><IcLeaf /></span>{FAMILY_BRAND}<small>{PRODUCT}</small></a>
        {FAM_NAV.map((n) => (
          <Link key={n.key} href={base + n.path} className="nav" aria-current={n.key === active ? 'page' : undefined}><n.Icon />{n.label}</Link>
        ))}
        <p className="side-foot">הקישור הזה הוא של המשפחה. לא מעבירים הלאה.</p>
      </aside>
      <main className="fam-main">
        <div className="fam-top">
          <div className="fam-mobile-brand"><a href={HOME_URL} className="brand">{PRODUCT}<small>{FAMILY_BRAND}</small></a></div>
          <form className="fam-search" action={`${base}/search`} method="get" role="search">
            <IcSearch /><input type="search" name="q" placeholder="חיפוש מדריכים, זכויות, שירותים…" aria-label="חיפוש" maxLength={120} />
          </form>
          <Link className="fam-bell" href={`${base}/updates`} aria-label={notices.length ? `${notices.length} עדכונים` : 'עדכונים'}>
            <IcBell />{notices.length ? <b>{notices.length}</b> : null}
          </Link>
          <Link className="fam-user" href={`${base}/file#details`} aria-label="פרטי המשפחה"><IcUser /></Link>
        </div>
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
