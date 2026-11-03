import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { noticesOf } from '@/lib/family';
import FamilyShell from '@/components/FamilyShell';
import { IcBell } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'עדכונים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function UpdatesPage({ params }: Props) {
  const { manage } = await params;
  const { fund } = await loadFamily(manage);
  const base = `/m/${manage}`;
  const notices = await noticesOf(fund, base);
  return (
    <FamilyShell manage={manage} active="updates">
      <header className="fam-head"><div><h1>עדכונים</h1><p>מה קרה ומה מחכה: בקשות, עזרה שנלקחה, טפסים ותזכורות קרובות.</p></div></header>
      <section className="panel">
        <h2><IcBell />עכשיו</h2>
        {notices.length ? <ul className="hits">{notices.map((n) => <li key={n.key} className={`tone-${n.tone}`}><i /><Link href={n.href}><b>{n.text}</b></Link></li>)}</ul> : <p className="muted">שקט. אין משהו שמחכה לכם כרגע.</p>}
      </section>
    </FamilyShell>
  );
}
