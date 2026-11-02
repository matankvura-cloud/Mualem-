import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { fundById, totals, depositsOf, payoutsOf } from '@/lib/funds';
import { UUID_RE } from '@/lib/tokens';
import { num } from '@/lib/db';
import { siteUrl } from '@/lib/site';
import { ils, fmtDate, fmtDateTime } from '@/lib/format';
import { LoginForm, PayoutForm } from '../AdminForms';
import { deletePayout, adminSetStatus } from '../actions';

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
  const [tot, deps, pays, site] = await Promise.all([totals(id), depositsOf(id), payoutsOf(id), siteUrl()]);
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
          <small className="muted">נפתחה {fmtDate(fund.created_at)} · {fund.view_count} צפיות · תוספת תפעול {num(fund.fee_pct)}%</small>
        </section>
        <section className="stats">
          <div className="stat"><small>נאסף</small><b>{ils(tot.raised)}</b></div>
          <div className="stat"><small>מפקידים</small><b>{tot.donors}</b></div>
          <div className="stat"><small>תוספות תפעול</small><b>{ils(tot.fees)}</b></div>
          <div className="stat"><small>שולם לספקים</small><b>{ils(tot.paid_out)}</b></div>
          <div className="stat"><small>יתרה</small><b>{ils(tot.raised - tot.paid_out)}</b></div>
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
