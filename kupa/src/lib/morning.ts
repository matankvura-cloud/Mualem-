// מורנינג (Green Invoice): התחברות OAuth, מסוף הסליקה, יצירת קישור תשלום,
// וקריאת ההודעה-חזרה. פורט מ-tlm-ops (supabase/functions/_shared/morning.ts).
//
// ההתחברות היא OAuth 2.0 בשרת אחר (api.morning.co); שאר ה-API ב-greeninvoice.
// הכתובות ניתנות לדריסה ב-env כדי שאפשר יהיה להריץ שרת-דמה בבדיקות.
import { one, many } from './db';

const AUTH_URL = process.env.MORNING_AUTH_URL || 'https://api.morning.co/idp/v1/oauth/token';
export const API_BASE = (process.env.MORNING_API_BASE || 'https://api.greeninvoice.co.il/api/v1').replace(/\/+$/, '');

function authError(status: number, b: Record<string, unknown>): string {
  const map: Record<string, string> = {
    invalid_client: 'מורנינג לא מזהה את המפתח. צריך מפתח חדש: במורנינג ← הגדרות ← חיבורים ← API.',
    unauthorized_client: 'המנוי במורנינג אינו כולל גישת API.',
    invalid_grant: 'המפתח של מורנינג פג או בוטל. צריך ליצור מפתח חדש.',
  };
  return map[String(b?.error ?? '')] || String(b?.error_description || '') || `ההתחברות למורנינג נכשלה (${status})`;
}

let cached: { tok: string; until: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.tok;
  const id = process.env.MORNING_ID || '', sec = process.env.MORNING_SECRET || '';
  if (!id || !sec) throw new Error('החיבור למורנינג לא הוגדר (MORNING_ID / MORNING_SECRET)');
  const r = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: id, client_secret: sec }),
    signal: AbortSignal.timeout(20000),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || !j?.accessToken) throw new Error(authError(r.status, j));
  cached = { tok: String(j.accessToken), until: Date.now() + 10 * 60e3 };
  return cached.tok;
}

/** מסוף הסליקה: מה-env, אחרת מטבלת settings, אחרת נשלף פעם אחת מ-/plugins ונשמר. */
export async function pluginId(tok: string): Promise<string | null> {
  if (process.env.MORNING_PLUGIN_ID) return process.env.MORNING_PLUGIN_ID;
  const stored = await one<{ value: string }>(`SELECT value FROM settings WHERE key = 'MORNING_PLUGIN_ID'`);
  if (stored?.value) return stored.value;
  const r = await fetch(`${API_BASE}/plugins`, { headers: { authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(20000) });
  const b = await r.json().catch(() => null);
  const list: Record<string, unknown>[] = Array.isArray(b) ? b : Array.isArray(b?.items) ? b.items : [];
  const hit = list.find((p) => p?.active && p?.payments && p?.id) ?? list.find((p) => p?.id);
  const id = hit?.id ? String(hit.id) : null;
  if (id) {
    await many(`INSERT INTO settings (key, value) VALUES ('MORNING_PLUGIN_ID', $1)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [id]);
  }
  return id;
}

export function hookToken(): string {
  const t = process.env.MORNING_HOOK || '';
  if (!t) throw new Error('חסר MORNING_HOOK');
  return t;
}

export type PaymentFormInput = {
  description: string;
  lines: { description: string; price: number }[];
  amount: number;
  clientName: string;
  clientEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
  custom: string;
};

/** יוצר עמוד תשלום (type 320 = חשבונית מס/קבלה). מחזיר את כתובת העמוד של מורנינג. */
export async function createPaymentForm(input: PaymentFormInput): Promise<{ url: string } | { error: string; http?: number; body?: string }> {
  let tok: string, plugin: string | null;
  try { tok = await accessToken(); plugin = await pluginId(tok); }
  catch (e) { return { error: e instanceof Error ? e.message : 'מורנינג לא זמינה' }; }
  if (!plugin) return { error: 'לא נמצא מסוף סליקה בחשבון מורנינג' };

  const r = await fetch(`${API_BASE}/payments/form`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      description: input.description, type: 320, lang: 'he', currency: 'ILS',
      // amount ברמה העליונה הוא מה שמורנינג סוכמת לפיו.
      amount: input.amount, pluginId: plugin, maxPayments: 1, group: 100,
      client: { name: input.clientName.slice(0, 120), emails: input.clientEmail ? [input.clientEmail] : undefined, add: false },
      income: input.lines.map((l) => ({ description: l.description, quantity: 1, price: l.price, currency: 'ILS', vatType: 1 })),
      successUrl: input.successUrl, failureUrl: input.failureUrl, notifyUrl: input.notifyUrl,
      custom: input.custom,
    }),
  }).catch((e: Error) => ({ status: 0, text: async () => e.message }) as Response);
  const raw = await r.text();
  let jb: Record<string, unknown> = {};
  try { jb = JSON.parse(raw); } catch { /* לא JSON */ }
  if (r.status >= 400 || r.status === 0 || !jb?.url) {
    console.error('morning payments/form', r.status, raw.slice(0, 600));
    const msg = Number(jb?.errorCode) === 2600
      ? 'מורנינג לא מצאה את מסוף הסליקה. הגדרות ← סליקה וחשבוניות ← איפוס מסוף.'
      : String(jb?.errorMessage || '') || `מורנינג החזירה שגיאה (${r.status})`;
    return { error: msg, http: r.status, body: raw.slice(0, 1500) };
  }
  return { url: String(jb.url) };
}

/* ---------- קריאת ההודעה-חזרה ---------- */
export const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

/** לא מסמנים "שולם" בלי סימן חיובי. */
export function looksPaid(o: Record<string, unknown>): boolean {
  const err = pick(o, ['errorCode', 'error_code']);
  if (err !== undefined && Number(err) !== 0) return false;
  const s = String(pick(o, ['status', 'paymentStatus', 'state']) ?? '').toLowerCase();
  if (['1', 'paid', 'success', 'succeeded', 'completed', 'approved', 'ok'].includes(s)) return true;
  if (['0', '2', 'failed', 'cancelled', 'canceled', 'error', 'declined', 'pending'].includes(s)) return false;
  return !!pick(o, ['id', 'paymentId', 'transactionId', 'dealId']) && !!pick(o, ['amount', 'sum', 'total', 'paymentSum']);
}

export function failureKind(o: Record<string, unknown>): 'failed' | 'cancelled' | null {
  const s = String(pick(o, ['status', 'paymentStatus', 'state']) ?? '').toLowerCase();
  if (['cancelled', 'canceled', 'expired', 'timeout', 'abandoned'].includes(s)) return 'cancelled';
  if (['failed', 'error', 'declined', 'rejected', '0', '2'].includes(s)) return 'failed';
  const err = pick(o, ['errorCode', 'error_code']);
  if (err !== undefined && Number(err) !== 0) return 'failed';
  return null;
}

export async function readHookBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('json')) return ((await req.json()) ?? {}) as Record<string, unknown>;
    const t = await req.text();
    if (!t) return {};
    try { return JSON.parse(t); } catch { /* לא JSON */ }
    const o: Record<string, unknown> = {};
    new URLSearchParams(t).forEach((v, k) => { o[k] = v; });
    return o;
  } catch { return {}; }
}
