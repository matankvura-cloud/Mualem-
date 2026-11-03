// לוגו ספק, ציבורי.
import { one } from '@/lib/db';
import { UUID_RE } from '@/lib/tokens';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response('bad', { status: 400 });
  const row = await one<{ logo: Uint8Array | null; logo_mime: string | null }>(`SELECT logo, logo_mime FROM kupa_suppliers WHERE id = $1`, [id]);
  if (!row?.logo || !row.logo_mime) return new Response('no logo', { status: 404 });
  return new Response(new Uint8Array(row.logo), { headers: { 'content-type': row.logo_mime, 'cache-control': 'public, max-age=300' } });
}
