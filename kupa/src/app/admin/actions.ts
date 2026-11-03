'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { login, logout, isAdmin } from '@/lib/admin';
import { many, one } from '@/lib/db';
import { UUID_RE } from '@/lib/tokens';
import { round2 } from '@/lib/format';

export type LoginState = { error?: string } | undefined;

export async function adminLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  if (!process.env.ADMIN_PASSWORD) return { error: 'ADMIN_PASSWORD לא מוגדר בסביבה.' };
  const ok = await login(String(fd.get('password') || ''));
  if (!ok) return { error: 'סיסמה שגויה.' };
  redirect('/admin');
}

export async function adminLogout() { await logout(); redirect('/admin'); }

export type PayoutState = { error?: string; ok?: string } | undefined;

export async function addPayout(fundId: string, _prev: PayoutState, fd: FormData): Promise<PayoutState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(fundId)) return { error: 'קופה לא תקינה' };
  const payee = String(fd.get('payee') || '').trim().slice(0, 120);
  const amount = round2(Number(String(fd.get('amount') || '').replace(/[^\d.]/g, '')));
  const paidOn = String(fd.get('paid_on') || '').slice(0, 10) || null;
  if (payee.length < 2) return { error: 'צריך שם ספק.' };
  if (!(amount > 0)) return { error: 'צריך סכום.' };
  const fund = await one<{ id: string }>(`SELECT id FROM kupa_funds WHERE id = $1`, [fundId]);
  if (!fund) return { error: 'הקופה לא נמצאה' };
  await many(
    `INSERT INTO kupa_payouts (fund_id, payee, purpose, amount, paid_on, note, visible) VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7)`,
    [fundId, payee, String(fd.get('purpose') || '').trim().slice(0, 200) || null, amount, paidOn, String(fd.get('note') || '').trim().slice(0, 300) || null, fd.get('visible') === 'on']);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
  return { ok: 'התשלום נרשם.' };
}

export async function deletePayout(fundId: string, id: string) {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(id)) return;
  await many(`DELETE FROM kupa_payouts WHERE id = $1 AND fund_id = $2`, [id, fundId]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
}

export type ReqState = { error?: string; ok?: string } | undefined;

/** אישור: רושם תשלום לספק מתוך הבקשה ומסמן אותה "שולם". */
export async function approveRequest(fundId: string, id: string, _prev: ReqState, fd: FormData): Promise<ReqState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(fundId) || !UUID_RE.test(id)) return { error: 'בקשה לא תקינה' };
  const req = await one<{ payee: string; purpose: string | null; amount: unknown; note: string | null }>(
    `SELECT payee, purpose, amount, note FROM kupa_payout_requests WHERE id = $1 AND fund_id = $2 AND status = 'pending'`, [id, fundId]);
  if (!req) return { error: 'הבקשה כבר טופלה' };
  const amount = round2(Number(String(fd.get('amount') || '').replace(/[^\d.]/g, '')) || Number(req.amount));
  if (!(amount > 0)) return { error: 'סכום לא תקין' };
  const paidOn = String(fd.get('paid_on') || '').slice(0, 10) || null;
  const adminNote = String(fd.get('admin_note') || '').trim().slice(0, 300) || null;
  const pay = await one<{ id: string }>(
    `INSERT INTO kupa_payouts (fund_id, payee, purpose, amount, paid_on, note, visible) VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,true) RETURNING id`,
    [fundId, req.payee, req.purpose, amount, paidOn, req.note]);
  await many(`UPDATE kupa_payout_requests SET status = 'paid', amount = $3, admin_note = $4, payout_id = $5, updated_at = now() WHERE id = $1 AND fund_id = $2`,
    [id, fundId, amount, adminNote, pay?.id ?? null]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
  return { ok: 'אושר ונרשם כתשלום.' };
}

export async function rejectRequest(fundId: string, id: string, _prev: ReqState, fd: FormData): Promise<ReqState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(fundId) || !UUID_RE.test(id)) return { error: 'בקשה לא תקינה' };
  const adminNote = String(fd.get('reason') || '').trim().slice(0, 300);
  if (adminNote.length < 2) return { error: 'כתבו למשפחה למה לא אושר.' };
  await many(`UPDATE kupa_payout_requests SET status = 'rejected', admin_note = $3, updated_at = now() WHERE id = $1 AND fund_id = $2 AND status = 'pending'`, [id, fundId, adminNote]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
  return { ok: 'הבקשה נדחתה והמשפחה תראה את ההסבר.' };
}

export async function adminSetStatus(fundId: string, status: 'open' | 'closed') {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(fundId)) return;
  await many(`UPDATE kupa_funds SET status = $2, closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END, updated_at = now() WHERE id = $1`, [fundId, status]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
}
