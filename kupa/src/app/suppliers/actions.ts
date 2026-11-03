'use server';
import { revalidatePath } from 'next/cache';
import { many, one } from '@/lib/db';
import { UUID_RE, TOKEN_RE, token } from '@/lib/tokens';
import { fundByToken } from '@/lib/funds';
import { cleanProfile, PROFILE_SET, profileParams } from '@/lib/supplier-profile';

export type LeadState = { error?: string; ok?: string; wa?: string; values?: Record<string, string> } | undefined;
const digits = (s: string) => s.replace(/\D/g, '');
const waNumber = (phone: string) => { const d = digits(phone); return d.startsWith('0') ? `972${d.slice(1)}` : d; };

/** בקשת הצעה מספק. נרשמת כליד; הפונה מקבל כפתור לשלוח לספק בוואטסאפ עם הפרטים. */
export async function createLead(supplierId: string, fundToken: string | null, _prev: LeadState, fd: FormData): Promise<LeadState> {
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  if (!UUID_RE.test(supplierId)) return { error: 'ספק לא תקין', values };
  const sup = await one<{ id: string; name: string; phone: string | null; status: string }>(`SELECT id, name, phone, status FROM kupa_suppliers WHERE id = $1`, [supplierId]);
  if (!sup || sup.status !== 'active') return { error: 'הספק לא זמין כרגע.', values };
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const phone = String(fd.get('phone') || '').trim().slice(0, 30);
  const message = String(fd.get('message') || '').trim().slice(0, 500) || null;
  if (name.length < 2) return { error: 'כתבו שם.', values };
  if (digits(phone).length < 9) return { error: 'צריך טלפון כדי שהספק יחזור אליכם.', values };
  const fund = fundToken && TOKEN_RE.test(fundToken) ? await fundByToken(fundToken) : null;
  await many(`INSERT INTO kupa_leads (supplier_id, fund_id, name, phone, message) VALUES ($1,$2,$3,$4,$5)`, [sup.id, fund?.id ?? null, name, phone, message]);
  revalidatePath('/p'); revalidatePath('/admin/suppliers'); revalidatePath(`/admin/suppliers/${sup.id}`);
  const text = encodeURIComponent(`שלום ${sup.name}, פניתי דרך כרטיס המשפחה של אבלות ישראל.${fund ? ` המשפחה: ${fund.display_name}.` : ''} ${message ? `מה אנחנו צריכים: ${message}.` : ''} אשמח להצעה עם ההטבה של הכרטיס. ${name}, ${phone}`);
  return { ok: `הפנייה נרשמה אצל ${sup.name}.`, wa: sup.phone ? `https://wa.me/${waNumber(sup.phone)}?text=${text}` : undefined };
}

export type JoinState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const KINDS = new Set(['percent', 'fixed', 'gift']);
const ICONS = new Set(['meal', 'chairs', 'stone', 'home', 'flowers', 'transport']);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9֐-׿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'supplier';

/** הצטרפות עצמית של ספק: נרשם כ"ממתין" עם ההטבה הראשונה; הניהול מאשר. */
export async function joinSupplier(_prev: JoinState, fd: FormData): Promise<JoinState> {
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  const name = String(fd.get('name') || '').trim().slice(0, 120);
  const category = String(fd.get('category') || '').trim().slice(0, 60);
  const prof = cleanProfile(fd);
  const phone = prof.phone || '';
  const icon = String(fd.get('icon') || 'meal');
  const bTitle = String(fd.get('benefit_title') || '').trim().slice(0, 120);
  const bKind = String(fd.get('benefit_kind') || 'percent');
  const bValue = Number(String(fd.get('benefit_value') || '').replace(/[^\d.]/g, '')) || null;
  const bTerms = String(fd.get('benefit_terms') || '').trim().slice(0, 300) || null;
  if (name.length < 2) return { error: 'צריך שם עסק.', values };
  if (category.length < 2) return { error: 'צריך תחום.', values };
  if (digits(phone).length < 9) return { error: 'צריך טלפון (וואטסאפ) שאליו יגיעו פניות.', values };
  if (bTitle.length < 2) return { error: 'כתבו מה ההטבה למשפחות עם הכרטיס.', values };
  if (!KINDS.has(bKind)) return { error: 'סוג הטבה לא תקין.', values };
  if (bKind !== 'gift' && !(bValue && bValue > 0)) return { error: 'צריך ערך להטבה: אחוז או סכום.', values };
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const row = await one<{ id: string }>(
    `INSERT INTO kupa_suppliers (slug, name, category, icon, status, pin) VALUES ($1,$2,$3,$4,'pending',$5) RETURNING id`,
    [`${slugify(name)}-${token(3)}`, name, category, ICONS.has(icon) ? icon : 'meal', pin]);
  if (row) await many(`UPDATE kupa_suppliers SET ${PROFILE_SET} WHERE id = $1`, [row.id, ...profileParams(prof)]);
  if (row) await many(`INSERT INTO kupa_benefits (supplier_id, title, kind, value, terms) VALUES ($1,$2,$3,$4,$5)`, [row.id, bTitle, bKind, bValue, bTerms]);
  revalidatePath('/admin/suppliers');
  return { ok: 'נרשמתם. נבדוק ונאשר, ואז תופיעו במדריך ותקבלו פניות ממשפחות.' };
}
