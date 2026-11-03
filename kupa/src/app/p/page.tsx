// פורטל הספק: פרופיל, הטבות, מימושים. כניסה בקישור שהניהול מנפיק.
import type { Metadata } from 'next';
import Link from 'next/link';
import { currentSupplier } from '@/lib/supplier-auth';
import { benefitsOf, redemptionsOfSupplier } from '@/lib/funds';
import { fmtBenefit } from '@/lib/card';
import { ils, fmtDateTime, familyName } from '@/lib/format';
import { FAMILY_BRAND as BRAND, CONTACT_PHONE } from '@/lib/site';
import { BenefitForm, ProfileForm } from './SupplierForms';
import { toggleBenefit, supplierSignOut } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'פורטל ספקים', robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ login?: string }> };

export default async function SupplierPortal({ searchParams }: Props) {
  const { login } = await searchParams;
  const sup = await currentSupplier();
  if (!sup) {
    return (
      <div className="fd"><div className="fd-pay" style={{ paddingTop: 40 }}>
        <div><h1>פורטל ספקים</h1><p className="lead">ספקים משתתפים של {BRAND} מנהלים כאן את ההטבות שלהם ורואים מימושים.</p></div>
        {login === 'expired' ? <div className="notice notice-warn">קישור הכניסה פג או כבר שימש. בקשו קישור חדש.</div> : login === 'bad' ? <div className="notice notice-err">קישור לא תקין.</div> : null}
        <div className="fd-note">הכניסה היא בקישור אישי שאנחנו שולחים לכם. אין סיסמה. {CONTACT_PHONE ? <>לקבלת קישור או הצטרפות: <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>.</> : 'לקבלת קישור או הצטרפות פנו אלינו.'}</div>
        <Link className="btn-outline" href="/">לדף הבית</Link>
      </div></div>
    );
  }
  const [benefits, reds] = await Promise.all([benefitsOf(sup.id), redemptionsOfSupplier(sup.id)]);
  return (
    <div className="fd fd-wide">
      <div className="topbar"><b style={{ fontFamily: "'Frank Ruhl Libre',Georgia,serif", color: 'var(--navy)', fontSize: 17 }}>{BRAND} · ספקים</b>
        <form action={supplierSignOut}><button className="btn-ghost" type="submit" style={{ minHeight: 36, fontSize: 13 }}>לצאת</button></form></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <div><h1 className="page-title">{sup.name}</h1><p className="lead">{sup.category}{sup.city ? ` · ${sup.city}` : ''} · <span className={`pill ${sup.status === 'active' ? 'pill-ok' : 'pill-warn'}`}>{sup.status === 'active' ? 'ספק פעיל' : 'ממתין לאישור'}</span></p></div>
        {sup.status !== 'active' ? <div className="notice notice-warn">הפרופיל וההטבות יוצגו למשפחות אחרי שנאשר אתכם. אפשר כבר להכין את ההטבות.</div> : null}
        <div className="fd-note"><b>איך מממשים הטבה:</b> המשפחה מציגה את הכרטיס שלה בטלפון. סורקים את הקוד עם מצלמת הטלפון שלכם (מחוברים לפורטל הזה), בוחרים הטבה ולוחצים "לממש". הקוד מתחלף כל דקה, אז צילום מסך לא תקף.</div>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>ההטבות שלכם</h2>
          {benefits.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>הטבה</th><th>ערך</th><th>תנאים</th><th>למשפחה</th><th>מצב</th><th></th></tr></thead>
              <tbody>{benefits.map((b) => (
                <tr key={b.id}><td><b>{b.title}</b></td><td>{fmtBenefit(b)}</td><td className="muted">{b.terms}{b.valid_until ? ` · עד ${String(b.valid_until).slice(0, 10)}` : ''}</td><td className="num">{b.max_per_family}</td>
                  <td><span className={`pill ${b.active ? 'pill-ok' : 'pill-muted'}`}>{b.active ? 'פעילה' : 'כבויה'}</span></td>
                  <td><form action={toggleBenefit.bind(null, sup.id, false, b.id, !b.active)}><button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 12 }}>{b.active ? 'לכבות' : 'להפעיל'}</button></form></td></tr>))}</tbody>
            </table></div>
          ) : <div className="fd-note">עדיין אין הטבות. הוסיפו את הראשונה למטה.</div>}
          <BenefitForm supplierId={sup.id} />
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 18 }}>מימושים <small className="muted">({reds.length})</small></h2>
          {reds.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>מתי</th><th>משפחה</th><th>הטבה</th><th>חיסכון</th><th>הערה</th></tr></thead>
              <tbody>{reds.map((r) => (
                <tr key={r.id}><td className="num">{fmtDateTime(r.created_at)}</td><td><b>{familyName(r.family)}</b></td><td>{r.benefit_title}</td><td className="num">{Number(r.amount_saved) ? ils(r.amount_saved) : '—'}</td><td className="muted">{r.note}</td></tr>))}</tbody>
            </table></div>
          ) : <div className="fd-note">עדיין לא מומשו הטבות אצלכם.</div>}
        </section>

        <ProfileForm v={sup} />
      </div>
    </div>
  );
}
