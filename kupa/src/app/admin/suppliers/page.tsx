import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin';
import { allSuppliers } from '@/lib/funds';
import { num } from '@/lib/db';
import { ils } from '@/lib/format';
import { LoginForm, SupplierForm } from '../AdminForms';
import { setSupplierStatus } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ספקים · ניהול', robots: { index: false, follow: false } };
const ST: Record<string, [string, string]> = { active: ['פעיל', 'pill-ok'], pending: ['ממתין', 'pill-warn'], inactive: ['לא פעיל', 'pill-muted'] };

export default async function AdminSuppliers() {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const sups = await allSuppliers();
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="fd-back" href="/admin">&rsaquo; כל הקופות</Link><Link href="/suppliers" className="btn-ghost" style={{ minHeight: 36, fontSize: 13 }}>המדריך הציבורי</Link></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <section className="stats">
          <div className="stat"><small>ספקים פעילים</small><b>{sups.filter((s) => s.status === 'active').length}</b></div>
          <div className="stat"><small>ממתינים לאישור</small><b>{sups.filter((s) => s.status === 'pending').length}</b></div>
          <div className="stat"><small>הטבות פעילות</small><b>{sups.reduce((a, s) => a + num(s.benefits), 0)}</b></div>
          <div className="stat"><small>מימושים</small><b>{sups.reduce((a, s) => a + num(s.redemptions), 0)}</b></div>
          <div className="stat"><small>עסקאות שדווחו</small><b>{ils(sups.reduce((a, s) => a + num(s.orders), 0))}</b></div>
          <div className="stat"><small>פניות חדשות</small><b>{sups.reduce((a, s) => a + num(s.leads_new), 0)}</b></div>
          <div className="stat"><small>עמלות לפלטפורמה</small><b>{ils(sups.reduce((a, s) => a + num(s.commission) + num(s.leads_commission), 0))}</b></div>
        </section>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>ספק</th><th>קטגוריה</th><th>מצב</th><th>פניות</th><th>קוד</th><th>עמלה</th><th>הטבות</th><th>מימושים</th><th>עמלות</th><th></th></tr></thead>
          <tbody>{sups.map((s) => { const [l, c] = ST[s.status] || [s.status, '']; return (
            <tr key={s.id}>
              <td><Link href={`/admin/suppliers/${s.id}`}><b>{s.name}</b></Link>{s.city ? <><br /><small className="muted">{s.city}</small></> : null}</td>
              <td>{s.category}</td><td><span className={`pill ${c}`}>{l}</span></td>
              <td>{num(s.leads_new) ? <span className="pill pill-warn">{num(s.leads_new)} חדשות</span> : <span className="muted">—</span>}</td>
              <td className="num" dir="ltr">{s.pin}</td><td className="num">{num(s.commission_pct)}%</td>
              <td className="num">{num(s.benefits)}</td><td className="num">{num(s.redemptions)}</td><td className="num">{ils(num(s.commission) + num(s.leads_commission))}</td>
              <td>{s.status !== 'active' ? <form action={setSupplierStatus.bind(null, s.id, 'active')}><button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 12 }}>לאשר</button></form>
                : <form action={setSupplierStatus.bind(null, s.id, 'inactive')}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 32, fontSize: 12 }}>להסיר</button></form>}</td>
            </tr>); })}
            {!sups.length ? <tr><td colSpan={10} className="muted">עדיין אין ספקים. הוסיפו את הראשון למטה.</td></tr> : null}
          </tbody>
        </table></div>
        <SupplierForm />
      </div>
    </div>
  );
}
