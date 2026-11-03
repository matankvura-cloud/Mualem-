'use server';
import { revalidatePath } from 'next/cache';
import { fundByCard, totals } from '@/lib/funds';
import { many } from '@/lib/db';
import { TOKEN_RE } from '@/lib/tokens';
import { round2, ils } from '@/lib/format';

export type ChargeState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

/** בקשת חיוב מצד הספק דרך הכרטיס. נרשמת כבקשה ממתינה; מתן מאשר ומשלם. */
export async function requestCharge(card: string, _prev: ChargeState, fd: FormData): Promise<ChargeState> {
  if (!TOKEN_RE.test(card)) return { error: 'קישור לא תקין' };
  const fund = await fundByCard(card);
  if (!fund) return { error: 'הכרטיס לא נמצא' };
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  const payee = String(fd.get('payee') || '').trim().slice(0, 120);
  const contact = String(fd.get('contact') || '').trim().slice(0, 200);
  const amount = round2(Number(String(fd.get('amount') || '').replace(/[^\d.]/g, '')));
  if (payee.length < 2) return { error: 'שם העסק חסר.', values };
  if (contact.replace(/\D/g, '').length < 9) return { error: 'צריך טלפון, כדי שנוכל לחזור אליכם לתשלום.', values };
  if (!(amount > 0)) return { error: 'צריך סכום.', values };
  const t = await totals(fund.id);
  if (amount > t.available) return { error: `היתרה הזמינה בכרטיס היא ${ils(t.available)}.`, values };
  await many(
    `INSERT INTO kupa_payout_requests (fund_id, payee, purpose, amount, contact, note, source) VALUES ($1,$2,$3,$4,$5,$6,'supplier')`,
    [fund.id, payee, String(fd.get('purpose') || '').trim().slice(0, 200) || null, amount, contact, String(fd.get('note') || '').trim().slice(0, 400) || null]);
  revalidatePath('/admin'); revalidatePath(`/admin/${fund.id}`); revalidatePath(`/m/${fund.manage_token}/card`);
  return { ok: `הבקשה נשלחה למשפחה ולאישור. אחרי האישור נעביר ${ils(amount)} ל${payee}.` };
}
