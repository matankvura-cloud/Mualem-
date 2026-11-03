// העלאת לוגו של ספק (מהפורטל). תמונה עד 2MB, נשמרת במסד.
import { currentSupplier } from '@/lib/supplier-auth';
import { many } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const MAX = 2 * 1024 * 1024;
const OK = /^image\/(png|jpeg|webp)$/;

export async function POST(req: Request) {
  const sup = await currentSupplier();
  if (!sup) return new Response('not logged in', { status: 401 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get('logo');
  if (!(file instanceof File) || !file.size) return Response.redirect(new URL('/p?logo=empty', req.url), 303);
  if (file.size > MAX || !OK.test(file.type)) return Response.redirect(new URL('/p?logo=bad', req.url), 303);
  const buf = Buffer.from(await file.arrayBuffer());
  await many(`UPDATE kupa_suppliers SET logo = $2, logo_mime = $3, updated_at = now() WHERE id = $1`, [sup.id, buf, file.type]);
  revalidatePath('/p'); revalidatePath('/suppliers'); revalidatePath(`/suppliers/${sup.slug}`);
  return Response.redirect(new URL('/p?logo=ok', req.url), 303);
}
