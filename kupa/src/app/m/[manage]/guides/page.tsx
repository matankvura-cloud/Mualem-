import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { GUIDES } from '@/data/guides';
import { RIGHTS } from '@/data/documents';
import FamilyShell from '@/components/FamilyShell';
import GuideTile from '@/components/GuideTile';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'מדריכים וזכויות', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function GuidesPage({ params }: Props) {
  const { manage } = await params;
  await loadFamily(manage);
  const base = `/m/${manage}`;
  return (
    <FamilyShell manage={manage} active="guides">
      <header className="fam-head"><div><h1>מדריכים וזכויות</h1><p>ארבעה מדריכים קצרים לפי השלב שאתם בו, והקישורים לגורמים הרשמיים. מה שלא ברור, שואלים את הליווי.</p></div></header>
      <section className="panel" style={{ marginBottom: 18 }}>
        <h2>מדריכים למשפחה</h2>
        <div className="guide-grid">{GUIDES.map((g) => <GuideTile key={g.key} guide={g} href={`${base}/guides/${g.key}`} />)}</div>
      </section>
      <section className="panel">
        <h2>הזכויות שמגיעות, אצל הגורם הרשמי</h2>
        <p className="muted" style={{ marginBottom: 8 }}>מה מגיע בפועל נקבע אצלם. אנחנו עוזרים להגיע לשם, ובמסך "מסמכים וחתימות" אפשר לבקש שנברר בשמכם.</p>
        <ul className="kinds">{RIGHTS.map((r) => (
          <li key={r.url}><i /><div><b>{r.name}</b><small>{r.who} · {r.text}</small><a href={r.url} target="_blank" rel="noopener">לשירות ›</a></div></li>))}</ul>
      </section>
    </FamilyShell>
  );
}
