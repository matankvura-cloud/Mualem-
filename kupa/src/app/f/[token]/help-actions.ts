'use server';
// קרוב שלוקח בקשת עזרה מהעמוד הציבורי: שם וטלפון, בלי חשבון.
import { revalidatePath } from 'next/cache';
import { many, one } from '@/lib/db';
import { fundByToken } from '@/lib/funds';
import { TOKEN_RE, UUID_RE } from '@/lib/tokens';
import type { HelpRequest } from '@/lib/family';

export type TakeState = { error?: string; ok?: string; id?: string } | undefined;

export async function takeHelp(token: string, _prev: TakeState, fd: FormData): Promise<TakeState> {
  if (!TOKEN_RE.test(token)) return { error: 'הקישור לא תקין' };
  const fund = await fundByToken(token);
  const id = String(fd.get('id') || '');
  if (!fund || !UUID_RE.test(id)) return { error: 'הבקשה לא נמצאה' };
  const name = String(fd.get('name') || '').trim().slice(0, 80), phone = String(fd.get('phone') || '').trim().slice(0, 30);
  if (name.length < 2) return { error: 'איך קוראים לך?', id };
  if (phone.replace(/\D/g, '').length < 9) return { error: 'טלפון, כדי שהמשפחה תוכל לתאם.', id };
  const req = await one<HelpRequest>(`SELECT * FROM kupa_help_requests WHERE id = $1 AND fund_id = $2`, [id, fund.id]);
  if (!req) return { error: 'הבקשה לא נמצאה' };
  if (req.status !== 'open') return { error: 'מישהו כבר לקח את זה. תודה בכל מקרה.', id };
  await many(`UPDATE kupa_help_requests SET status = 'taken', helper_name = $3, helper_phone = $4, taken_at = now() WHERE id = $1 AND fund_id = $2 AND status = 'open'`, [id, fund.id, name, phone]);
  revalidatePath(`/f/${token}`);
  return { ok: `תודה ${name}. המשפחה רואה שאת/ה לוקח/ת את זה, ותתאם איתך.`, id };
}
