'use server';
// כניסה בטלפון + קוד: משפחה -> מרכז המשפחה, ספק -> פורטל הספקים (עוגייה), מעסיק -> פורטל המעסיקים.
import { redirect } from 'next/navigation';
import { tryLogin } from '@/lib/login';
import { setSupplierSession } from '@/lib/supplier-auth';

export type LoginState = { error?: string; values?: Record<string, string> } | undefined;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim().slice(0, 40);

export async function loginFamily(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const phone = s(fd, 'phone'), pin = s(fd, 'pin');
  const r = await tryLogin<{ id: string; manage_token: string }>('fund', phone, pin, 'id, manage_token');
  if (!r.ok) return { error: r.error, values: { phone } };
  redirect(`/m/${r.row.manage_token}`);
}

export async function loginSupplier(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const phone = s(fd, 'phone'), pin = s(fd, 'pin');
  const r = await tryLogin<{ id: string }>('supplier', phone, pin, 'id');
  if (!r.ok) return { error: r.error, values: { phone } };
  await setSupplierSession(r.row.id);
  redirect('/p');
}

export async function loginEmployer(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const phone = s(fd, 'phone'), pin = s(fd, 'pin');
  const r = await tryLogin<{ id: string; token: string }>('employer', phone, pin, 'id, token');
  if (!r.ok) return { error: r.error, values: { phone } };
  redirect(`/e/${r.row.token}`);
}
