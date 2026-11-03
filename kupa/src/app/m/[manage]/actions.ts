'use server';
import { revalidatePath } from 'next/cache';
import { many } from '@/lib/db';
import { fundByManage, cleanFundInput, totals } from '@/lib/funds';
import { round2 } from '@/lib/format';
import { ils } from '@/lib/format';
import { TOKEN_RE, token } from '@/lib/tokens';
import type { FundEvent } from '@/lib/format';

export type ActState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

async function own(manage: string) {
  if (!TOKEN_RE.test(manage)) return null;
  return fundByManage(manage);
}

export async function updateFund(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const f = cleanFundInput(fd);
  if (!f.display_name || f.display_name.length < 2) return { error: 'צריך את שם הנפטר/ת.' };
  await many(
    `UPDATE kupa_funds SET display_name=$2, gender=$16, years=$3, city=$4, quote=$5, quote_by=$6, photo_initial=$7, purpose=$8, target_ils=$9,
       surplus_to=$10, manager_name=COALESCE($11, manager_name), manager_phone=COALESCE($12, manager_phone), manager_email=$13,
       show_amounts=$14, allow_messages=$15, updated_at=now() WHERE id=$1`,
    [fund.id, f.display_name, f.years, f.city, f.quote, f.quote_by, f.display_name.trim().charAt(0), f.purpose, f.target_ils,
      f.surplus_to, f.manager_name, f.manager_phone, f.manager_email, f.show_amounts, f.allow_messages, f.gender]);
  revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
  return { ok: 'הפרטים נשמרו.' };
}

export async function addEvent(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const s = (k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max) || undefined;
  const kind = ['funeral', 'shiva', 'shloshim', 'azkara', 'other'].includes(String(fd.get('kind'))) ? String(fd.get('kind')) : 'other';
  const ev: FundEvent = { id: token(6), kind, label: s('label', 60), date: s('date', 10), time: s('time', 5), place: s('place', 160), address: s('address', 160), note: s('note', 160), maps_url: s('maps_url', 300) };
  if (ev.maps_url && !/^https?:\/\//i.test(ev.maps_url)) ev.maps_url = undefined;
  if (!ev.place && !ev.date) return { error: 'צריך לפחות תאריך או מקום.' };
  if (fund.events.length >= 12) return { error: 'אפשר עד 12 אירועים.' };
  const events = [...fund.events, ev].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  await many(`UPDATE kupa_funds SET events = $2, updated_at = now() WHERE id = $1`, [fund.id, JSON.stringify(events)]);
  revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
  return { ok: 'האירוע נוסף.' };
}

export async function requestPayout(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const payee = String(fd.get('payee') || '').trim().slice(0, 120);
  const amount = round2(Number(String(fd.get('amount') || '').replace(/[^\d.]/g, '')));
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  if (payee.length < 2) return { error: 'למי לשלם? כתבו את שם הספק.', values };
  if (!(amount > 0)) return { error: 'צריך סכום.', values };
  const t = await totals(fund.id);
  if (amount > t.available) return { error: `היתרה הזמינה היא ${ils(t.available)}${t.requested ? ` (אחרי ${ils(t.requested)} בבקשות שממתינות)` : ''}.`, values };
  await many(
    `INSERT INTO kupa_payout_requests (fund_id, payee, purpose, amount, contact, note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [fund.id, payee, String(fd.get('purpose') || '').trim().slice(0, 200) || null, amount,
      String(fd.get('contact') || '').trim().slice(0, 200) || null, String(fd.get('note') || '').trim().slice(0, 400) || null]);
  revalidatePath(`/m/${manage}`);
  return { ok: 'הבקשה נשלחה. נאשר ונשלם, ותראו את זה כאן.' };
}

export async function cancelRequest(manage: string, id: string) {
  const fund = await own(manage);
  if (!fund) return;
  await many(`DELETE FROM kupa_payout_requests WHERE id = $1 AND fund_id = $2 AND status = 'pending'`, [id, fund.id]);
  revalidatePath(`/m/${manage}`);
}

export async function removeEvent(manage: string, id: string) {
  const fund = await own(manage);
  if (!fund) return;
  await many(`UPDATE kupa_funds SET events = $2, updated_at = now() WHERE id = $1`, [fund.id, JSON.stringify(fund.events.filter((e) => e.id !== id))]);
  revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
}

export async function setStatus(manage: string, status: 'open' | 'closed') {
  const fund = await own(manage);
  if (!fund) return;
  await many(`UPDATE kupa_funds SET status = $2, closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END, updated_at = now() WHERE id = $1`, [fund.id, status]);
  revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
}
