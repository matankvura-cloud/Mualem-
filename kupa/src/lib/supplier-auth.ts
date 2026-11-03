// כניסת ספקים: בלי סיסמה ובלי מייל. הניהול מנפיק קישור כניסה חד-פעמי (7 ימים),
// הספק פותח אותו בטלפון שלו ומקבל עוגייה ל-90 יום. הכניסה היא רק לפורטל /p ולמימוש ב-/s.
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { hmac, sameSecret, token } from './tokens';
import { one, many } from './db';
import { SUP_COLS, type Supplier } from './funds';

const COOKIE = 'kupa_supplier';
const key = () => hmac(process.env.CARD_SECRET || process.env.ADMIN_PASSWORD || 'dev', 'kupa-supplier-session');
const sig = (id: string) => hmac(key(), id);
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

export async function currentSupplier(): Promise<Supplier | null> {
  const c = (await cookies()).get(COOKIE)?.value || '';
  const [id, s] = c.split('.');
  if (!id || !s || !sameSecret(s, sig(id))) return null;
  const sup = await one<Supplier>(`SELECT ${SUP_COLS} FROM kupa_suppliers WHERE id = $1 AND status <> 'inactive'`, [id]);
  return sup;
}

/** מנפיק קישור כניסה לספק. מחזיר את האסימון (נשמר רק ה-hash שלו). */
export async function issueSupplierLogin(supplierId: string, days = 7): Promise<string> {
  const t = token(24);
  await many(`INSERT INTO kupa_supplier_logins (token_hash, supplier_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`, [hash(t), supplierId, String(days)]);
  return t;
}

/** פותח קישור כניסה: מסמן כמשומש וקובע עוגייה. */
export async function redeemSupplierLogin(t: string): Promise<Supplier | null> {
  const row = await one<{ supplier_id: string }>(
    `UPDATE kupa_supplier_logins SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING supplier_id`, [hash(t)]);
  if (!row) return null;
  const sup = await one<Supplier>(`SELECT ${SUP_COLS} FROM kupa_suppliers WHERE id = $1`, [row.supplier_id]);
  if (!sup) return null;
  (await cookies()).set(COOKIE, `${sup.id}.${sig(sup.id)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 });
  return sup;
}

/** קובע עוגיית ספק (אחרי כניסה בטלפון + קוד). */
export async function setSupplierSession(supplierId: string) {
  (await cookies()).set(COOKIE, `${supplierId}.${sig(supplierId)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 });
}

export async function supplierLogout() {
  (await cookies()).delete({ name: COOKIE, path: '/' });
}

/** בודק קישור כניסה בלי לצרוך אותו (לתצוגת הדף לפני הלחיצה). */
export async function peekSupplierLogin(t: string): Promise<{ state: 'ok' | 'used' | 'expired' | 'missing'; name?: string }> {
  const row = await one<{ used_at: unknown; expired: boolean; name: string }>(
    `SELECT l.used_at, (l.expires_at <= now()) AS expired, s.name FROM kupa_supplier_logins l JOIN kupa_suppliers s ON s.id = l.supplier_id WHERE l.token_hash = $1`, [hash(t)]);
  if (!row) return { state: 'missing' };
  if (row.used_at) return { state: 'used', name: row.name };
  if (row.expired) return { state: 'expired', name: row.name };
  return { state: 'ok', name: row.name };
}
