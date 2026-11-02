import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fundByToken, totals, book, bumpViews } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { siteUrl, BRAND } from '@/lib/site';
import { memOf } from '@/lib/format';
import FundPublic from '@/components/FundPublic';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const fund = TOKEN_RE.test(token) ? await fundByToken(token) : null;
  return {
    title: fund ? `${memOf(fund.gender)} ${fund.display_name}` : BRAND,
    description: fund ? `${BRAND}: הקופה של משפחת ${fund.display_name}.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function FundPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { paid } = await searchParams;
  if (!TOKEN_RE.test(token)) notFound();
  const fund = await fundByToken(token);
  if (!fund) notFound();

  if (paid !== undefined) {
    const ok = paid === '1';
    return (
      <div className="fd"><div className="fd-paid">
        <div className="big" aria-hidden="true">{ok ? '🕯️' : '⚠️'}</div>
        <h1 style={{ fontSize: 22, margin: '14px 0 8px' }}>{ok ? 'תודה. ההפקדה התקבלה' : 'ההפקדה לא הושלמה'}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 420, margin: '0 auto', color: '#5B6472' }}>
          {ok ? `המשפחה של ${fund.display_name} תראה את שמך בקופה בדקות הקרובות. הקבלה נשלחת למייל אם ציינת.`
              : 'החיוב לא עבר ולא נגבה דבר. אפשר לנסות שוב.'}
        </p>
        <Link className="btn" href={ok ? `/f/${token}` : `/f/${token}/give`} style={{ maxWidth: 300, margin: '24px auto 0' }}>{ok ? 'לקופה' : 'לנסות שוב'}</Link>
      </div></div>
    );
  }

  const [tot, entries, site] = await Promise.all([totals(fund.id), book(fund), siteUrl()]);
  bumpViews(fund.id);
  return (
    <div className="fd">
      <FundPublic fund={fund} t={token} totals={tot} book={entries} site={site} />
      <Footer />
    </div>
  );
}
