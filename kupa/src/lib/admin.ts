import { cookies } from 'next/headers';
import { hmac, sameSecret } from './tokens';

const COOKIE = 'kupa_admin';
const expected = () => (process.env.ADMIN_PASSWORD ? hmac(process.env.ADMIN_PASSWORD, 'kupa-admin-session') : '');

export async function isAdmin(): Promise<boolean> {
  const want = expected();
  if (!want) return false;
  const c = (await cookies()).get(COOKIE)?.value || '';
  return sameSecret(c, want);
}

export async function login(password: string): Promise<boolean> {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || !sameSecret(password, real)) return false;
  (await cookies()).set(COOKIE, expected(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/admin', maxAge: 60 * 60 * 24 * 14 });
  return true;
}

export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: '/admin' });
}
