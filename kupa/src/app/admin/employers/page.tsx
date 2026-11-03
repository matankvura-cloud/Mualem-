import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin';
import { allEmployerCases, CASE_STATUS, PACKAGES } from '@/lib/family';
import { allFunds } from '@/lib/funds';
import { fmtDate } from '@/lib/format';
import { LoginForm } from '../AdminForms';
import { setCaseStatus } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'מעסיקים · ניהול', robots: { index: false, follow: false } };

export default async function AdminEmployers() {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const [cases, funds] = await Promise.all([allEmployerCases(), allFunds()]);
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="fd-back" href="/admin">&rsaquo; ניהול</Link><Link href="/e" className="btn-ghost" style={{ minHeight: 36, fontSize: 13 }} target="_blank">פורטל המעסיקים ›</Link></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div><h1 className="page-title">מעסיקים</h1><p className="lead">משפחות שמעסיקים רשמו. מעדכנים סטטוס, ומקשרים לקופה כשהמשפחה פתחה מרכז משפחה.</p></div>
        {cases.length ? <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>מעסיק</th><th>עובד/ת</th><th>משפחה</th><th>חבילה</th><th>נרשם</th><th>אישור</th><th>סטטוס וקופה</th></tr></thead>
          <tbody>{cases.map((c) => (
            <tr key={c.id}>
              <td><b>{c.company}</b><br /><small className="muted">{c.contact_name} · <span dir="ltr">{c.phone}</span></small></td>
              <td>{c.employee_name}{c.deceased_name ? <><br /><small className="muted">{c.relation ? `${c.relation}: ` : ''}{c.deceased_name}</small></> : null}</td>
              <td>{c.family_contact || <span className="muted">—</span>}{c.family_phone ? <><br /><small className="muted" dir="ltr">{c.family_phone}</small></> : null}</td>
              <td>{PACKAGES[c.package]?.label || c.package}{c.note ? <><br /><small className="muted">{c.note}</small></> : null}</td>
              <td className="num">{fmtDate(c.created_at)}</td>
              <td>{c.approved_at ? <span className="pill pill-ok">אושר</span> : <span className="pill pill-muted">טרם</span>}</td>
              <td>
                <form action={setCaseStatus.bind(null, c.id)} className="stack" style={{ gap: 6, minWidth: 180 }}>
                  <select name="status" defaultValue={c.status}>{Object.entries(CASE_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
                  <select name="fund_id" defaultValue={c.fund_id || ''}><option value="">בלי קופה</option>{funds.map((f) => <option key={f.id} value={f.id}>{f.display_name}</option>)}</select>
                  <button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 13 }}>לעדכן</button>
                </form>
              </td>
            </tr>))}</tbody>
        </table></div> : <p className="muted">עדיין לא נרשמו מעסיקים.</p>}
      </div>
    </div>
  );
}
