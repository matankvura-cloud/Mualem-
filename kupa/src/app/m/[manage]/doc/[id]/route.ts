// הורדה/צפייה במסמך מהתיק. רק עם קישור הניהול.
import { fundByManage } from '@/lib/funds';
import { one } from '@/lib/db';
import { TOKEN_RE, UUID_RE } from '@/lib/tokens';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ manage: string; id: string }> }) {
  const { manage, id } = await ctx.params;
  if (!TOKEN_RE.test(manage) || !UUID_RE.test(id)) return new Response('bad link', { status: 400 });
  const fund = await fundByManage(manage);
  if (!fund) return new Response('not found', { status: 404 });
  const d = await one<{ name: string; mime: string; data: Uint8Array | Buffer | string }>(`SELECT name, mime, data FROM kupa_documents WHERE id = $1 AND fund_id = $2`, [id, fund.id]);
  if (!d) return new Response('not found', { status: 404 });
  const bytes = typeof d.data === 'string' ? Buffer.from(d.data.replace(/^\\x/, ''), 'hex') : Buffer.from(d.data);
  return new Response(new Uint8Array(bytes), { headers: {
    'content-type': d.mime, 'content-length': String(bytes.length), 'cache-control': 'private, no-store',
    'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(d.name)}`, 'x-content-type-options': 'nosniff',
  } });
}
