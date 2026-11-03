// QR חי של כרטיס המשפחה: קישור הספק עם חתימה שמתחלפת. מתרענן בדף הכרטיס כל דקה.
import QRCode from 'qrcode';
import { fundByManage, ensureCardToken } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { siteUrl } from '@/lib/site';
import { signCard } from '@/lib/card';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ manage: string }> }) {
  const { manage } = await ctx.params;
  if (!TOKEN_RE.test(manage)) return new Response('bad link', { status: 400 });
  const fund = await fundByManage(manage);
  if (!fund) return new Response('not found', { status: 404 });
  const [card, site] = await Promise.all([ensureCardToken(fund), siteUrl()]);
  const url = `${site}/s/${card}?t=${signCard(card)}`;
  const png = await QRCode.toBuffer(url, { margin: 1, width: 360, color: { dark: '#16304D', light: '#FFFFFF' } });
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
}
