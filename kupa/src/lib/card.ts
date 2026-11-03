// כרטיס ההטבות: חתימה מתחלפת ל-QR, מצב הכרטיס, ובדיקת זכאות למימוש.
// ה-QR שהמשפחה מציגה הוא קישור /s/<card>?t=<זמן>.<חתימה>; החתימה תקפה כמה דקות,
// כך שצילום מסך ישן לא שווה כלום, והשרת הוא היחיד שמכריע.
import { hmac, sameSecret } from './tokens';
import type { Fund } from './funds';

export const SIG_TTL_SEC = 180;

function secret(): string {
  const s = process.env.CARD_SECRET || process.env.ADMIN_PASSWORD || '';
  if (!s) throw new Error('חסר CARD_SECRET');
  return hmac(s, 'kupa-card-v1');
}

/** חתימה טרייה לכרטיס: "<שניות>.<32 תווים>". */
export function signCard(cardToken: string, now = Date.now()): string {
  const ts = Math.floor(now / 1000);
  return `${ts}.${hmac(secret(), `${cardToken}|${ts}`).slice(0, 32)}`;
}

export type SigCheck = { ok: true; ts: number } | { ok: false; reason: 'missing' | 'bad' | 'stale' };

/** מאמת חתימה: מבנה, תוקף בזמן, והתאמה לכרטיס. */
export function verifyCard(cardToken: string, t: string | undefined | null, now = Date.now()): SigCheck {
  if (!t) return { ok: false, reason: 'missing' };
  const m = /^(\d{9,11})\.([a-f0-9]{32})$/.exec(t);
  if (!m) return { ok: false, reason: 'bad' };
  const ts = Number(m[1]);
  const age = Math.floor(now / 1000) - ts;
  if (age < -30 || age > SIG_TTL_SEC) return { ok: false, reason: 'stale' };
  const want = hmac(secret(), `${cardToken}|${ts}`).slice(0, 32);
  return sameSecret(m[2], want) ? { ok: true, ts } : { ok: false, reason: 'bad' };
}

export type CardState = 'active' | 'blocked' | 'expired' | 'closed';

/** מצב הכרטיס כפי שהספק והמשפחה רואים אותו. */
export function cardState(fund: Pick<Fund, 'status' | 'card_status' | 'card_valid_until'>, today = new Date()): CardState {
  if (fund.status === 'closed') return 'closed';
  if (fund.card_status === 'blocked') return 'blocked';
  const until = fund.card_valid_until ? new Date(String(fund.card_valid_until)) : null;
  if (until && until.getTime() < new Date(today.toISOString().slice(0, 10)).getTime()) return 'expired';
  return 'active';
}

export const CARD_STATE_LABEL: Record<CardState, [string, string]> = {
  active: ['בתוקף', 'pill-ok'], blocked: ['חסום', 'pill-err'], expired: ['פג תוקף', 'pill-muted'], closed: ['הקופה נסגרה', 'pill-muted'],
};

/** תוקף ברירת מחדל: 12 חודשים מהפתיחה. */
export function defaultValidUntil(from = new Date()): string {
  const d = new Date(from); d.setMonth(d.getMonth() + 12);
  return d.toISOString().slice(0, 10);
}

export function fmtBenefit(b: { kind: string; value: unknown; title: string }): string {
  const v = Number(b.value) || 0;
  if (b.kind === 'percent' && v) return `${v}% הנחה`;
  if (b.kind === 'fixed' && v) return `₪${v} הנחה`;
  return b.title;
}
