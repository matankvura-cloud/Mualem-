import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { fundByToken } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { num } from '@/lib/db';
import { was } from '@/lib/format';
import { FEE_MODE } from '@/lib/site';
import GiveForm from './GiveForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הפקדה', robots: { index: false, follow: false } };
type Props = { params: Promise<{ token: string }> };

export default async function GivePage({ params }: Props) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();
  const fund = await fundByToken(token);
  if (!fund) notFound();
  if (fund.status === 'closed') redirect(`/f/${token}`);
  return (
    <div className="fd">
      <div style={{ padding: '8px 10px' }}><Link className="fd-back" href={`/f/${token}`}>&rsaquo; חזרה לקופה של {fund.display_name}</Link></div>
      <GiveForm token={token} displayName={fund.display_name} wasWord={was(fund.gender)} showAmounts={fund.show_amounts} allowMessages={fund.allow_messages} feePct={num(fund.fee_pct)} feeMode={FEE_MODE} />
      <div className="fd-note" style={{ margin: '0 20px 30px' }}>
        <b>לאן הכסף הולך:</b> {fund.purpose || 'לקופה של המשפחה, לתשלום הלוויה, השבעה והמצבה.'}{fund.surplus_to ? ` עודף, אם יישאר, ${fund.surplus_to}.` : ''}
      </div>
    </div>
  );
}
