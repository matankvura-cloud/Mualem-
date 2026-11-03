import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { supplierById, benefitsOf, redemptionsOfSupplier, leadsOf, LEAD_STATUS, reviewsOf, BUSINESS_TYPES } from '@/lib/funds';
import { SupplierLogo, Stars } from '@/components/SupplierHeader';
import { UUID_RE } from '@/lib/tokens';
import { fmtBenefit } from '@/lib/card';
import { ils, fmtDateTime, fmtDate, familyName } from '@/lib/format';
import { LoginForm, LoginLinkButton, CommissionForm } from '../../AdminForms';
import { BenefitForm, LeadActions } from '@/app/p/SupplierForms';
import { toggleBenefit } from '@/app/p/actions';
import { setSupplierStatus, regenSupplierPin, setSupplierVerified } from '../../actions';
import { num } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ספק · ניהול', robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };

export default async function AdminSupplier({ params }: Props) {
  if (!(await isAdmin())) return <div className="fd"><LoginForm /></div>;
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sup = await supplierById(id);
  if (!sup) notFound();
  const [benefits, reds, leads, reviews] = await Promise.all([benefitsOf(id), redemptionsOfSupplier(id), leadsOf(id), reviewsOf(id)]);
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="fd-back" href="/admin/suppliers">&rsaquo; כל הספקים</Link><span className={`pill ${sup.status === 'active' ? 'pill-ok' : sup.status === 'pending' ? 'pill-warn' : 'pill-muted'}`}>{sup.status === 'active' ? 'פעיל' : sup.status === 'pending' ? 'ממתין' : 'לא פעיל'}</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <header className="sup-head"><SupplierLogo s={sup} size={72} /><div><h1 className="page-title">{sup.name}</h1><p className="lead">{[sup.category, sup.city, sup.phone, sup.email].filter(Boolean).join(' · ')}</p><Stars avg={sup.rating_avg} count={sup.rating_count} /></div></header>
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>פרטי העסק {sup.verified ? <span className="pill pill-ok">✓ מאומת</span> : <span className="pill pill-warn">לא מאומת</span>}</h2>
          <dl className="details">{([['שם מלא', sup.legal_name], ['ח.פ / ע.מ', sup.business_id], ['סוג', sup.business_type ? BUSINESS_TYPES[sup.business_type] : null], ['משנת', sup.founded_year], ['כתובת', sup.address], ['אזורים', sup.areas], ['שעות', sup.hours], ['איש קשר', sup.contact_name], ['אתר', sup.website], ['אינסטגרם', sup.instagram], ['פייסבוק', sup.facebook], ['כשרות', sup.kosher], ['תשלום', sup.payment_methods], ['משלוחים', sup.delivery]] as [string, unknown][]).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
          {sup.description ? <p className="muted">{sup.description}</p> : null}
          {sup.services ? <p className="muted" style={{ whiteSpace: 'pre-line' }}>{sup.services}</p> : null}
          <form action={setSupplierVerified.bind(null, id, !sup.verified)}><button className={sup.verified ? 'btn-ghost' : 'btn-outline'} type="submit" style={{ width: 'auto' }}>{sup.verified ? 'לבטל אימות' : 'לסמן כמאומת (בדקתי ח.פ וטלפון)'}</button></form>
          <a className="btn-ghost" href={`/suppliers/${sup.slug}`} target="_blank" rel="noopener" style={{ width: 'auto' }}>העמוד הציבורי</a>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>קוד הספק</h2>
          <p className="muted">הספק מקליד את הקוד בעמוד הסריקה כדי לאשר מימוש. שולחים לו אותו פעם אחת. אין צורך בכניסה.</p>
          <div className="card-meta"><span className="linkbox" style={{ fontSize: 22, letterSpacing: '.2em' }} dir="ltr">{sup.pin}</span>
            <form action={regenSupplierPin.bind(null, id)}><button className="btn-ghost" type="submit" style={{ minHeight: 36, fontSize: 13 }}>להחליף קוד</button></form></div>
          <CommissionForm supplierId={id} pct={num(sup.commission_pct)} />
          <div className="stats">
            <div className="stat"><small>עסקאות שדווחו</small><b>{ils(reds.reduce((a, r) => a + num(r.order_amount), 0))}</b></div>
            <div className="stat"><small>עמלה ממימושים</small><b>{ils(reds.reduce((a, r) => a + num(r.commission), 0))}</b></div>
            <div className="stat"><small>עבודות שנסגרו מפניות</small><b>{ils(leads.filter((l) => l.status === 'closed').reduce((a, l) => a + num(l.order_amount), 0))}</b></div>
            <div className="stat"><small>עמלה מפניות</small><b>{ils(leads.reduce((a, l) => a + num(l.commission), 0))}</b></div>
          </div>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>כניסה לפורטל הספק (לא חובה)</h2>
          <p className="muted">הפורטל מאפשר לספק לנהל הטבות ולראות מימושים. הכניסה בקישור אישי; מימוש אפשר גם בלי זה, עם הקוד.</p>
          <LoginLinkButton supplierId={id} />
          <div className="fd-actions">
            {sup.status !== 'active' ? <form action={setSupplierStatus.bind(null, id, 'active')}><button className="btn-outline" type="submit">לאשר ולהציג למשפחות</button></form> : null}
            {sup.status === 'active' ? <form action={setSupplierStatus.bind(null, id, 'inactive')}><button className="btn-ghost btn-danger" type="submit">להסיר מהרשימה</button></form> : null}
            {sup.status === 'inactive' ? <form action={setSupplierStatus.bind(null, id, 'pending')}><button className="btn-ghost" type="submit">להחזיר לממתין</button></form> : null}
          </div>
        </section>
        <section className="stack">
          <h2 style={{ fontSize: 18 }}>פניות ממשפחות <small className="muted">({leads.length}, {leads.filter((l) => l.status === 'new').length} חדשות)</small></h2>
          {leads.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>מתי</th><th>מי</th><th>מה</th><th>מצב</th><th>עבודה</th><th>עמלה</th><th></th></tr></thead>
              <tbody>{leads.map((l) => { const [label, cls] = LEAD_STATUS[l.status] || [l.status, '']; return (
                <tr key={l.id}><td className="num">{fmtDate(l.created_at)}</td><td><b>{l.name}</b>{l.family ? <><br /><small className="muted">{familyName(l.family)}</small></> : null}<br /><small dir="ltr">{l.phone}</small></td>
                  <td className="muted">{l.message}</td><td><span className={`pill ${cls}`}>{label}</span></td>
                  <td className="num">{Number(l.order_amount) ? ils(l.order_amount) : '—'}</td><td className="num">{Number(l.commission) ? ils(l.commission) : '—'}</td>
                  <td style={{ minWidth: 220 }}><LeadActions leadId={l.id} status={l.status} asAdmin /></td></tr>); })}</tbody>
            </table></div>) : <div className="fd-note">עדיין אין פניות לספק הזה.</div>}
        </section>
        <section className="stack">
          <h2 style={{ fontSize: 18 }}>דירוגים <small className="muted">({reviews.length})</small></h2>
          {reviews.length ? <ul className="reviews">{reviews.map((r) => <li key={r.id}><div className="fd-row"><b>{familyName(r.family)}</b><span className="stars"><i>{'★'.repeat(r.rating)}</i></span></div>{r.text ? <p>{r.text}</p> : null}<small className="muted">{fmtDate(r.created_at)}</small></li>)}</ul> : <div className="fd-note">אין דירוגים עדיין.</div>}
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
              <thead><tr><th>מתי</th><th>משפחה</th><th>הטבה</th><th>עסקה</th><th>עמלה</th><th>חיסכון</th><th>הערה</th></tr></thead>
              <tbody>{reds.map((r) => (<tr key={r.id}><td className="num">{fmtDateTime(r.created_at)}</td><td><b>{familyName(r.family)}</b></td><td>{r.benefit_title}</td><td className="num">{Number(r.order_amount) ? ils(r.order_amount) : '—'}</td><td className="num">{Number(r.commission) ? ils(r.commission) : '—'}</td><td className="num">{Number(r.amount_saved) ? ils(r.amount_saved) : '—'}</td><td className="muted">{r.note}</td></tr>))}</tbody>
            </table></div>) : <div className="fd-note">עדיין לא מומשו הטבות אצל הספק הזה.</div>}
        </section>
      </div>
    </div>
  );
}
