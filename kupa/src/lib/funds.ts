// שאילתות הקופה. כל מה שהעמוד הציבורי רואה עובר דרך publicView, שמסנן
// מה שאסור להציג (מיילים, סכומים מוסתרים, פרטי המנהל).
import { one, many, num } from './db';
import type { FundEvent } from './format';

export type Fund = {
  id: string; token: string; manage_token: string; status: 'open' | 'closed';
  display_name: string; gender: 'm' | 'f'; years: string | null; city: string | null; quote: string | null; quote_by: string | null;
  photo_initial: string | null; purpose: string | null; target_ils: unknown; surplus_to: string | null;
  events: FundEvent[]; manager_name: string | null; manager_phone: string | null; manager_email: string | null;
  show_amounts: boolean; allow_messages: boolean; fee_pct: unknown; view_count: number;
  opened_at: unknown; closed_at: unknown; created_at: unknown; updated_at: unknown;
};

export type Deposit = {
  id: string; fund_id: string; donor_name: string; donor_email: string | null; message: string | null;
  amount: unknown; fee_amount: unknown; charged_amount: unknown; hide_amount: boolean;
  status: 'pending' | 'paid' | 'failed' | 'cancelled'; link_url: string | null; paid_at: unknown;
  doc_number: string | null; doc_url: string | null; created_at: unknown;
};

export type Payout = {
  id: string; fund_id: string; payee: string; purpose: string | null; amount: unknown;
  paid_on: unknown; note: string | null; visible: boolean; created_at: unknown;
};

export type Totals = { raised: number; fees: number; donors: number; paid_out: number; pending: number };

const normalize = (f: Fund | null): Fund | null => {
  if (!f) return null;
  if (!Array.isArray(f.events)) f.events = [];
  return f;
};

export const fundByToken = async (t: string) => normalize(await one<Fund>(`SELECT * FROM funds WHERE token = $1`, [t]));
export const fundByManage = async (t: string) => normalize(await one<Fund>(`SELECT * FROM funds WHERE manage_token = $1`, [t]));
export const fundById = async (id: string) => normalize(await one<Fund>(`SELECT * FROM funds WHERE id = $1`, [id]));

export async function totals(fundId: string): Promise<Totals> {
  const r = await one<Record<string, unknown>>(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS raised,
       COALESCE(SUM(fee_amount) FILTER (WHERE status = 'paid'), 0) AS fees,
       COUNT(*) FILTER (WHERE status = 'paid') AS donors,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       (SELECT COALESCE(SUM(amount), 0) FROM payouts p WHERE p.fund_id = $1) AS paid_out
     FROM deposits d WHERE d.fund_id = $1`, [fundId]);
  return { raised: num(r?.raised), fees: num(r?.fees), donors: num(r?.donors), pending: num(r?.pending), paid_out: num(r?.paid_out) };
}

/** ספר הניחומים: רק הפקדות ששולמו. סכום רק אם הקופה מציגה והמפקיד לא ביקש להסתיר. */
export async function book(fund: Fund, limit = 200) {
  const rows = await many<Deposit>(
    `SELECT donor_name, message, amount, hide_amount, paid_at FROM deposits
     WHERE fund_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT $2`, [fund.id, limit]);
  return rows.map((d) => ({
    name: d.donor_name, message: d.message || null,
    amount: fund.show_amounts && !d.hide_amount ? num(d.amount) : null, at: d.paid_at,
  }));
}

export const depositsOf = (fundId: string) =>
  many<Deposit>(`SELECT * FROM deposits WHERE fund_id = $1 ORDER BY created_at DESC LIMIT 500`, [fundId]);
export const payoutsOf = (fundId: string) =>
  many<Payout>(`SELECT * FROM payouts WHERE fund_id = $1 ORDER BY paid_on DESC, created_at DESC`, [fundId]);

export function bumpViews(fundId: string) {
  many(`UPDATE funds SET view_count = view_count + 1 WHERE id = $1`, [fundId]).catch(() => {});
}

export type FundSummary = Fund & { raised: unknown; fees: unknown; donors: unknown; paid_out: unknown };
export const allFunds = () => many<FundSummary>(
  `SELECT f.*,
     COALESCE((SELECT SUM(amount) FROM deposits d WHERE d.fund_id = f.id AND d.status = 'paid'), 0) AS raised,
     COALESCE((SELECT SUM(fee_amount) FROM deposits d WHERE d.fund_id = f.id AND d.status = 'paid'), 0) AS fees,
     (SELECT COUNT(*) FROM deposits d WHERE d.fund_id = f.id AND d.status = 'paid') AS donors,
     COALESCE((SELECT SUM(amount) FROM payouts p WHERE p.fund_id = f.id), 0) AS paid_out
   FROM funds f ORDER BY f.created_at DESC`);

/* ---------- ניקוי קלט ---------- */
export const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanFundInput(fd: FormData) {
  const name = str(fd.get('display_name'), 120);
  const target = Number(String(fd.get('target_ils') ?? '').replace(/[^\d.]/g, ''));
  const email = str(fd.get('manager_email'), 160);
  return {
    display_name: name,
    gender: fd.get('gender') === 'f' ? 'f' : 'm',
    years: str(fd.get('years'), 60),
    city: str(fd.get('city'), 80),
    quote: str(fd.get('quote'), 300),
    quote_by: str(fd.get('quote_by'), 80),
    purpose: str(fd.get('purpose'), 500),
    target_ils: target > 0 ? Math.round(target) : null,
    surplus_to: str(fd.get('surplus_to'), 300),
    manager_name: str(fd.get('manager_name'), 80),
    manager_phone: str(fd.get('manager_phone'), 30),
    manager_email: email && EMAIL_RE.test(email) ? email : null,
    show_amounts: fd.get('show_amounts') === 'on',
    allow_messages: fd.get('allow_messages') === 'on',
  };
}
