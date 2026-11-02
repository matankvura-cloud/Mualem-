import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { eventDay, eventTitle } from '@/lib/format';
import FamilyShell from '@/components/FamilyShell';
import { EditFundForm, AddEventForm } from '../ManageForms';
import { removeEvent, setStatus } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'התיק המשפחתי', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function FilePage({ params }: Props) {
  const { manage } = await params;
  const { fund } = await loadFamily(manage);
  const closed = fund.status === 'closed';
  return (
    <FamilyShell manage={manage} active="file">
      <header className="fam-head">
        <div><h1>התיק המשפחתי</h1><p>מה שמוצג בעמוד, מתי ואיפה, ומי מנהל את הקופה.</p></div>
        <span className={`pill ${closed ? 'pill-muted' : 'pill-ok'}`}>{closed ? 'הקופה סגורה' : 'הקופה פתוחה'}</span>
      </header>
      <section className="fam-grid2">
        <div className="stack">
          <div className="panel">
            <h2>מתי ואיפה</h2>
            {fund.events.length ? (
              <ol className="fd-list">{fund.events.map((e) => { const d = eventDay(e); return (
                <li className="fd-ev" key={e.id}>
                  <span className="d"><b>{d.day}</b><small>{d.dm}</small></span>
                  <span className="t"><b>{eventTitle(e)}{e.time ? ` · ${e.time}` : ''}</b><span>{[e.place, e.address, e.note].filter(Boolean).join(' · ')}</span></span>
                  <form action={removeEvent.bind(null, manage, e.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 34, fontSize: 13 }}>להסיר</button></form>
                </li>); })}</ol>
            ) : <p className="muted">עדיין לא הוספתם לוויה, שבעה או אזכרה.</p>}
            <Link className="more" href={`/f/${fund.token}`} target="_blank">לראות את העמוד כמו שהקרובים רואים ›</Link>
          </div>
          <AddEventForm manage={manage} />
          <div className="panel">
            <h2>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</h2>
            <p className="muted" style={{ marginBottom: 10 }}>{closed
              ? 'הקופה סגורה: העמוד עדיין מוצג, אבל אי אפשר להפקיד. היתרה נשארת זמינה לתשלומים.'
              : 'כשסוגרים, העמוד וספר הניחומים נשארים, אבל כפתור ההפקדה נעלם. אפשר לפתוח מחדש.'}</p>
            <form action={setStatus.bind(null, manage, closed ? 'open' : 'closed')}>
              <button className={`btn-ghost ${closed ? '' : 'btn-danger'}`} type="submit" style={{ width: '100%' }}>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</button>
            </form>
          </div>
        </div>
        <EditFundForm manage={manage} fund={fund} />
      </section>
    </FamilyShell>
  );
}
