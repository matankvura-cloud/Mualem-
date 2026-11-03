import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadFamily } from '../../_shared';
import { GUIDES, guideByKey } from '@/data/guides';
import { CONTACT_PHONE } from '@/lib/site';
import { familyName } from '@/lib/format';
import FamilyShell from '@/components/FamilyShell';
import GuideTile from '@/components/GuideTile';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ manage: string; key: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const g = guideByKey(key);
  return { title: g ? g.title : 'מדריך', robots: { index: false, follow: false } };
}

export default async function GuidePage({ params }: Props) {
  const { manage, key } = await params;
  const { fund } = await loadFamily(manage);
  const g = guideByKey(key);
  if (!g) notFound();
  const base = `/m/${manage}`;
  const others = GUIDES.filter((x) => x.key !== g.key);
  return (
    <FamilyShell manage={manage} active="guides">
      <Link className="fd-back" href={`${base}/guides`}>&rsaquo; כל המדריכים</Link>
      <header className={`guide-head tone-${g.tone}`}><small>{g.when}</small><h1>{g.title}</h1><p>{g.lead}</p></header>
      <article className="guide">
        {g.sections.map((s) => (
          <section key={s.h} className="panel">
            <h2>{s.h}</h2>
            {s.p ? <p>{s.p}</p> : null}
            {s.items ? <ul className="checks">{s.items.map((it) => <li key={it}><i /> {it}</li>)}</ul> : null}
            {s.links ? <div className="fd-actions">{s.links.map((l) => <a key={l.url} className="btn-outline" href={l.url} target="_blank" rel="noopener" style={{ width: 'auto' }}>{l.label} ›</a>)}</div> : null}
          </section>
        ))}
        <section className="panel guide-cta">
          <h2>לא בטוחים מה נכון אצלכם?</h2>
          <p className="muted">הרכז/ת האישי/ת של {familyName(fund.display_name)} עונה על השאלות, או העוזר, בכל שעה.</p>
          <div className="fd-actions">
            {CONTACT_PHONE ? <a className="btn-copper" href={`tel:${CONTACT_PHONE}`} style={{ width: 'auto' }}>להתקשר לליווי</a> : <Link className="btn-copper" href={`${base}/support`} style={{ width: 'auto' }}>לליווי</Link>}
            <Link className="btn-outline" href={`${base}/assistant?q=${encodeURIComponent(`שאלה על ${g.title}: `)}`} style={{ width: 'auto' }}>לשאול את העוזר</Link>
          </div>
        </section>
      </article>
      <section style={{ marginTop: 18 }}><h2 style={{ fontSize: 17, marginBottom: 10 }}>עוד מדריכים</h2><div className="guide-grid">{others.map((o) => <GuideTile key={o.key} guide={o} href={`${base}/guides/${o.key}`} />)}</div></section>
    </FamilyShell>
  );
}
