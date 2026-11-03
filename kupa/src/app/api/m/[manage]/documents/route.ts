// העלאת מסמך לתיק (טופס רגיל, בלי JS). עד 4MB, PDF או תמונה. מפנה חזרה לתיק.
import { fundByManage } from '@/lib/funds';
import { many } from '@/lib/db';
import { TOKEN_RE } from '@/lib/tokens';
import { DOC_KINDS } from '@/data/documents';

export const runtime = 'nodejs';
const MAX = 4 * 1024 * 1024;
const OK_MIME = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/;
const back = (manage: string, q: string) => new Response(null, { status: 303, headers: { location: `/m/${manage}/file?${q}#docs` } });

export async function POST(req: Request, ctx: { params: Promise<{ manage: string }> }) {
  const { manage } = await ctx.params;
  if (!TOKEN_RE.test(manage)) return new Response('bad link', { status: 400 });
  const fund = await fundByManage(manage);
  if (!fund) return new Response('not found', { status: 404 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get('file');
  if (!fd || !(file instanceof File) || !file.size) return back(manage, 'doc=empty');
  if (file.size > MAX) return back(manage, 'doc=big');
  const mime = file.type || 'application/octet-stream';
  if (!OK_MIME.test(mime)) return back(manage, 'doc=type');
  const kind = DOC_KINDS.some((k) => k.key === String(fd.get('kind'))) ? String(fd.get('kind')) : 'other';
  const name = (String(fd.get('name') || '').trim() || file.name || 'מסמך').slice(0, 120);
  const note = String(fd.get('note') || '').trim().slice(0, 300) || null;
  const buf = Buffer.from(await file.arrayBuffer());
  await many(`INSERT INTO kupa_documents (fund_id, kind, name, mime, size, data, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [fund.id, kind, name, mime, buf.length, buf, note]);
  return back(manage, 'doc=ok');
}
