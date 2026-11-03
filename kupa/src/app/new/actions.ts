'use server';
import { redirect } from 'next/navigation';
import { many } from '@/lib/db';
import { token } from '@/lib/tokens';
import { newPin } from '@/lib/login';
import { cleanFundInput } from '@/lib/funds';
import { FEE_PCT } from '@/lib/site';
import { defaultValidUntil } from '@/lib/card';
import type { FundEvent } from '@/lib/format';

export type NewState = { error?: string; values?: Record<string, string> } | undefined;

export async function createFund(_prev: NewState, fd: FormData): Promise<NewState> {
  const f = cleanFundInput(fd);
  const values = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$')) as [string, string][]);
  if (!f.display_name || f.display_name.length < 2) return { error: 'צריך את שם הנפטר/ת.', values };
  if (!f.manager_name) return { error: 'צריך שם של מי שמנהל את הקופה, כדי שנדע למי לפנות.', values };
  if (!f.manager_phone || f.manager_phone.replace(/\D/g, '').length < 9) return { error: 'צריך טלפון של מנהל/ת הקופה.', values };

  const events: FundEvent[] = [];
  const funeralDate = String(fd.get('funeral_date') || '');
  if (funeralDate) {
    events.push({ id: token(6), kind: 'funeral', date: funeralDate, time: String(fd.get('funeral_time') || '') || undefined,
      place: String(fd.get('funeral_place') || '').trim().slice(0, 160) || undefined });
  }
  const shivaPlace = String(fd.get('shiva_place') || '').trim().slice(0, 200);
  if (shivaPlace) {
    events.push({ id: token(6), kind: 'shiva', date: String(fd.get('shiva_date') || '') || undefined, place: shivaPlace,
      note: String(fd.get('shiva_note') || '').trim().slice(0, 160) || undefined });
  }

  const pub = token(12), manage = token(24), card = token(12);
  await many(
    `INSERT INTO kupa_funds (token, manage_token, card_token, display_name, gender, years, city, quote, quote_by, photo_initial, purpose, target_ils,
       surplus_to, events, manager_name, manager_phone, manager_email, show_amounts, allow_messages, fee_pct, card_valid_until, login_pin)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [pub, manage, card, f.display_name, f.gender, f.years, f.city, f.quote, f.quote_by, f.display_name.trim().charAt(0), f.purpose, f.target_ils,
      f.surplus_to, JSON.stringify(events), f.manager_name, f.manager_phone, f.manager_email, f.show_amounts, f.allow_messages, FEE_PCT, defaultValidUntil(), newPin()]);
  redirect(`/m/${manage}?welcome=1`);
}
