import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { documentsOf } from '@/lib/funds';
import { DOC_KINDS, RIGHTS } from '@/data/documents';
import { deleteDocument } from '../now/actions';
import { IcCheck, IcDoc } from '@/components/icons';
import { fmtDate } from '@/lib/format';
import { eventDay, eventTitle } from '@/lib/format';
import FamilyShell from '@/components/FamilyShell';
import { EditFundForm, AddEventForm } from '../ManageForms';
import { removeEvent, setStatus } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'התיק והמסמכים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ doc?: string }> };
const DOC_MSG: Record<string, [string, string]> = { ok: ['המסמך נשמר בתיק.', 'notice-ok'], empty: ['לא נבחר קובץ.', 'notice-warn'], big: ['הקובץ גדול מדי. עד 4MB.', 'notice-warn'], type: ['אפשר להעלות PDF או תמונה (JPG, PNG, WEBP, HEIC).', 'notice-warn'] };
const kb = (n: number) => n > 1024 * 1024 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;

export default async function FilePage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { doc } = await searchParams;
  const { fund } = await loadFamily(manage);
  const docs = await documentsOf(fund.id);
  const have = new Set(docs.map((d) => d.kind));
  const msg = doc ? DOC_MSG[doc] : null;
  const closed = fund.status === 'closed';
  return (
    <FamilyShell manage={manage} active="file">
      <header className="fam-head">
        <div><h1>התיק והמסמכים</h1><p>המסמכים שצריך, מי מנפיק אותם, והזכויות שמגיעות. וגם מה שמוצג בעמוד הקופה.</p></div>
        <span className={`pill ${closed ? 'pill-muted' : 'pill-ok'}`}>{closed ? 'הקופה סגורה' : 'הקופה פתוחה'}</span>
      </header>
      <section className="fam-grid2" id="docs">
        <div className="panel">
          <h2><IcDoc />המסמכים</h2>
          {msg ? <p className={`notice ${msg[1]}`} style={{ marginBottom: 10 }}>{msg[0]}</p> : null}
          <ul className="kinds">
            {DOC_KINDS.filter((k) => k.key !== 'other').map((k) => (
              <li key={k.key} className={have.has(k.key) ? 'have' : ''}><i>{have.has(k.key) ? <IcCheck /> : null}</i>
                <div><b>{k.name}</b><small>{k.who ? `${k.who} · ` : ''}{k.why}</small>{k.link ? <a href={k.link} target="_blank" rel="noopener">לשירות הרשמי ›</a> : null}</div></li>))}
          </ul>
          <h3 style={{ fontSize: 15, marginTop: 16 }}>להעלות מסמך לתיק</h3>
          <form action={`/api/m/${manage}/documents`} method="post" encType="multipart/form-data" className="stack" style={{ gap: 8, marginTop: 8 }}>
            <div className="grid2">
              <div className="field"><label className="l" htmlFor="doc-kind">סוג</label>
                <select id="doc-kind" name="kind" defaultValue="death-cert">{DOC_KINDS.map((k) => <option key={k.key} value={k.key}>{k.name}</option>)}</select></div>
              <div className="field"><label className="l" htmlFor="doc-name">שם (לא חובה)</label><input id="doc-name" name="name" type="text" maxLength={120} /></div>
            </div>
            <input id="doc-file" name="file" type="file" accept="application/pdf,image/*" required />
            <input name="note" type="text" maxLength={300} placeholder="הערה (לא חובה)" />
            <button className="btn-copper" type="submit">לשמור בתיק</button>
            <p className="fd-small">PDF או תמונה, עד 4MB. נשמר רק לקופה הזו, ונגיש רק עם קישור הניהול.</p>
          </form>
          {docs.length ? (<>
            <h3 style={{ fontSize: 15, marginTop: 16 }}>בתיק ({docs.length})</h3>
            <ul className="docs">{docs.map((d) => (
              <li key={d.id}><div className="t"><b>{d.name}</b><small>{DOC_KINDS.find((k) => k.key === d.kind)?.name || d.kind} · {kb(d.size)} · {fmtDate(d.created_at)}{d.note ? ` · ${d.note}` : ''}</small></div>
                <a href={`/m/${manage}/doc/${d.id}`} target="_blank" rel="noopener">לפתוח</a>
                <form action={deleteDocument.bind(null, manage, d.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 30, fontSize: 12 }}>למחוק</button></form></li>))}</ul>
          </>) : null}
        </div>
        <div className="stack">
          <div className="panel">
            <h2>הזכויות שמגיעות</h2>
            <p className="muted" style={{ marginBottom: 8 }}>הקישורים לגורמים הרשמיים בלבד. מה מגיע בפועל נקבע אצלם, ואנחנו עוזרים להגיע לשם.</p>
            <ul className="kinds">{RIGHTS.map((r) => (
              <li key={r.url}><i /><div><b>{r.name}</b><small>{r.who} · {r.text}</small><a href={r.url} target="_blank" rel="noopener">לשירות ›</a></div></li>))}</ul>
          </div>
        </div>
      </section>

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
