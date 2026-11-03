'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { many } from '@/lib/db';
import { UUID_RE } from '@/lib/tokens';
import { currentSupplier, supplierLogout } from '@/lib/supplier-auth';

export type FormState = { error?: string; ok?: string } | undefined;

const KINDS = new Set(['percent', 'fixed', 'gift']);

/** הוספת הטבה (הספק בפורטל, או הניהול בשם הספק). */
export async function saveBenefit(supplierId: string, asAdmin: boolean, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!UUID_RE.test(supplierId)) return { error: 'ספק לא תקין' };
  if (asAdmin) {
    const { isAdmin } = await import('@/lib/admin');
    if (!(await isAdmin())) return { error: 'לא מחובר' };
  } else {
    const sup = await currentSupplier();
    if (!sup || sup.id !== supplierId) return { error: 'לא מחובר' };
  }
  const title = String(fd.get('title') || '').trim().slice(0, 120);
  const kind = String(fd.get('kind') || 'percent');
  const value = Number(String(fd.get('value') || '').replace(/[^\d.]/g, '')) || null;
  const terms = String(fd.get('terms') || '').trim().slice(0, 300) || null;
  const max = Math.max(1, Math.min(20, Number(fd.get('max_per_family')) || 1));
  const from = String(fd.get('valid_from') || '').slice(0, 10) || null;
  const until = String(fd.get('valid_until') || '').slice(0, 10) || null;
  if (title.length < 2) return { error: 'צריך שם להטבה.' };
  if (!KINDS.has(kind)) return { error: 'סוג הטבה לא תקין.' };
  if (kind !== 'gift' && !(value && value > 0)) return { error: 'צריך ערך: אחוז או סכום.' };
  if (kind === 'percent' && value && value > 100) return { error: 'אחוז עד 100.' };
  await many(`INSERT INTO kupa_benefits (supplier_id, title, kind, value, terms, max_per_family, valid_from, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::date)`,
    [supplierId, title, kind, value, terms, max, from, until]);
  revalidatePath('/p'); revalidatePath(`/admin/suppliers/${supplierId}`);
  return { ok: 'ההטבה נוספה.' };
}

export async function toggleBenefit(supplierId: string, asAdmin: boolean, benefitId: string, active: boolean) {
  if (!UUID_RE.test(supplierId) || !UUID_RE.test(benefitId)) return;
  if (asAdmin) {
    const { isAdmin } = await import('@/lib/admin');
    if (!(await isAdmin())) return;
  } else {
    const sup = await currentSupplier();
    if (!sup || sup.id !== supplierId) return;
  }
  await many(`UPDATE kupa_benefits SET active = $3, updated_at = now() WHERE id = $1 AND supplier_id = $2`, [benefitId, supplierId, active]);
  revalidatePath('/p'); revalidatePath(`/admin/suppliers/${supplierId}`);
}

export async function updateSupplierProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const sup = await currentSupplier();
  if (!sup) return { error: 'לא מחובר' };
  const { cleanProfile, PROFILE_SET, profileParams } = await import('@/lib/supplier-profile');
  const prof = cleanProfile(fd);
  if (!prof.phone || prof.phone.replace(/\D/g, '').length < 9) return { error: 'צריך טלפון לפניות.' };
  await many(`UPDATE kupa_suppliers SET ${PROFILE_SET} WHERE id = $1`, [sup.id, ...profileParams(prof)]);
  revalidatePath('/p'); revalidatePath(`/suppliers/${sup.slug}`); revalidatePath('/suppliers');
  return { ok: 'הפרופיל נשמר. כך הוא מוצג למשפחות במדריך.' };
}

export async function supplierSignOut() { await supplierLogout(); redirect('/p'); }

/** לחיצה על "להיכנס" בדף קישור הכניסה. רק POST צורך את הקישור, כך שתצוגה מקדימה של וואטסאפ לא שורפת אותו. */
export async function enterWithToken(token: string) {
  const { TOKEN_RE } = await import('@/lib/tokens');
  const { redeemSupplierLogin } = await import('@/lib/supplier-auth');
  if (!TOKEN_RE.test(token)) redirect('/p?login=bad');
  const sup = await redeemSupplierLogin(token);
  redirect(sup ? '/p' : '/p?login=expired');
}

/** הספק מעדכן ליד: בטיפול / נסגר (עם סכום, מחשב עמלה) / לא יצא. */
export async function setLeadStatus(leadId: string, asAdmin: boolean, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!UUID_RE.test(leadId)) return { error: 'ליד לא תקין' };
  const { one } = await import('@/lib/db');
  const lead = await one<{ supplier_id: string }>(`SELECT supplier_id FROM kupa_leads WHERE id = $1`, [leadId]);
  if (!lead) return { error: 'הפנייה לא נמצאה' };
  if (asAdmin) {
    const { isAdmin } = await import('@/lib/admin');
    if (!(await isAdmin())) return { error: 'לא מחובר' };
  } else {
    const sup = await currentSupplier();
    if (!sup || sup.id !== lead.supplier_id) return { error: 'לא מחובר' };
  }
  const status = String(fd.get('status') || '');
  if (!['contacted', 'closed', 'lost', 'new'].includes(status)) return { error: 'מצב לא תקין' };
  const note = String(fd.get('note') || '').trim().slice(0, 300) || null;
  if (status === 'closed') {
    const amount = Number(String(fd.get('order_amount') || '').replace(/[^\d.]/g, ''));
    if (!(amount > 0)) return { error: 'כדי לסגור צריך את סכום העבודה.' };
    const sup = await one<{ commission_pct: unknown }>(`SELECT commission_pct FROM kupa_suppliers WHERE id = $1`, [lead.supplier_id]);
    const commission = Math.round(amount * (Number(sup?.commission_pct) || 0)) / 100;
    await many(`UPDATE kupa_leads SET status = 'closed', order_amount = $2, commission = $3, note = COALESCE($4, note), updated_at = now() WHERE id = $1`, [leadId, amount, commission, note]);
  } else {
    await many(`UPDATE kupa_leads SET status = $2, note = COALESCE($3, note), updated_at = now() WHERE id = $1`, [leadId, status, note]);
  }
  revalidatePath('/p'); revalidatePath(`/admin/suppliers/${lead.supplier_id}`); revalidatePath('/admin/suppliers');
  return { ok: 'עודכן.' };
}
