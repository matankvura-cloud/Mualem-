// הפקדה: רושמת שורה במצב "ממתין", יוצרת קישור תשלום של מורנינג (custom = מזהה
// ההפקדה) ומחזירה את כתובת עמוד התשלום. "שולם" מסומן רק מההודעה-חזרה.
import { NextResponse } from 'next/server';
import { fundByToken, EMAIL_RE } from '@/lib/funds';
import { one, many, num } from '@/lib/db';
import { TOKEN_RE, ipHash } from '@/lib/tokens';
import { round2, memOf } from '@/lib/format';
import { createPaymentForm, hookToken } from '@/lib/morning';
import { siteUrl, BRAND, FEE_MODE } from '@/lib/site';

export const runtime = 'nodejs';
const MIN = 10, MAX = 100000;
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) return json({ error: 'קישור לא תקין' }, 400);
  const fund = await fundByToken(token);
  if (!fund) return json({ error: 'הקופה לא נמצאה' }, 404);
  if (fund.status === 'closed') return json({ error: 'הקופה נסגרה. תודה על הרצון לעזור.' }, 410);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = round2(Number(body.amount));
  if (!(amount >= MIN && amount <= MAX)) return json({ error: `הסכום צריך להיות בין ${MIN} ל-${MAX.toLocaleString('he-IL')} ₪` }, 400);
  const name = String(body.name || '').trim().slice(0, 80);
  if (name.length < 2) return json({ error: 'צריך שם, כדי שהמשפחה תדע ממי זה' }, 400);
  const message = fund.allow_messages ? String(body.message || '').trim().slice(0, 600) || null : null;
  const email = String(body.email || '').trim().slice(0, 160) || null;
  if (email && !EMAIL_RE.test(email)) return json({ error: 'כתובת המייל לא תקינה' }, 400);
  const hideAmount = body.hideAmount === true;
  const feePct = num(fund.fee_pct);
  const fee = feePct > 0 && (FEE_MODE === 'required' || body.coverFee === true) ? round2(amount * feePct / 100) : 0;
  const charged = round2(amount + fee);

  // הגנה פשוטה מהצפה: עד 10 הפקדות ממתינות בשעה מאותה כתובת לאותה קופה.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  const hash = ipHash(ip);
  const recent = await one<{ n: unknown }>(
    `SELECT COUNT(*) AS n FROM deposits WHERE fund_id = $1 AND ip_hash = $2 AND status = 'pending' AND created_at > now() - interval '1 hour'`,
    [fund.id, hash]);
  if (num(recent?.n) >= 10) return json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד שעה.' }, 429);

  const dep = await one<{ id: string }>(
    `INSERT INTO deposits (fund_id, donor_name, donor_email, message, amount, fee_amount, charged_amount, hide_amount, ip_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [fund.id, name, email, message, amount, fee, charged, hideAmount, hash]);
  if (!dep) return json({ error: 'לא הצלחנו לרשום את ההפקדה' }, 500);

  let hook: string;
  try { hook = hookToken(); } catch (e) {
    await many(`UPDATE deposits SET status = 'failed', raw = $2 WHERE id = $1`, [dep.id, JSON.stringify({ reason: (e as Error).message })]);
    return json({ error: 'הסליקה לא מוגדרת עדיין.' }, 502);
  }
  const site = await siteUrl();
  const label = `${memOf(fund.gender)} ${fund.display_name} · ${BRAND}`;
  const lines = [{ description: label, price: amount }];
  if (fee > 0) lines.push({ description: `תוספת תפעול ${feePct}%`, price: fee });

  const r = await createPaymentForm({
    description: label, lines, amount: charged, clientName: name, clientEmail: email,
    successUrl: `${site}/f/${token}?paid=1`, failureUrl: `${site}/f/${token}?paid=0`,
    notifyUrl: `${site}/api/morning/hook?k=${hook}`, custom: dep.id,
  });
  if ('error' in r) {
    await many(`UPDATE deposits SET status = 'failed', raw = $2 WHERE id = $1`, [dep.id, JSON.stringify({ reason: r.error, http: r.http, body: r.body })]);
    return json({ error: 'הסליקה לא זמינה כרגע. נסו שוב בעוד כמה דקות.', detail: r.error }, 502);
  }
  await many(`UPDATE deposits SET link_url = $2, link_expires_at = now() + interval '24 hours' WHERE id = $1`, [dep.id, r.url]);
  return json({ ok: true, url: r.url });
}
