// עמוד הספק: נפתח מסריקת ה-QR של כרטיס המשפחה. מציג יתרה זמינה ומאפשר
// בקשת חיוב. בלי פרטי המשפחה, בלי רשימת מפקידים.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fundByCard, totals, cardLast4 } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { ils, familyName } from '@/lib/format';
import { FAMILY_BRAND as BRAND } from '@/lib/site';
import FamilyCard from '@/components/FamilyCard';
import ChargeForm from './ChargeForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כרטיס המשפחה · חיוב', robots: { index: false, follow: false } };
type Props = { params: Promise<{ card: string }> };

export default async function SupplierPage({ params }: Props) {
  const { card } = await params;
  if (!TOKEN_RE.test(card)) notFound();
  const fund = await fundByCard(card);
  if (!fund) notFound();
  const tot = await totals(fund.id);
  return (
    <div className="fd">
      <div className="topbar"><b style={{ fontFamily: "'Frank Ruhl Libre',Georgia,serif", color: 'var(--navy)', fontSize: 17 }}>{BRAND}</b></div>
      <div className="pad stack" style={{ gap: 16 }}>
        <FamilyCard familyName={familyName(fund.display_name)} last4={cardLast4(fund)} />
        <div className="stats">
          <div className="stat"><small>יתרה זמינה בכרטיס</small><b>{ils(tot.available)}</b></div>
        </div>
        <div className="panel">
          <h2>בקשת חיוב</h2>
          <p className="muted" style={{ marginBottom: 12 }}>זה כרטיס סגור של {familyName(fund.display_name)}. ממלאים כמה ועל מה, המשפחה והצוות רואים, ואחרי אישור התשלום מועבר אליכם.</p>
          <ChargeForm card={card} />
        </div>
      </div>
    </div>
  );
}
