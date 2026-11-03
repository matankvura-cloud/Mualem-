// פתיחת קישור כניסה של ספק: קובע עוגייה ומפנה לפורטל.
import { redirect } from 'next/navigation';
import { TOKEN_RE } from '@/lib/tokens';
import { redeemSupplierLogin } from '@/lib/supplier-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) redirect('/p?login=bad');
  const sup = await redeemSupplierLogin(token);
  redirect(sup ? '/p' : '/p?login=expired');
}
