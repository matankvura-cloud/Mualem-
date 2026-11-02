import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fundByManage, totals, depositsOf, payoutsOf, requestsOf } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { siteUrl, BRAND, SLOGAN } from '@/lib/site';
import { ils, fmtDate, fmtDateTime, eventDay, eventTitle, memOf } from '@/lib/format';
import { num } from '@/lib/db';
import CopyButton from '@/components/CopyButton';
import Footer from '@/components/Footer';
import { EditFundForm, AddEventForm, RequestPayoutForm } from './ManageForms';
import { removeEvent, setStatus, cancelRequest } from './actions';

const REQ: Record<string, [string, string]> = { pending: ['ממתין לאישור', 'pill-warn'], paid: ['שולם', 'pill-ok'], rejected: ['לא אושר', 'pill-err'] };

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ניהול הקופה', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function ManagePage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { welcome } = await searchParams;
  if (!TOKEN_RE.test(manage)) notFound();
  const fund = await fundByManage(manage);
  if (!fund) notFound();
  const [tot, deps, pays, reqs, site] = await Promise.all([totals(fund.id), depositsOf(fund.id), payoutsOf(fund.id), requestsOf(fund.id), siteUrl()]);
  const visiblePays = pays.filter((p) => p.visible);
  const publicLink = `${site}/f/${fund.token}`;
  const manageLink = `${site}/m/${manage}`;
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. ${SLOGAN}, אפשר להפקיד לקופה של המשפחה: ${publicLink}`);
  const paid = deps.filter((d) => d.status === 'paid');
  const closed = fund.status === 'closed';

  return (
    <div className="fd">
      <div className="topbar"><Link className="brand" href="/">{BRAND}</Link><span className={`pill ${closed ? 'pill-muted' : 'pill-ok'}`}>{closed ? 'הקופה סגורה' : 'הקופה פתוחה'}</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div>
          <h1 className="page-title">הקופה של {fund.display_name}</h1>
          <p className="lead">זה עמוד הניהול של המשפחה. מי שמחזיק בקישור הזה יכול לערוך ולסגור את הקופה, אז שומרים אותו לעצמכם.</p>
        </div>

        {welcome ? <div className="notice notice-ok"><b>הקופה נפתחה.</b> שלחו את הקישור הציבורי לכל מי שרוצה לעזור, ושמרו את קישור הניהול במקום בטוח.</div> : null}

        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>הקישור לשיתוף</h2>
          <span className="linkbox">{publicLink}</span>
          <div className="fd-actions" style={{ marginTop: 0 }}>
            <a className="btn-ghost" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener">שתף בוואטסאפ</a>
            <CopyButton text={publicLink} />
            <Link className="btn-ghost" href={`/f/${fund.token}`} target="_blank">לעמוד</Link>
          </div>
          <h3 style={{ fontSize: 15, marginTop: 6 }}>קישור הניהול (סודי)</h3>
          <span className="linkbox">{manageLink}</span>
          <div className="fd-actions" style={{ marginTop: 0 }}>
            <CopyButton text={manageLink} label="העתק קישור ניהול" />
            <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(`קישור הניהול של הקופה ${memOf(fund.gender)} ${fund.display_name} (לא להעביר הלאה): ${manageLink}`)}`} target="_blank" rel="noopener">לשלוח לעצמי בוואטסאפ</a>
          </div>
        </section>

        <section className="stats">
          <div className="stat"><small>נאסף</small><b>{ils(tot.raised)}</b></div>
          <div className="stat"><small>מפקידים</small><b>{tot.donors}</b></div>
          <div className="stat"><small>שולם מהקופה</small><b>{ils(tot.paid_out)}</b></div>
          <div className="stat"><small>יתרה זמינה</small><b>{ils(tot.available)}</b>{tot.requested ? <small>{ils(tot.requested)} בבקשות שממתינות</small> : null}</div>
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>תשלומים לספקים</h2>
          {reqs.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>למי</th><th>סכום</th><th>מצב</th><th></th></tr></thead>
              <tbody>{reqs.map((r) => { const [label, cls] = REQ[r.status] || [r.status, '']; return (
                <tr key={r.id}>
                  <td><b>{r.payee}</b>{r.purpose ? <><br /><small className="muted">{r.purpose}</small></> : null}{r.admin_note ? <><br /><small>{r.admin_note}</small></> : null}</td>
                  <td className="num">{ils(r.amount)}</td>
                  <td><span className={`pill ${cls}`}>{label}</span><br /><small className="muted">{fmtDate(r.updated_at)}</small></td>
                  <td>{r.status === 'pending' ? <form action={cancelRequest.bind(null, manage, r.id)}><button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 12 }}>לבטל</button></form> : null}</td>
                </tr>); })}</tbody>
            </table></div>
          ) : null}
          <RequestPayoutForm manage={manage} available={tot.available} />
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>הפקדות <small className="muted">({paid.length})</small></h2>
          {paid.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>מי</th><th>סכום</th><th>מילה למשפחה</th><th>מתי</th></tr></thead>
              <tbody>{paid.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.donor_name}</b>{d.donor_email ? <><br /><small className="muted" dir="ltr">{d.donor_email}</small></> : null}</td>
                  <td className="num">{ils(d.amount)}{d.hide_amount ? <><br /><small className="muted">לא מוצג בעמוד</small></> : null}</td>
                  <td>{d.message || <span className="muted">—</span>}</td>
                  <td className="num">{fmtDateTime(d.paid_at)}</td>
                </tr>))}</tbody>
            </table></div>
          ) : <div className="fd-note">עדיין אין הפקדות. שלחו את הקישור, ומי שיפקיד יופיע כאן.</div>}
          {tot.pending ? <p className="muted">{tot.pending} הפקדות התחילו ולא הושלמו עדיין.</p> : null}
        </section>

        {visiblePays.length ? (
          <section className="stack">
            <h2 style={{ fontSize: 18 }}>שולם מהקופה</h2>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>תאריך</th><th>למי</th><th>עבור</th><th>סכום</th></tr></thead>
              <tbody>{visiblePays.map((p) => (
                <tr key={p.id}><td className="num">{fmtDate(p.paid_on)}</td><td><b>{p.payee}</b></td><td>{p.purpose}</td><td className="num">{ils(p.amount)}</td></tr>))}</tbody>
            </table></div>
          </section>) : null}

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>מתי ואיפה</h2>
          {fund.events.length ? (
            <ol className="fd-list">{fund.events.map((e) => { const d = eventDay(e); return (
              <li className="fd-ev" key={e.id}>
                <span className="d"><b>{d.day}</b><small>{d.dm}</small></span>
                <span className="t"><b>{eventTitle(e)}{e.time ? ` · ${e.time}` : ''}</b><span>{[e.place, e.address, e.note].filter(Boolean).join(' · ')}</span></span>
                <form action={removeEvent.bind(null, manage, e.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 34, fontSize: 13 }}>להסיר</button></form>
              </li>); })}</ol>
          ) : <div className="fd-note">עדיין לא הוספתם לוויה, שבעה או אזכרה.</div>}
          <AddEventForm manage={manage} />
        </section>

        <EditFundForm manage={manage} fund={fund} />

        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</h2>
          <p className="muted">{closed
            ? 'הקופה סגורה: העמוד עדיין מוצג, אבל אי אפשר להפקיד. אפשר לפתוח מחדש בכל רגע.'
            : 'כשסוגרים, העמוד וספר הניחומים נשארים, אבל כפתור ההפקדה נעלם. אפשר לפתוח מחדש.'}</p>
          <form action={setStatus.bind(null, manage, closed ? 'open' : 'closed')}>
            <button className={`btn-ghost ${closed ? '' : 'btn-danger'}`} type="submit" style={{ width: '100%' }}>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</button>
          </form>
        </section>
        {num(fund.fee_pct) > 0 ? <p className="fd-small">על כל הפקדה נוספים {num(fund.fee_pct)}% לתפעול המערכת. הם לא נגרעים מהקופה.</p> : null}
      </div>
      <Footer />
    </div>
  );
}
