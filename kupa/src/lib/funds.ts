// שאילתות הקופה. כל מה שהעמוד הציבורי רואה עובר דרך publicView, שמסנן
// מה שאסור להציג (מיילים, סכומים מוסתרים, פרטי המנהל).
import { one, many, num } from './db';
import type { FundEvent } from './format';

export type Fund = {
  id: string; token: string; manage_token: string; card_token: string | null; status: 'open' | 'closed';
  display_name: string; gender: 'm' | 'f'; years: string | null; city: string | null; quote: string | null; quote_by: string | null;
  photo_initial: string | null; purpose: string | null; target_ils: unknown; surplus_to: string | null;
  events: FundEvent[]; manager_name: string | null; manager_phone: string | null; manager_email: string | null;
  show_amounts: boolean; allow_messages: boolean; fee_pct: unknown; view_count: number; situation: string | null;
  card_status: 'active' | 'blocked'; card_valid_until: unknown; card_block_reason: string | null;
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

export type PayoutRequest = {
  id: string; fund_id: string; payee: string; purpose: string | null; amount: unknown; contact: string | null; note: string | null;
  status: 'pending' | 'paid' | 'rejected'; source: 'family' | 'supplier'; admin_note: string | null; payout_id: string | null; created_at: unknown; updated_at: unknown;
};

/** requested: סכום הבקשות הממתינות. available: מה שאפשר לבקש עכשיו. */
export type Totals = { raised: number; fees: number; donors: number; paid_out: number; pending: number; requested: number; available: number };

const normalize = (f: Fund | null): Fund | null => {
  if (!f) return null;
  if (!Array.isArray(f.events)) f.events = [];
  return f;
};

/** מספר כרטיס לתצוגה: 4 ספרות אחרונות נגזרות מהמזהה, יציבות לכל קופה. */
export function cardLast4(fund: Fund): string {
  let h = 0;
  for (const c of fund.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(1000 + (h % 9000));
}

/** מוודא שלקופה יש אסימון כרטיס (קופות ישנות). */
export async function ensureCardToken(fund: Fund): Promise<string> {
  if (fund.card_token) return fund.card_token;
  const { token } = await import('./tokens');
  const t = token(12);
  await many(`UPDATE kupa_funds SET card_token = $2 WHERE id = $1 AND card_token IS NULL`, [fund.id, t]);
  return (await fundById(fund.id))?.card_token ?? t;
}

export const fundByToken = async (t: string) => normalize(await one<Fund>(`SELECT * FROM kupa_funds WHERE token = $1`, [t]));
export const fundByManage = async (t: string) => normalize(await one<Fund>(`SELECT * FROM kupa_funds WHERE manage_token = $1`, [t]));
export const fundByCard = async (t: string) => normalize(await one<Fund>(`SELECT * FROM kupa_funds WHERE card_token = $1`, [t]));
export const fundById = async (id: string) => normalize(await one<Fund>(`SELECT * FROM kupa_funds WHERE id = $1`, [id]));

export async function totals(fundId: string): Promise<Totals> {
  const r = await one<Record<string, unknown>>(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS raised,
       COALESCE(SUM(fee_amount) FILTER (WHERE status = 'paid'), 0) AS fees,
       COUNT(*) FILTER (WHERE status = 'paid') AS donors,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       (SELECT COALESCE(SUM(amount), 0) FROM kupa_payouts p WHERE p.fund_id = $1) AS paid_out,
       (SELECT COALESCE(SUM(amount), 0) FROM kupa_payout_requests q WHERE q.fund_id = $1 AND q.status = 'pending') AS requested
     FROM kupa_deposits d WHERE d.fund_id = $1`, [fundId]);
  const t = { raised: num(r?.raised), fees: num(r?.fees), donors: num(r?.donors), pending: num(r?.pending), paid_out: num(r?.paid_out), requested: num(r?.requested) };
  return { ...t, available: Math.max(0, Math.round((t.raised - t.paid_out - t.requested) * 100) / 100) };
}

/** ספר הניחומים: רק הפקדות ששולמו. סכום רק אם הקופה מציגה והמפקיד לא ביקש להסתיר. */
export async function book(fund: Fund, limit = 200) {
  const rows = await many<Deposit>(
    `SELECT donor_name, message, amount, hide_amount, paid_at FROM kupa_deposits
     WHERE fund_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT $2`, [fund.id, limit]);
  return rows.map((d) => ({
    name: d.donor_name, message: d.message || null,
    amount: fund.show_amounts && !d.hide_amount ? num(d.amount) : null, at: d.paid_at,
  }));
}

export const depositsOf = (fundId: string) =>
  many<Deposit>(`SELECT * FROM kupa_deposits WHERE fund_id = $1 ORDER BY created_at DESC LIMIT 500`, [fundId]);
export const payoutsOf = (fundId: string) =>
  many<Payout>(`SELECT * FROM kupa_payouts WHERE fund_id = $1 ORDER BY paid_on DESC, created_at DESC`, [fundId]);

export const requestsOf = (fundId: string) =>
  many<PayoutRequest>(`SELECT * FROM kupa_payout_requests WHERE fund_id = $1 ORDER BY created_at DESC`, [fundId]);

export type DocRow = { id: string; kind: string; name: string; mime: string; size: number; note: string | null; created_at: unknown };
export const documentsOf = (fundId: string) =>
  many<DocRow>(`SELECT id, kind, name, mime, size, note, created_at FROM kupa_documents WHERE fund_id = $1 ORDER BY created_at DESC`, [fundId]);
export const tasksDone = async (fundId: string) =>
  new Set((await many<{ task_key: string }>(`SELECT task_key FROM kupa_tasks_done WHERE fund_id = $1`, [fundId])).map((r) => r.task_key));

export function bumpViews(fundId: string) {
  many(`UPDATE kupa_funds SET view_count = view_count + 1 WHERE id = $1`, [fundId]).catch(() => {});
}

export type FundSummary = Fund & { raised: unknown; fees: unknown; donors: unknown; paid_out: unknown; open_requests: unknown };
export const allFunds = () => many<FundSummary>(
  `SELECT f.*,
     COALESCE((SELECT SUM(amount) FROM kupa_deposits d WHERE d.fund_id = f.id AND d.status = 'paid'), 0) AS raised,
     COALESCE((SELECT SUM(fee_amount) FROM kupa_deposits d WHERE d.fund_id = f.id AND d.status = 'paid'), 0) AS fees,
     (SELECT COUNT(*) FROM kupa_deposits d WHERE d.fund_id = f.id AND d.status = 'paid') AS donors,
     COALESCE((SELECT SUM(amount) FROM kupa_payouts p WHERE p.fund_id = f.id), 0) AS paid_out,
     (SELECT COUNT(*) FROM kupa_payout_requests q WHERE q.fund_id = f.id AND q.status = 'pending') AS open_requests
   FROM kupa_funds f ORDER BY f.created_at DESC`);

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

/* ---------- שלב 1: כרטיס ההטבות, ספקים, הטבות, מימושים ---------- */
export type Supplier = {
  id: string; slug: string; name: string; category: string; icon: string; description: string | null; city: string | null;
  phone: string | null; email: string | null; website: string | null; status: 'pending' | 'active' | 'inactive';
  pin: string | null; commission_pct: unknown; created_at: unknown; updated_at: unknown;
};
export type Benefit = {
  id: string; supplier_id: string; title: string; kind: 'percent' | 'fixed' | 'gift'; value: unknown; terms: string | null;
  max_per_family: number; valid_from: unknown; valid_until: unknown; active: boolean; created_at: unknown; updated_at: unknown;
};
export type Redemption = {
  id: string; fund_id: string; supplier_id: string | null; benefit_id: string | null; supplier_name: string; benefit_title: string;
  amount_saved: unknown; order_amount: unknown; commission: unknown; note: string | null; redeemed_by: string | null; nonce: string | null; created_at: unknown;
};
export type SupplierRow = Supplier & { benefits: unknown; redemptions: unknown; orders: unknown; commission: unknown };

export const allSuppliers = () => many<SupplierRow>(
  `SELECT s.*, (SELECT COUNT(*) FROM kupa_benefits b WHERE b.supplier_id = s.id AND b.active) AS benefits,
          (SELECT COUNT(*) FROM kupa_redemptions r WHERE r.supplier_id = s.id) AS redemptions,
          COALESCE((SELECT SUM(order_amount) FROM kupa_redemptions r WHERE r.supplier_id = s.id), 0) AS orders,
          COALESCE((SELECT SUM(commission) FROM kupa_redemptions r WHERE r.supplier_id = s.id), 0) AS commission
   FROM kupa_suppliers s ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, s.created_at DESC`);
export const activeSuppliers = () => many<Supplier>(`SELECT * FROM kupa_suppliers WHERE status = 'active' ORDER BY category, name`);
export const supplierById = (id: string) => one<Supplier>(`SELECT * FROM kupa_suppliers WHERE id = $1`, [id]);
/** הטבות פעילות ובתוקף היום, לספקים פעילים. */
export const liveBenefits = () => many<Benefit & { supplier_name: string }>(
  `SELECT b.*, s.name AS supplier_name FROM kupa_benefits b JOIN kupa_suppliers s ON s.id = b.supplier_id
   WHERE b.active AND s.status = 'active' AND (b.valid_from IS NULL OR b.valid_from <= CURRENT_DATE) AND (b.valid_until IS NULL OR b.valid_until >= CURRENT_DATE)
   ORDER BY s.name, b.created_at`);
export const benefitsOf = (supplierId: string) => many<Benefit>(`SELECT * FROM kupa_benefits WHERE supplier_id = $1 ORDER BY active DESC, created_at`, [supplierId]);
export const benefitById = (id: string) => one<Benefit>(`SELECT * FROM kupa_benefits WHERE id = $1`, [id]);
export const redemptionsOf = (fundId: string) => many<Redemption>(`SELECT * FROM kupa_redemptions WHERE fund_id = $1 ORDER BY created_at DESC`, [fundId]);
export const redemptionsOfSupplier = (supplierId: string) => many<Redemption & { family: string }>(
  `SELECT r.*, f.display_name AS family FROM kupa_redemptions r JOIN kupa_funds f ON f.id = r.fund_id WHERE r.supplier_id = $1 ORDER BY r.created_at DESC LIMIT 200`, [supplierId]);
export const redemptionCount = async (fundId: string, benefitId: string) =>
  num((await one<{ n: unknown }>(`SELECT COUNT(*) AS n FROM kupa_redemptions WHERE fund_id = $1 AND benefit_id = $2`, [fundId, benefitId]))?.n);
/** ספקים פעילים עם ההטבות החיות שלהם, לרשימה הנפתחת בעמוד הסריקה. */
export async function suppliersWithBenefits() {
  const [sups, bens] = await Promise.all([activeSuppliers(), liveBenefits()]);
  return sups.map((s) => ({ id: s.id, name: s.name, category: s.category, benefits: bens.filter((b) => b.supplier_id === s.id) })).filter((s) => s.benefits.length > 0);
}
