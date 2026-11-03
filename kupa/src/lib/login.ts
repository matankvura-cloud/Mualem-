// כניסה בטלפון + קוד בן 6 ספרות, בלי SMS. משפחה: הטלפון של מנהל/ת הקופה וקוד הכניסה
// שניתן בפתיחה. ספק: הטלפון של העסק וקוד הספק. מעסיק: טלפון איש הקשר וקוד שניתן ברישום.
// אחרי 5 ניסיונות כושלים הרשומה ננעלת ל-15 דקות. שרת בלבד.
import { randomInt } from 'node:crypto';
import { many } from './db';
import { sameSecret } from './tokens';

export const newPin = () => String(randomInt(0, 1000000)).padStart(6, '0');
/** 9 הספרות האחרונות: 050-1234567, +972501234567 ו-972-50-1234567 נותנים אותו דבר. */
export const normPhone = (p: string) => p.replace(/\D/g, '').slice(-9);
const PHONE_SQL = (col: string) => `right(regexp_replace(COALESCE(${col}, ''), '\\D', '', 'g'), 9) = $1`;

type Kind = 'fund' | 'supplier' | 'employer';
const T: Record<Kind, { table: string; phone: string; pin: string; extra: string }> = {
  fund: { table: 'kupa_funds', phone: 'manager_phone', pin: 'login_pin', extra: `AND status <> 'deleted'` },
  supplier: { table: 'kupa_suppliers', phone: 'phone', pin: 'pin', extra: `AND status = 'active'` },
  employer: { table: 'kupa_employers', phone: 'phone', pin: 'pin', extra: '' },
};

export type LoginResult<R> = { ok: true; row: R } | { ok: false; error: string };

/** מנסה להיכנס. מחזיר את הרשומה שהקוד שלה תואם, או שגיאה אחידה (לא חושפים אם הטלפון קיים). */
export async function tryLogin<R extends { id: string }>(kind: Kind, phoneRaw: string, pinRaw: string, cols: string): Promise<LoginResult<R>> {
  const phone = normPhone(phoneRaw), pin = pinRaw.replace(/\D/g, '');
  if (phone.length < 9) return { ok: false, error: 'מספר טלפון מלא, 9 או 10 ספרות.' };
  if (pin.length !== 6) return { ok: false, error: 'קוד הכניסה הוא 6 ספרות.' };
  const t = T[kind];
  const rows = await many<R & { pin_v: string | null; locked: boolean }>(
    `SELECT ${cols}, ${t.pin} AS pin_v, (login_locked_until IS NOT NULL AND login_locked_until > now()) AS locked FROM ${t.table} WHERE ${PHONE_SQL(t.phone)} ${t.extra} ORDER BY created_at DESC LIMIT 10`, [phone]);
  const GENERIC = 'הטלפון או הקוד לא נכונים.';
  if (!rows.length) return { ok: false, error: GENERIC };
  if (rows.some((r) => r.locked)) return { ok: false, error: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה, או פנו לליווי.' };
  const hit = rows.find((r) => r.pin_v && sameSecret(r.pin_v, pin));
  if (!hit) {
    await many(`UPDATE ${t.table} SET login_fails = login_fails + 1, login_locked_until = CASE WHEN login_fails + 1 >= 5 THEN now() + interval '15 minutes' ELSE login_locked_until END WHERE ${PHONE_SQL(t.phone)}`, [phone]);
    return { ok: false, error: GENERIC };
  }
  await many(`UPDATE ${t.table} SET login_fails = 0, login_locked_until = NULL WHERE id = $1`, [hit.id]);
  return { ok: true, row: hit };
}
