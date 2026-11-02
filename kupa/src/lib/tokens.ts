import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** אסימון אקראי ב-base64url. 12 בייט = 16 תווים (ציבורי), 24 בייט = 32 תווים (ניהול). */
export const token = (bytes: number) => randomBytes(bytes).toString('base64url');
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;
export const UUID_RE = /^[0-9a-f-]{36}$/i;

export function ipHash(ip: string): string {
  return createHash('sha256').update(ip + '|kupa').digest('hex').slice(0, 24);
}

/** השוואה בזמן קבוע. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmac(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg).digest('hex');
}
