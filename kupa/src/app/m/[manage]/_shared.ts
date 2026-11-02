import { notFound } from 'next/navigation';
import { fundByManage, totals, ensureCardToken, cardLast4 } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';
import { familyName } from '@/lib/format';

/** טוען את הקופה לפי קישור הניהול, או 404. */
export async function loadFamily(manage: string) {
  if (!TOKEN_RE.test(manage)) notFound();
  const fund = await fundByManage(manage);
  if (!fund) notFound();
  const [tot, site, cardToken] = await Promise.all([totals(fund.id), siteUrl(), ensureCardToken(fund)]);
  return {
    fund, tot, site, cardToken,
    publicLink: `${site}/f/${fund.token}`, manageLink: `${site}/m/${manage}`, cardLink: `${site}/s/${cardToken}`,
    family: familyName(fund.display_name), last4: cardLast4(fund),
  };
}
