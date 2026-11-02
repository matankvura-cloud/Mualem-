// ההודעה-חזרה ממורנינג (notifyUrl). פתוחה לאינטרנט, ולכן נושאת אסימון ?k=.
// custom = מזהה ההפקדה. תמיד מחזירים 200: חברת סליקה שמקבלת שגיאה חוזרת שוב ושוב.
import { NextResponse } from 'next/server';
import { one, many } from '@/lib/db';
import { UUID_RE, sameSecret } from '@/lib/tokens';
import { hookToken, looksPaid, failureKind, pick, readHookBody } from '@/lib/morning';

export const runtime = 'nodejs';
const json = (b: unknown, status = 200) => NextResponse.json(b, { status });

async function handle(req: Request) {
  const url = new URL(req.url);
  let want: string;
  try { want = hookToken(); } catch { return json({ ok: false, error: 'hook not configured' }, 503); }
  if (!sameSecret(url.searchParams.get('k') || '', want)) return json({ ok: false }, 401);

  const raw: Record<string, unknown> = req.method === 'GET'
    ? Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'k'))
    : await readHookBody(req);

  const depId = String(pick(raw, ['custom', 'Custom', 'customField', 'externalId']) ?? '');
  if (!UUID_RE.test(depId)) { console.error('hook: אין מזהה הפקדה', JSON.stringify(raw).slice(0, 400)); return json({ ok: true, ignored: 'no_id' }); }

  const dep = await one<{ id: string; status: string }>(`SELECT id, status FROM deposits WHERE id = $1`, [depId]);
  if (!dep) return json({ ok: true, ignored: 'unknown' });
  if (dep.status === 'paid') return json({ ok: true, already: true });

  if (!looksPaid(raw)) {
    const bad = failureKind(raw);
    if (bad) await many(`UPDATE deposits SET status = $2, raw = $3 WHERE id = $1 AND status = 'pending'`, [depId, bad, JSON.stringify(raw)]);
    return json({ ok: true, marked: bad || 'ignored' });
  }
  const docNum = pick(raw, ['documentNumber', 'docNumber', 'number']);
  await many(
    `UPDATE deposits SET status = 'paid', paid_at = now(), raw = $2, doc_number = $3, doc_url = $4 WHERE id = $1`,
    [depId, JSON.stringify(raw), docNum != null ? String(docNum) : null, String(pick(raw, ['documentUrl', 'url']) ?? '') || null]);
  return json({ ok: true });
}

export const GET = handle;
export const POST = handle;
