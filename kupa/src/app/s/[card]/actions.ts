'use server';
import { revalidatePath } from 'next/cache';
import { fundByCard, totals } from '@/lib/funds';
import { many } from '@/lib/db';
import { TOKEN_RE } from '@/lib/tokens';
import { round2, ils } from '@/lib/format';

export type ChargeState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

/** בקשת חיוב מצד הספק דרך הכרטיס. נרשמת כבקשה ממתינה; מתן מאשר ומשלם. */
export async function requestCharge(card: string, _prev: ChargeState, fd: FormData): Promise<ChargeState> {
  if (!TOKEN_RE.test(card)) return { error: 'קישור לא תקין' };
  const fund = await fundByCard(card);
  if (!fund) return { error: 'הכרטיס לא נמצא' };
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  const payee = String(fd.get('payee') || '').trim().slice(0, 120);
  const contact = String(fd.get('contact') || '').trim().slice(0, 200);
  const amount = round2(Number(String(fd.get('amount') || '').replace(/[^\d.]/g, '')));
  if (payee.length < 2) return { error: 'שם העסק חסר.', values };
  if (contact.replace(/\D/g, '').length < 9) return { error: 'צריך טלפון, כדי שנוכל לחזור אליכם לתשלום.', values };
  if (!(amount > 0)) return { error: 'צריך סכום.', values };
  const t = await totals(fund.id);
  if (amount > t.available) return { error: `היתרה הזמינה בכרטיס היא ${ils(t.available)}.`, values };
  await many(
    `INSERT INTO kupa_payout_requests (fund_id, payee, purpose, amount, contact, note, source) VALUES ($1,$2,$3,$4,$5,$6,'supplier')`,
    [fund.id, payee, String(fd.get('purpose') || '').trim().slice(0, 200) || null, amount, contact, String(fd.get('note') || '').trim().slice(0, 400) || null]);
  revalidatePath('/admin'); revalidatePath(`/admin/${fund.id}`); revalidatePath(`/m/${fund.manage_token}/card`);
  return { ok: `הבקשה נשלחה למשפחה ולאישור. אחרי האישור נעביר ${ils(amount)} ל${payee}.` };
}

export type RedeemState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

/** מימוש הטבה: ספק מזוהה (עוגייה או קוד ספק), רק עם קוד שנסרק עכשיו, רק בכרטיס פעיל, עד המכסה, ובלי שימוש חוזר באותה סריקה. */
export async function redeemBenefit(card: string, t: string, _prev: RedeemState, fd: FormData): Promise<RedeemState> {
  const { currentSupplier } = await import('@/lib/supplier-auth');
  const { verifyCard, cardState } = await import('@/lib/card');
  const { benefitById, redemptionCount, supplierById } = await import('@/lib/funds');
  const { UUID_RE, sameSecret } = await import('@/lib/tokens');
  const { createHash } = await import('node:crypto');
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$') && k !== 'pin') as [string, string][]);
  if (!TOKEN_RE.test(card)) return { error: 'קישור לא תקין', values };
  const supplierId = String(fd.get('supplier') || '');
  if (!UUID_RE.test(supplierId)) return { error: 'בחרו ספק.', values };
  const logged = await currentSupplier();
  const supplier = logged && logged.id === supplierId ? logged : await supplierById(supplierId);
  if (!supplier) return { error: 'הספק לא נמצא.', values };
  if (supplier.status !== 'active') return { error: 'הספק עדיין לא אושר.', values };
  if (!(logged && logged.id === supplier.id)) {
    const pin = String(fd.get('pin') || '').replace(/\D/g, '');
    if (!supplier.pin || pin.length !== 6 || !sameSecret(pin, supplier.pin)) return { error: 'קוד הספק שגוי. הקוד הוא 6 ספרות שקיבלתם בהצטרפות.', values };
  }
  const fund = await fundByCard(card);
  if (!fund) return { error: 'הכרטיס לא נמצא', values };
  if (cardState(fund) !== 'active') return { error: 'הכרטיס לא פעיל.', values };
  const sig = verifyCard(card, t);
  if (!sig.ok) return { error: 'הקוד לא טרי. סרקו את הכרטיס מחדש.', values };
  const benefitId = String(fd.get('benefit') || '');
  if (!UUID_RE.test(benefitId)) return { error: 'בחרו הטבה.', values };
  const benefit = await benefitById(benefitId);
  if (!benefit || benefit.supplier_id !== supplier.id || !benefit.active) return { error: 'ההטבה לא זמינה.', values };
  const today = new Date().toISOString().slice(0, 10);
  if ((benefit.valid_from && String(benefit.valid_from).slice(0, 10) > today) || (benefit.valid_until && String(benefit.valid_until).slice(0, 10) < today)) return { error: 'ההטבה לא בתוקף היום.', values };
  const used = await redemptionCount(fund.id, benefit.id);
  if (used >= benefit.max_per_family) return { error: 'המשפחה כבר מימשה את ההטבה הזו.', values };
  const saved = round2(Number(String(fd.get('amount_saved') || '').replace(/[^\d.]/g, ''))) || null;
  const order = round2(Number(String(fd.get('order_amount') || '').replace(/[^\d.]/g, ''))) || null;
  const commission = order ? round2(order * (Number(supplier.commission_pct) || 0) / 100) : null;
  const note = String(fd.get('note') || '').trim().slice(0, 200) || null;
  const nonce = createHash('sha256').update(`${card}|${sig.ts}|${benefit.id}`).digest('hex').slice(0, 40);
  try {
    await many(
      `INSERT INTO kupa_redemptions (fund_id, supplier_id, benefit_id, supplier_name, benefit_title, amount_saved, order_amount, commission, note, redeemed_by, nonce) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [fund.id, supplier.id, benefit.id, supplier.name, benefit.title, saved, order, commission, note, logged ? supplier.email : 'pin', nonce]);
  } catch (e) {
    if (String(e).includes('nonce')) return { error: 'הסריקה הזו כבר שימשה למימוש. לסריקה חדשה בקשו מהמשפחה להציג שוב.', values };
    throw e;
  }
  revalidatePath(`/m/${fund.manage_token}/card`); revalidatePath('/p'); revalidatePath(`/admin/${fund.id}`);
  return { ok: `${benefit.title} נרשמה למשפחת ${fund.display_name}.${saved ? ` חיסכון ${ils(saved)}.` : ''}` };
}
