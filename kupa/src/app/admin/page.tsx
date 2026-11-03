import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin';
import { allFunds } from '@/lib/funds';
import { num } from '@/lib/db';
import { ils, fmtDate } from '@/lib/format';
import { LoginForm } from './AdminForms';
import { BRAND } from '@/lib/site';
import { adminLogout } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ניהול', robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const funds = await allFunds();
  const sum = (k: 'raised' | 'fees' | 'paid_out') => funds.reduce((a, f) => a + num(f[k]), 0);
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="brand" href="/">{BRAND} · ניהול</Link><Link href="/admin/suppliers" className="btn-ghost" style={{ minHeight: 36, fontSize: 13 }}>ספקים והטבות</Link>
        <form action={adminLogout}><button className="btn-ghost" type="submit" style={{ minHeight: 36, fontSize: 13 }}>לצאת</button></form></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <section className="stats">
          <div className="stat"><small>קופות</small><b>{funds.length}</b></div>
          <div className="stat"><small>נאסף בסה״כ</small><b>{ils(sum('raised'))}</b></div>
          <div className="stat"><small>תוספות תפעול</small><b>{ils(sum('fees'))}</b></div>
          <div className="stat"><small>שולם לספקים</small><b>{ils(sum('paid_out'))}</b></div>
          <div className="stat"><small>יתרה בקופות</small><b>{ils(sum('raised') - sum('paid_out'))}</b></div>
          <div className="stat"><small>בקשות ממתינות</small><b>{funds.reduce((a, f) => a + num(f.open_requests), 0)}</b></div>
        </section>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>קופה</th><th>מנהל/ת</th><th>נפתחה</th><th>מצב</th><th>בקשות</th><th>נאסף</th><th>מפקידים</th><th>תפעול</th><th>שולם</th><th>יתרה</th></tr></thead>
          <tbody>{funds.map((f) => (
            <tr key={f.id}>
              <td><Link href={`/admin/${f.id}`}><b>{f.display_name}</b></Link>{f.city ? <><br /><small className="muted">{f.city}</small></> : null}</td>
              <td>{f.manager_name}<br /><small className="muted" dir="ltr">{f.manager_phone}</small></td>
              <td className="num">{fmtDate(f.created_at)}</td>
              <td><span className={`pill ${f.status === 'closed' ? 'pill-muted' : 'pill-ok'}`}>{f.status === 'closed' ? 'סגורה' : 'פתוחה'}</span></td>
              <td>{num(f.open_requests) ? <span className="pill pill-warn">{num(f.open_requests)} ממתינות</span> : <span className="muted">—</span>}</td>
              <td className="num">{ils(f.raised)}</td><td className="num">{num(f.donors)}</td><td className="num">{ils(f.fees)}</td>
              <td className="num">{ils(f.paid_out)}</td><td className="num"><b>{ils(num(f.raised) - num(f.paid_out))}</b></td>
            </tr>))}
            {!funds.length ? <tr><td colSpan={10} className="muted">עדיין אין קופות.</td></tr> : null}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
