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

/* ---------- שלב 1: ספקים וכרטיס ---------- */
export type SupplierState = { error?: string; ok?: string; link?: string } | undefined;
const ICONS = new Set(['meal', 'chairs', 'stone', 'home', 'flowers', 'transport']);
const newPin = () => String(Math.floor(100000 + Math.random() * 900000));
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9֐-׿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'supplier';

export async function addSupplier(_prev: SupplierState, fd: FormData): Promise<SupplierState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  const name = String(fd.get('name') || '').trim().slice(0, 120);
  const category = String(fd.get('category') || '').trim().slice(0, 60);
  const icon = String(fd.get('icon') || 'meal');
  if (name.length < 2) return { error: 'צריך שם ספק.' };
  if (category.length < 2) return { error: 'צריך קטגוריה.' };
  const { token } = await import('@/lib/tokens');
  const slug = `${slugify(name)}-${token(3)}`;
  const commission = Math.max(0, Math.min(50, Number(String(fd.get('commission_pct') || '').replace(/[^\d.]/g, '')) || 0));
  const row = await one<{ id: string }>(
    `INSERT INTO kupa_suppliers (slug, name, category, icon, description, city, phone, email, status, pin, commission_pct) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [slug, name, category, ICONS.has(icon) ? icon : 'meal', String(fd.get('description') || '').trim().slice(0, 400) || null,
      String(fd.get('city') || '').trim().slice(0, 80) || null, String(fd.get('phone') || '').trim().slice(0, 30) || null,
      String(fd.get('email') || '').trim().slice(0, 160) || null, fd.get('activate') === 'on' ? 'active' : 'pending', newPin(), commission]);
  revalidatePath('/admin/suppliers');
  if (row) redirect(`/admin/suppliers/${row.id}`);
  return { ok: 'הספק נוסף.' };
}

export async function setSupplierStatus(id: string, status: 'active' | 'pending' | 'inactive') {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(id)) return;
  await many(`UPDATE kupa_suppliers SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
  revalidatePath('/admin/suppliers'); revalidatePath(`/admin/suppliers/${id}`);
}

/** קישור כניסה לספק, ל-7 ימים. מוצג פעם אחת; מתן שולח לספק בוואטסאפ. */
export async function makeSupplierLogin(id: string, _prev: SupplierState): Promise<SupplierState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(id)) return { error: 'ספק לא תקין' };
  const { issueSupplierLogin } = await import('@/lib/supplier-auth');
  const { siteUrl } = await import('@/lib/site');
  const t = await issueSupplierLogin(id, 7);
  return { ok: 'הקישור תקף 7 ימים ולפתיחה אחת.', link: `${await siteUrl()}/p/login/${t}` };
}

export type CardState2 = { error?: string; ok?: string } | undefined;

export async function adminSetCard(fundId: string, _prev: CardState2, fd: FormData): Promise<CardState2> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(fundId)) return { error: 'קופה לא תקינה' };
  const act = String(fd.get('act') || '');
  if (act === 'block') {
    const reason = String(fd.get('reason') || '').trim().slice(0, 200) || null;
    await many(`UPDATE kupa_funds SET card_status = 'blocked', card_block_reason = $2, updated_at = now() WHERE id = $1`, [fundId, reason]);
  } else if (act === 'unblock') {
    await many(`UPDATE kupa_funds SET card_status = 'active', card_block_reason = NULL, updated_at = now() WHERE id = $1`, [fundId]);
  } else if (act === 'valid') {
    const until = String(fd.get('valid_until') || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return { error: 'תאריך לא תקין' };
    await many(`UPDATE kupa_funds SET card_valid_until = $2::date, updated_at = now() WHERE id = $1`, [fundId, until]);
  } else return { error: 'פעולה לא מוכרת' };
  revalidatePath(`/admin/${fundId}`); revalidatePath('/admin');
  return { ok: 'הכרטיס עודכן.' };
}

export async function regenSupplierPin(id: string) {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(id)) return;
  await many(`UPDATE kupa_suppliers SET pin = $2, updated_at = now() WHERE id = $1`, [id, newPin()]);
  revalidatePath(`/admin/suppliers/${id}`);
}

export async function setSupplierCommission(id: string, _prev: SupplierState, fd: FormData): Promise<SupplierState> {
  if (!(await isAdmin())) return { error: 'לא מחובר' };
  if (!UUID_RE.test(id)) return { error: 'ספק לא תקין' };
  const pct = Number(String(fd.get('commission_pct') || '').replace(/[^\d.]/g, ''));
  if (!(pct >= 0 && pct <= 50)) return { error: 'עמלה בין 0 ל-50 אחוז.' };
  await many(`UPDATE kupa_suppliers SET commission_pct = $2, updated_at = now() WHERE id = $1`, [id, pct]);
  revalidatePath(`/admin/suppliers/${id}`); revalidatePath('/admin/suppliers');
  return { ok: 'העמלה עודכנה.' };
}

export async function setSupplierVerified(id: string, verified: boolean) {
  if (!(await isAdmin())) return;
  if (!UUID_RE.test(id)) return;
  await many(`UPDATE kupa_suppliers SET verified = $2, updated_at = now() WHERE id = $1`, [id, verified]);
  revalidatePath(`/admin/suppliers/${id}`); revalidatePath('/admin/suppliers'); revalidatePath('/suppliers');
}

/** הרכז/ת האישי/ת של המשפחה (מוצג בבית של המשפחה). */
export async function setCoordinator(fundId: string, fd: FormData) {
  if (!(await isAdmin()) || !UUID_RE.test(fundId)) return;
  const name = String(fd.get('coordinator_name') || '').trim().slice(0, 80) || null;
  const phone = String(fd.get('coordinator_phone') || '').trim().slice(0, 30) || null;
  await many(`UPDATE kupa_funds SET coordinator_name = $2, coordinator_phone = $3, updated_at = now() WHERE id = $1`, [fundId, name, phone]);
  revalidatePath(`/admin/${fundId}`);
}

/** פורטל מעסיקים: סטטוס המקרה וקישור לקופה של המשפחה. */
export async function setCaseStatus(caseId: string, fd: FormData) {
  if (!(await isAdmin()) || !UUID_RE.test(caseId)) return;
  const status = String(fd.get('status') || '');
  if (!['new', 'contacted', 'active', 'done'].includes(status)) return;
  const fundId = String(fd.get('fund_id') || '');
  const fid = UUID_RE.test(fundId) ? fundId : null;
  await many(`UPDATE kupa_employer_cases SET status = $2, fund_id = $3, updated_at = now() WHERE id = $1`, [caseId, status, fid]);
  const c = await one<{ approved_at: unknown; note: string | null; company: string }>(`SELECT c.approved_at, c.note, e.company FROM kupa_employer_cases c JOIN kupa_employers e ON e.id = c.employer_id WHERE c.id = $1`, [caseId]);
  if (fid && c?.approved_at) {
    await many(`INSERT INTO kupa_forms (fund_id, form_key, status, signer_name, signed_at, note, updated_at) VALUES ($1,'employer','signed',$2,now(),$3,now()) ON CONFLICT (fund_id, form_key) DO UPDATE SET status='signed', signed_at=now(), note=EXCLUDED.note, updated_at=now()`, [fid, c.company, c.company]);
  } else if (fid) {
    await many(`INSERT INTO kupa_forms (fund_id, form_key, status, updated_at) VALUES ($1,'employer','signing',now()) ON CONFLICT (fund_id, form_key) DO UPDATE SET status = CASE WHEN kupa_forms.status = 'signed' THEN 'signed' ELSE 'signing' END, updated_at=now()`, [fid]);
  }
  revalidatePath('/admin/employers');
}
