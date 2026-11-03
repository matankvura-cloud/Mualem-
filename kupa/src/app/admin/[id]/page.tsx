import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { fundById, totals, depositsOf, payoutsOf, requestsOf, redemptionsOf } from '@/lib/funds';
import { cardState, CARD_STATE_LABEL } from '@/lib/card';
import { UUID_RE } from '@/lib/tokens';
import { num } from '@/lib/db';
import { siteUrl } from '@/lib/site';
import { ils, fmtDate, fmtDateTime } from '@/lib/format';
import { LoginForm, PayoutForm, RequestDecision, CardControls } from '../AdminForms';
import { deletePayout, adminSetStatus, setCoordinator } from '../actions';
import { caseOfFund } from '@/lib/family';
import { COORDINATOR_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'קופה · ניהול', robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

const STATUS: Record<string, [string, string]> = { paid: ['שולם', 'pill-ok'], pending: ['ממתין', 'pill-warn'], failed: ['נכשל', 'pill-err'], cancelled: ['בוטל', 'pill-muted'] };

export default async function AdminFund({ params }: Props) {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const fund = await fundById(id);
  if (!fund) notFound();
  const [tot, deps, pays, reqs, site, reds, ecase] = await Promise.all([totals(id), depositsOf(id), payoutsOf(id), requestsOf(id), siteUrl(), redemptionsOf(id), caseOfFund(id)]);
  const cst = cardState(fund); const [cstLabel, cstCls] = CARD_STATE_LABEL[cst];
  const openReqs = reqs.filter((r) => r.status === 'pending');
  const doneReqs = reqs.filter((r) => r.status !== 'pending');
  const closed = fund.status === 'closed';
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="fd-back" href="/admin">&rsaquo; כל הקופות</Link><span className={`pill ${closed ? 'pill-muted' : 'pill-ok'}`}>{closed ? 'סגורה' : 'פתוחה'}</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div>
          <h1 className="page-title">{fund.display_name}</h1>
          <p className="lead">{[fund.years, fund.city].filter(Boolean).join(' · ')}{fund.manager_name ? ` · מנהל/ת: ${fund.manager_name}` : ''}{fund.manager_phone ? ` · ${fund.manager_phone}` : ''}{fund.manager_email ? ` · ${fund.manager_email}` : ''}</p>
        </div>
        <section className="card stack" style={{ gap: 8 }}>
          <div><small className="muted">קישור ציבורי</small><span className="linkbox">{site}/f/{fund.token}</span></div>
          <div><small className="muted">קישור ניהול של המשפחה (סודי)</small><span className="linkbox">{site}/m/{fund.manage_token}</span></div>
          {fund.card_token ? <div><small className="muted">כרטיס המשפחה (לספק)</small><span className="linkbox">{site}/s/{fund.card_token}</span></div> : null}
          <small className="muted">נפתחה {fmtDate(fund.created_at)} · {fund.view_count} צפיות · תוספת תפעול {num(fund.fee_pct)}%</small>
        </section>
        <section className="stats">
          <div className="stat"><small>נאסף</small><b>{ils(tot.raised)}</b></div>
          <div className="stat"><small>מפקידים</small><b>{tot.donors}</b></div>
          <div className="stat"><small>תוספות תפעול</small><b>{ils(tot.fees)}</b></div>
          <div className="stat"><small>שולם לספקים</small><b>{ils(tot.paid_out)}</b></div>
          <div className="stat"><small>יתרה</small><b>{ils(tot.raised - tot.paid_out)}</b>{tot.requested ? <small>{ils(tot.requested)} בבקשות פתוחות</small> : null}</div>
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>כרטיס ההטבות <span className={`pill ${cstCls}`}>{cstLabel}</span></h2>
          {fund.card_block_reason && fund.card_status === 'blocked' ? <p className="muted">סיבת החסימה: {fund.card_block_reason}</p> : null}
          <CardControls fundId={id} blocked={fund.card_status === 'blocked'} validUntil={String(fund.card_valid_until || '').slice(0, 10)} />
          <form action={setCoordinator.bind(null, id)} className="stack" style={{ gap: 8, marginTop: 12 }}>
            <h3 style={{ fontSize: 15 }}>הרכז/ת האישי/ת של המשפחה</h3>
            <div className="grid2">
              <div className="field"><label className="l" htmlFor="co-name">שם</label><input id="co-name" name="coordinator_name" type="text" defaultValue={fund.coordinator_name || ''} placeholder={COORDINATOR_NAME} maxLength={80} /></div>
              <div className="field"><label className="l" htmlFor="co-phone">טלפון</label><input id="co-phone" name="coordinator_phone" type="tel" defaultValue={fund.coordinator_phone || ''} maxLength={30} dir="ltr" /></div>
            </div>
            <button className="btn-ghost" type="submit" style={{ width: 'auto' }}>לשמור רכז/ת</button>
            {fund.login_pin ? <p className="muted">קוד הכניסה של המשפחה (טלפון {fund.manager_phone || '—'}): <b dir="ltr" style={{ letterSpacing: '.15em' }}>{fund.login_pin}</b></p> : null}
            {ecase ? <p className="muted">בליווי דרך מעסיק: {ecase.company} · <Link href="/admin/employers">למעסיקים ›</Link></p> : null}
          </form>
          <h3 style={{ fontSize: 15, marginTop: 8 }}>מימושי הטבות ({reds.length})</h3>
          {reds.length ? <ul className="pay-list">{reds.map((r) => <li key={r.id}><div className="t"><b>{r.supplier_name}</b><small>{r.benefit_title} · {fmtDateTime(r.created_at)}{r.note ? ` · ${r.note}` : ''}</small></div>{Number(r.amount_saved) ? <span className="a">{ils(r.amount_saved)}</span> : null}</li>)}</ul> : <p className="muted">עדיין לא מומשו הטבות.</p>}
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>בקשות תשלום מהמשפחה <small className="muted">({openReqs.length} פתוחות)</small></h2>
          {openReqs.length ? openReqs.map((r) => (
            <div className="card stack" key={r.id} style={{ borderColor: '#F0DDB8' }}>
              <div className="fd-row" style={{ fontSize: 15, color: 'var(--ink)' }}><b>{r.payee}</b><b className="num">{ils(r.amount)}</b></div>
              <p className="muted">{[r.purpose, r.contact, r.note].filter(Boolean).join(' · ') || '—'} · התקבלה {fmtDate(r.created_at)}{r.source === 'supplier' ? ' · הספק ביקש דרך הכרטיס' : ' · המשפחה ביקשה'}</p>
              <RequestDecision fundId={id} id={r.id} amount={num(r.amount)} />
            </div>)) : <div className="fd-note">אין בקשות פתוחות.</div>}
          {doneReqs.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>למי</th><th>סכום</th><th>מצב</th><th>הערה</th></tr></thead>
              <tbody>{doneReqs.map((r) => (
                <tr key={r.id}><td><b>{r.payee}</b>{r.purpose ? <><br /><small className="muted">{r.purpose}</small></> : null}</td><td className="num">{ils(r.amount)}</td>
                  <td><span className={`pill ${r.status === 'paid' ? 'pill-ok' : 'pill-err'}`}>{r.status === 'paid' ? 'שולם' : 'נדחה'}</span></td><td className="muted">{r.admin_note}</td></tr>))}</tbody>
            </table></div>) : null}
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>תשלומים לספקים</h2>
          {pays.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>תאריך</th><th>ספק</th><th>עבור</th><th>סכום</th><th>הערה</th><th></th></tr></thead>
              <tbody>{pays.map((p) => (
                <tr key={p.id}>
                  <td className="num">{fmtDate(p.paid_on)}</td><td><b>{p.payee}</b>{!p.visible ? <><br /><small className="muted">מוסתר מהמשפחה</small></> : null}</td>
                  <td>{p.purpose}</td><td className="num">{ils(p.amount)}</td><td className="muted">{p.note}</td>
                  <td><form action={deletePayout.bind(null, id, p.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 32, fontSize: 12 }}>למחוק</button></form></td>
                </tr>))}</tbody>
            </table></div>
          ) : <div className="fd-note">עדיין לא נרשמו תשלומים מהקופה הזו.</div>}
          <PayoutForm fundId={id} />
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>הפקדות <small className="muted">({deps.length})</small></h2>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>מתי</th><th>מי</th><th>לקופה</th><th>תפעול</th><th>נגבה</th><th>מצב</th><th>מסמך</th></tr></thead>
            <tbody>{deps.map((d) => { const [label, cls] = STATUS[d.status] || [d.status, '']; return (
              <tr key={d.id}>
                <td className="num">{fmtDateTime(d.paid_at || d.created_at)}</td>
                <td><b>{d.donor_name}</b>{d.donor_email ? <><br /><small className="muted" dir="ltr">{d.donor_email}</small></> : null}{d.message ? <><br /><small>{d.message}</small></> : null}</td>
                <td className="num">{ils(d.amount)}{d.hide_amount ? <><br /><small className="muted">מוסתר</small></> : null}</td>
                <td className="num">{num(d.fee_amount) ? ils(d.fee_amount) : '—'}</td>
                <td className="num">{ils(d.charged_amount)}</td>
                <td><span className={`pill ${cls}`}>{label}</span></td>
                <td>{d.doc_url ? <a href={d.doc_url} target="_blank" rel="noopener">{d.doc_number || 'מסמך'}</a> : d.doc_number || <span className="muted">—</span>}</td>
              </tr>); })}
              {!deps.length ? <tr><td colSpan={7} className="muted">עדיין אין הפקדות.</td></tr> : null}
            </tbody>
          </table></div>
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</h2>
          <form action={adminSetStatus.bind(null, id, closed ? 'open' : 'closed')}>
            <button className={`btn-ghost ${closed ? '' : 'btn-danger'}`} type="submit" style={{ width: '100%' }}>{closed ? 'לפתוח מחדש' : 'לסגור את הקופה'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
