import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { supplierById, benefitsOf, redemptionsOfSupplier } from '@/lib/funds';
import { UUID_RE } from '@/lib/tokens';
import { fmtBenefit } from '@/lib/card';
import { ils, fmtDateTime, familyName } from '@/lib/format';
import { LoginForm, LoginLinkButton } from '../../AdminForms';
import { BenefitForm } from '@/app/p/SupplierForms';
import { toggleBenefit } from '@/app/p/actions';
import { setSupplierStatus } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ספק · ניהול', robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function AdminSupplier({ params }: Props) {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sup = await supplierById(id);
  if (!sup) notFound();
  const [benefits, reds] = await Promise.all([benefitsOf(id), redemptionsOfSupplier(id)]);
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="fd-back" href="/admin/suppliers">&rsaquo; כל הספקים</Link><span className={`pill ${sup.status === 'active' ? 'pill-ok' : sup.status === 'pending' ? 'pill-warn' : 'pill-muted'}`}>{sup.status === 'active' ? 'פעיל' : sup.status === 'pending' ? 'ממתין' : 'לא פעיל'}</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div><h1 className="page-title">{sup.name}</h1><p className="lead">{[sup.category, sup.city, sup.phone, sup.email].filter(Boolean).join(' · ')}</p>{sup.description ? <p className="muted">{sup.description}</p> : null}</div>
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>כניסה לפורטל הספק</h2>
          <LoginLinkButton supplierId={id} />
          <div className="fd-actions">
            {sup.status !== 'active' ? <form action={setSupplierStatus.bind(null, id, 'active')}><button className="btn-outline" type="submit">לאשר ולהציג למשפחות</button></form> : null}
            {sup.status === 'active' ? <form action={setSupplierStatus.bind(null, id, 'inactive')}><button className="btn-ghost btn-danger" type="submit">להסיר מהרשימה</button></form> : null}
            {sup.status === 'inactive' ? <form action={setSupplierStatus.bind(null, id, 'pending')}><button className="btn-ghost" type="submit">להחזיר לממתין</button></form> : null}
          </div>
        </section>
        <section className="stack">
          <h2 style={{ fontSize: 18 }}>הטבות</h2>
          {benefits.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>הטבה</th><th>ערך</th><th>תנאים</th><th>למשפחה</th><th>מצב</th><th></th></tr></thead>
              <tbody>{benefits.map((b) => (
                <tr key={b.id}><td><b>{b.title}</b></td><td>{fmtBenefit(b)}</td><td className="muted">{b.terms}</td><td className="num">{b.max_per_family}</td>
                  <td><span className={`pill ${b.active ? 'pill-ok' : 'pill-muted'}`}>{b.active ? 'פעילה' : 'כבויה'}</span></td>
                  <td><form action={toggleBenefit.bind(null, id, true, b.id, !b.active)}><button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 12 }}>{b.active ? 'לכבות' : 'להפעיל'}</button></form></td></tr>))}</tbody>
            </table></div>) : <div className="fd-note">אין הטבות עדיין.</div>}
          <BenefitForm supplierId={id} asAdmin />
        </section>
        <section className="stack">
          <h2 style={{ fontSize: 18 }}>מימושים <small className="muted">({reds.length})</small></h2>
          {reds.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>מתי</th><th>משפחה</th><th>הטבה</th><th>חיסכון</th><th>הערה</th></tr></thead>
              <tbody>{reds.map((r) => (<tr key={r.id}><td className="num">{fmtDateTime(r.created_at)}</td><td><b>{familyName(r.family)}</b></td><td>{r.benefit_title}</td><td className="num">{Number(r.amount_saved) ? ils(r.amount_saved) : '—'}</td><td className="muted">{r.note}</td></tr>))}</tbody>
            </table></div>) : <div className="fd-note">עדיין לא מומשו הטבות אצל הספק הזה.</div>}
        </section>
      </div>
    </div>
  );
}
