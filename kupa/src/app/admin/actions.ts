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
  const fund = await one<{ id: string }>(`SELECT id FROM funds WHERE id = $1`, [fundId]);
  if (!fund) return { error: 'הקופה לא נמצאה' };
  await many(
    `INSERT INTO payouts (fund_id, payee, purpose, amount, paid_on, note, visible) VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7)`,
    [fundId, payee, String(fd.get('purpose') || '').trim().slice(0, 200) || null, amount, paidOn, String(fd.get('note') || '').trim().slice(0, 300) || null, fd.get('visible') === 'on']);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
  return { ok: 'התשלום נרשם.' };
}

export async function deletePayout(fundId: string, id: string) {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(id)) return;
  await many(`DELETE FROM payouts WHERE id = $1 AND fund_id = $2`, [id, fundId]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
}

export async function adminSetStatus(fundId: string, status: 'open' | 'closed') {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(fundId)) return;
  await many(`UPDATE funds SET status = $2, closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END, updated_at = now() WHERE id = $1`, [fundId, status]);
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
}
