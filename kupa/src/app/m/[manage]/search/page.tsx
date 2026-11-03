import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { GUIDES } from '@/data/guides';
import { RIGHTS, DOC_KINDS } from '@/data/documents';
import { activeSuppliers } from '@/lib/funds';
import { FAM_NAV } from '@/components/FamilyShell';
import FamilyShell from '@/components/FamilyShell';
import { IcBook, IcDoc, IcShop, IcHome, IcChat } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'חיפוש', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ q?: string }> };
type Hit = { kind: 'guide' | 'right' | 'doc' | 'supplier' | 'page'; title: string; sub: string; href: string; external?: boolean };

const norm = (s: string) => s.toLowerCase().replace(/["״׳']/g, '').replace(/\s+/g, ' ').trim();
const has = (hay: string, needles: string[]) => { const h = norm(hay); return needles.every((n) => h.includes(n)); };

export default async function SearchPage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { q = '' } = await searchParams;
  await loadFamily(manage);
  const base = `/m/${manage}`;
  const query = q.trim().slice(0, 120);
  const words = norm(query).split(' ').filter((w) => w.length >= 2);
  const hits: Hit[] = [];
  if (words.length) {
    for (const n of FAM_NAV) if (has(n.label, words)) hits.push({ kind: 'page', title: n.label, sub: 'מסך במרכז המשפחה', href: base + n.path });
    for (const g of GUIDES) {
      if (has(`${g.title} ${g.lead} ${g.when}`, words)) hits.push({ kind: 'guide', title: g.title, sub: g.lead, href: `${base}/guides/${g.key}` });
      for (const s of g.sections) if (has(`${s.h} ${s.p || ''} ${(s.items || []).join(' ')}`, words)) hits.push({ kind: 'guide', title: `${g.title}: ${s.h}`, sub: (s.p || s.items?.[0] || '').slice(0, 120), href: `${base}/guides/${g.key}` });
    }
    for (const r of RIGHTS) if (has(`${r.name} ${r.who} ${r.text}`, words)) hits.push({ kind: 'right', title: r.name, sub: `${r.who} · ${r.text}`, href: r.url, external: true });
    for (const d of DOC_KINDS) if (has(`${d.name} ${d.who} ${d.why}`, words)) hits.push({ kind: 'doc', title: d.name, sub: `${d.who ? d.who + ' · ' : ''}${d.why}`, href: `${base}/file` });
    const sups = await activeSuppliers();
    for (const s of sups) if (has(`${s.name} ${s.category} ${s.city || ''} ${s.services || ''} ${s.description || ''}`, words)) hits.push({ kind: 'supplier', title: s.name, sub: [s.category, s.city].filter(Boolean).join(' · '), href: `${base}/suppliers` });
  }
  const ICON = { guide: IcBook, right: IcDoc, doc: IcDoc, supplier: IcShop, page: IcHome };
  return (
    <FamilyShell manage={manage} active="search">
      <header className="fam-head"><div><h1>חיפוש</h1><p>{query ? `תוצאות ל"${query}"` : 'מדריכים, זכויות, מסמכים ושירותים.'}</p></div></header>
      <form className="fam-search big" action={`${base}/search`} method="get" role="search" style={{ marginBottom: 16 }}>
        <input type="search" name="q" defaultValue={query} placeholder="מה מחפשים?" aria-label="חיפוש" maxLength={120} autoFocus />
        <button className="btn-copper" type="submit" style={{ width: 'auto' }}>לחפש</button>
      </form>
      {query && !hits.length ? <div className="panel" style={{ marginBottom: 14 }}><p className="muted">לא מצאנו את זה במדריכים. העוזר כנראה יודע.</p></div> : null}
      {hits.length ? <ul className="hits">{hits.slice(0, 30).map((h, i) => { const I = ICON[h.kind]; return (
        <li key={i}><I />{h.external ? <a href={h.href} target="_blank" rel="noopener"><b>{h.title}</b><small>{h.sub}</small></a> : <Link href={h.href}><b>{h.title}</b><small>{h.sub}</small></Link>}</li>); })}</ul> : null}
      {query ? <Link className="btn-outline" href={`${base}/assistant?q=${encodeURIComponent(query)}`} style={{ width: 'auto', marginTop: 14 }}><IcChat />לשאול את העוזר: "{query}"</Link> : null}
    </FamilyShell>
  );
}
