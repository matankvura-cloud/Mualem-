// העמוד הציבורי של הקופה: מי, מתי ואיפה, כמה נאסף, ספר הניחומים.
// מקבל רק מה שמותר להציג לכולם (ראו book() ב-lib/funds).
import Link from 'next/link';
import type { Fund, Totals } from '@/lib/funds';
import { ils, eventDay, eventTitle, memOf } from '@/lib/format';
import { BRAND } from '@/lib/site';
import CopyButton from './CopyButton';

type Book = { name: string; message: string | null; amount: number | null }[];

export default function FundPublic({ fund, t, totals: tot, book, site }: { fund: Fund; t: string; totals: Totals; book: Book; site: string }) {
  const raised = fund.show_amounts ? tot.raised : null;
  const target = Number(fund.target_ils || 0);
  const pct = raised !== null && target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : null;
  const link = `${site}/f/${t}`;
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. ${BRAND}: אפשר להפקיד לקופה של המשפחה: ${link}`);
  const closed = fund.status === 'closed';
  const messages = book.filter((b) => b.message);

  return (
    <>
      <section className="fd-hero">
        <div className="fd-avatar" aria-hidden="true">{fund.photo_initial || fund.display_name.trim().charAt(0)}</div>
        <p className="fd-eyebrow">{memOf(fund.gender)}</p>
        <h1>{fund.display_name}</h1>
        {fund.years || fund.city ? <p className="fd-years">{[fund.years, fund.city].filter(Boolean).join(' · ')}</p> : null}
        {fund.quote ? <p className="fd-quote">״{fund.quote}״{fund.quote_by ? <small>— {fund.quote_by}</small> : null}</p> : null}
      </section>

      <section className="fd-card" aria-label="הקופה">
        <div className="fd-row"><span>{raised !== null ? 'נאסף בקופה' : 'הפקידו לקופה'}</span><span>{tot.donors} {tot.donors === 1 ? 'אדם' : 'אנשים'}</span></div>
        {raised !== null ? <div className="fd-raised">{ils(raised)}</div> : null}
        {pct !== null ? <div className="fd-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div> : null}
        {fund.purpose ? <p className="fd-purpose">{fund.purpose}</p> : null}
        {closed
          ? <p className="fd-purpose" style={{ marginTop: 12 }}><b>הקופה נסגרה.</b> תודה לכל מי שעזר.</p>
          : <Link className="btn" href={`/f/${t}/give`} style={{ marginTop: 14 }}>להפקיד לקופה · במקום פרחים</Link>}
        <div className="fd-actions">
          <a className="btn-ghost" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener">שתף בוואטסאפ</a>
          <CopyButton text={link} />
        </div>
      </section>

      {fund.events.length ? (
        <section className="fd-sec"><h2>מתי ואיפה</h2>
          <ol className="fd-list">
            {fund.events.map((e) => { const d = eventDay(e); return (
              <li className="fd-ev" key={e.id}>
                <span className="d"><b>{d.day}</b><small>{d.dm}</small></span>
                <span className="t"><b>{eventTitle(e)}{e.time ? ` · ${e.time}` : ''}</b><span>{[e.place, e.address, e.note].filter(Boolean).join(' · ')}</span></span>
                {e.maps_url ? <a href={e.maps_url} target="_blank" rel="noopener">ניווט</a> : null}
              </li>); })}
          </ol>
        </section>) : null}

      {fund.allow_messages ? (
        <section className="fd-sec"><h2>ספר הניחומים <small>{messages.length} הודעות</small></h2>
          <div className="fd-book">
            {messages.length ? messages.slice(0, 50).map((b, i) => (
              <div className="fd-msg" key={i}><b>{b.name}</b>{b.amount !== null ? <small> · הפקיד/ה {ils(b.amount)}</small> : null}<p>{b.message}</p></div>
            )) : <div className="fd-msg"><p style={{ color: 'var(--soft)' }}>עדיין אין הודעות. הראשון שיפקיד יוכל לכתוב מילה למשפחה.</p></div>}
          </div>
        </section>) : null}
    </>
  );
}
