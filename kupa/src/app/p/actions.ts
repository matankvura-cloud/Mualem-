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
  const description = String(fd.get('description') || '').trim().slice(0, 400) || null;
  const city = String(fd.get('city') || '').trim().slice(0, 80) || null;
  const phone = String(fd.get('phone') || '').trim().slice(0, 30) || null;
  const website = String(fd.get('website') || '').trim().slice(0, 200) || null;
  await many(`UPDATE kupa_suppliers SET description = $2, city = $3, phone = $4, website = $5, updated_at = now() WHERE id = $1`, [sup.id, description, city, phone, website]);
  revalidatePath('/p');
  return { ok: 'הפרופיל נשמר.' };
}

export async function supplierSignOut() { await supplierLogout(); redirect('/p'); }
