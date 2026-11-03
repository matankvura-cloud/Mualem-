// עמוד הספק: נפתח מסריקת ה-QR של כרטיס המשפחה. ספק מחובר רואה את ההטבות שלו
// ומממש; כל ספק יכול לשלוח בקשת חיוב. בלי פרטי המשפחה, בלי רשימת מפקידים.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fundByCard, totals, cardLast4, benefitsOf, redemptionCount } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { ils, familyName, fmtDate } from '@/lib/format';
import { FAMILY_BRAND as BRAND } from '@/lib/site';
import { cardState, CARD_STATE_LABEL, verifyCard, fmtBenefit } from '@/lib/card';
import { currentSupplier } from '@/lib/supplier-auth';
import FamilyCard from '@/components/FamilyCard';
import ChargeForm from './ChargeForm';
import RedeemForm from './RedeemForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כרטיס המשפחה', robots: { index: false, follow: false } };
type Props = { params: Promise<{ card: string }>; searchParams: Promise<{ t?: string }> };

export default async function SupplierPage({ params, searchParams }: Props) {
  const { card } = await params;
  const { t } = await searchParams;
  if (!TOKEN_RE.test(card)) notFound();
  const fund = await fundByCard(card);
  if (!fund) notFound();
  const [tot, supplier] = await Promise.all([totals(fund.id), currentSupplier()]);
  const state = cardState(fund);
  const [stateLabel, stateCls] = CARD_STATE_LABEL[state];
  const sig = verifyCard(card, t);
  const fam = familyName(fund.display_name);
  const benefits = supplier ? (await benefitsOf(supplier.id)).filter((b) => b.active) : [];
  const used = supplier ? Object.fromEntries(await Promise.all(benefits.map(async (b) => [b.id, await redemptionCount(fund.id, b.id)]))) : {};

  return (
    <div className="fd">
      <div className="topbar"><b style={{ fontFamily: "'Frank Ruhl Libre',Georgia,serif", color: 'var(--navy)', fontSize: 17 }}>{BRAND}</b>
        {supplier ? <Link href="/p" className="muted" style={{ fontSize: 13 }}>{supplier.name} · הפורטל שלי</Link> : <Link href="/p" className="muted" style={{ fontSize: 13 }}>כניסת ספקים</Link>}</div>
      <div className="pad stack" style={{ gap: 16 }}>
        <FamilyCard familyName={fam} last4={cardLast4(fund)} />
        <div className="card-meta"><span className={`pill ${stateCls}`}>{stateLabel}</span>{fund.card_valid_until ? <small className="muted">בתוקף עד {fmtDate(fund.card_valid_until)}</small> : null}</div>

        {state !== 'active' ? (
          <div className="notice notice-err"><b>הכרטיס לא פעיל</b> ({stateLabel}). אין לממש הטבה ואין לקבל אותו כאמצעי תשלום.</div>
        ) : null}

        <div className="panel">
          <h2>מימוש הטבה</h2>
          {!supplier ? (
            <p className="muted">כדי לממש הטבה צריך להיות ספק משתתף ומחובר. <Link href="/p">כניסת ספקים</Link>. ספק שעדיין לא הצטרף יכול לשלוח בקשת חיוב למטה.</p>
          ) : state !== 'active' ? (
            <p className="muted">הכרטיס לא פעיל, אי אפשר לממש.</p>
          ) : !sig.ok ? (
            <div className="notice notice-warn"><b>{sig.reason === 'missing' ? 'זה לא קוד שנסרק מהכרטיס.' : 'הקוד שנסרק כבר לא טרי.'}</b> בקשו מהמשפחה להציג את הכרטיס מהמסך שלהם וסרקו שוב. זה מגן עליכם ועל המשפחה מזיופים.</div>
          ) : !benefits.length ? (
            <p className="muted">אין לכם הטבות פעילות. מוסיפים הטבה <Link href="/p">בפורטל</Link>.</p>
          ) : (
            <RedeemForm card={card} t={t || ''} benefits={benefits.map((b) => ({ id: b.id, title: b.title, label: fmtBenefit(b), terms: b.terms, left: Math.max(0, b.max_per_family - (used[b.id] || 0)) }))} />
          )}
        </div>

        <div className="stats">
          <div className="stat"><small>יתרה זמינה בכרטיס</small><b>{ils(tot.available)}</b></div>
        </div>
        <div className="panel">
          <h2>בקשת חיוב</h2>
          <p className="muted" style={{ marginBottom: 12 }}>זה כרטיס סגור של {fam}. ממלאים כמה ועל מה, המשפחה והצוות רואים, ואחרי אישור התשלום מועבר אליכם.</p>
          {state === 'active' ? <ChargeForm card={card} /> : <p className="muted">הכרטיס לא פעיל.</p>}
        </div>
      </div>
    </div>
  );
}
