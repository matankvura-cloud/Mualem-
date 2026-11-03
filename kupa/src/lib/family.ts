// שכבת הנתונים של מרכז המשפחה "לצידכם": טפסים וחתימות, תזכורות, בקשות עזרה,
// מעסיקים, והתראות שנגזרות מכל אלה. שרת בלבד.
import { many, one } from './db';
import type { Fund } from './funds';
import { FORMS } from '@/data/forms';
import type { FundEvent } from './format';

export type FormRow = { fund_id: string; form_key: string; status: 'todo' | 'signing' | 'signed'; signer_name: string | null; signer_id4: string | null; signed_at: unknown; note: string | null; updated_at: unknown };
export const formsOf = async (fundId: string) => {
  const rows = await many<FormRow>(`SELECT * FROM kupa_forms WHERE fund_id = $1`, [fundId]);
  const map = new Map(rows.map((r) => [r.form_key, r]));
  return FORMS.map((f) => ({ def: f, row: map.get(f.key) || null, status: (map.get(f.key)?.status || 'todo') as FormRow['status'] }));
};

export type Reminder = { id: string; fund_id: string; title: string; due_on: unknown; done: boolean; created_at: unknown; auto?: boolean };
export const remindersOf = (fundId: string) => many<Reminder>(`SELECT * FROM kupa_reminders WHERE fund_id = $1 ORDER BY done, due_on NULLS LAST, created_at`, [fundId]);

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** תזכורות שנגזרות מהאירועים: שלושים ושנה אחרי ההלוויה, אם לא נקבעו ידנית. */
export function autoReminders(fund: Fund): Reminder[] {
  const out: Reminder[] = [];
  const funeral = fund.events.find((e: FundEvent) => e.kind === 'funeral' && e.date);
  if (funeral?.date) {
    if (!fund.events.some((e) => e.kind === 'shloshim')) out.push({ id: 'auto-shloshim', fund_id: fund.id, title: 'לקבוע את אזכרת השלושים', due_on: addDays(funeral.date, 23), done: false, created_at: null, auto: true });
    out.push({ id: 'auto-year', fund_id: fund.id, title: 'אזכרת השנה: לבדוק את התאריך העברי', due_on: addDays(funeral.date, 340), done: false, created_at: null, auto: true });
  }
  for (const e of fund.events) {
    if (e.date && e.date >= today()) out.push({ id: `auto-ev-${e.id}`, fund_id: fund.id, title: e.kind === 'funeral' ? 'הלוויה' : e.kind === 'shiva' ? 'שבעה' : e.kind === 'shloshim' ? 'אזכרת השלושים' : e.kind === 'azkara' ? 'אזכרה' : e.label || 'אירוע', due_on: e.date, done: false, created_at: null, auto: true });
  }
  return out;
}
export const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

export type HelpRequest = { id: string; fund_id: string; kind: 'meals' | 'errands' | 'expenses' | 'other'; text: string; when_text: string | null; status: 'open' | 'taken' | 'done'; helper_name: string | null; helper_phone: string | null; taken_at: unknown; created_at: unknown };
export const HELP_KINDS: Record<string, { label: string; hint: string; example: string }> = {
  meals: { label: 'ארוחות', hint: 'מי מביא אוכל ומתי', example: 'ארוחת ערב ליום שלישי, 8 אנשים, בלי חלב' },
  errands: { label: 'סידורים', hint: 'הסעות, קניות, ילדים', example: 'לאסוף את הילדים מהגן ביום רביעי ב-16:00' },
  expenses: { label: 'שיתוף בהוצאות', hint: 'הפקדה לקופה של המשפחה', example: 'השתתפות בהוצאות השבעה והמצבה' },
  other: { label: 'אחר', hint: 'כל דבר אחר', example: 'מישהו שיענה לטלפונים בשעות הצהריים' },
};
export const HELP_STATUS: Record<string, [string, string]> = { open: ['פתוח', 'pill-warn'], taken: ['מישהו לקח', 'pill-ok'], done: ['בוצע', 'pill-muted'] };
export const helpRequestsOf = (fundId: string) => many<HelpRequest>(`SELECT * FROM kupa_help_requests WHERE fund_id = $1 ORDER BY (status = 'done'), created_at DESC`, [fundId]);
export const openHelpRequests = (fundId: string) => many<HelpRequest>(`SELECT id, fund_id, kind, text, when_text, status, helper_name, NULL AS helper_phone, taken_at, created_at FROM kupa_help_requests WHERE fund_id = $1 AND status <> 'done' ORDER BY created_at DESC`, [fundId]);

export type Employer = { id: string; token: string; company: string; contact_name: string; phone: string; email: string | null; created_at: unknown };
export type EmployerCase = { id: string; employer_id: string; employee_name: string; deceased_name: string | null; relation: string | null; family_contact: string | null; family_phone: string | null; package: string; status: 'new' | 'contacted' | 'active' | 'done'; fund_id: string | null; approved_at: unknown; note: string | null; created_at: unknown; updated_at: unknown };
export const CASE_STATUS: Record<string, [string, string]> = { new: ['התקבל', 'pill-warn'], contacted: ['יצרנו קשר', 'pill'], active: ['בליווי', 'pill-ok'], done: ['הסתיים', 'pill-muted'] };
export const PACKAGES: Record<string, { label: string; what: string }> = {
  escort: { label: 'חבילת ליווי', what: 'רכז/ת אישי/ת למשפחה, מרכז המשפחה הדיגיטלי, וכרטיס המשפחה עם ההטבות.' },
  'escort-plus': { label: 'ליווי + השתתפות', what: 'כל חבילת הליווי, והמעסיק מפקיד סכום לקופה של המשפחה.' },
};
export const employerByToken = (t: string) => one<Employer>(`SELECT * FROM kupa_employers WHERE token = $1`, [t]);
export const employerCases = (employerId: string) => many<EmployerCase & { family: string | null }>(`SELECT c.*, f.display_name AS family FROM kupa_employer_cases c LEFT JOIN kupa_funds f ON f.id = c.fund_id WHERE c.employer_id = $1 ORDER BY c.created_at DESC`, [employerId]);
export const allEmployerCases = () => many<EmployerCase & { company: string; contact_name: string; phone: string; family: string | null }>(`SELECT c.*, e.company, e.contact_name, e.phone, f.display_name AS family FROM kupa_employer_cases c JOIN kupa_employers e ON e.id = c.employer_id LEFT JOIN kupa_funds f ON f.id = c.fund_id ORDER BY (c.status = 'done'), c.created_at DESC`);
export const caseById = (id: string) => one<EmployerCase>(`SELECT * FROM kupa_employer_cases WHERE id = $1`, [id]);
export const caseOfFund = (fundId: string) => one<EmployerCase & { company: string }>(`SELECT c.*, e.company FROM kupa_employer_cases c JOIN kupa_employers e ON e.id = c.employer_id WHERE c.fund_id = $1 ORDER BY c.created_at DESC LIMIT 1`, [fundId]);

/** התראות למשפחה, נגזרות מהמצב: בקשות שממתינות, עזרה שנלקחה, טפסים, תזכורות קרובות, הפקדות חדשות. */
export type Notice = { key: string; text: string; href: string; tone: 'ok' | 'warn' | 'info' };
export async function noticesOf(fund: Fund, base: string): Promise<Notice[]> {
  const [reqs, helps, forms, rems, deps] = await Promise.all([
    many<{ n: unknown }>(`SELECT COUNT(*) AS n FROM kupa_payout_requests WHERE fund_id = $1 AND status = 'pending'`, [fund.id]),
    many<HelpRequest>(`SELECT * FROM kupa_help_requests WHERE fund_id = $1 AND status = 'taken' ORDER BY taken_at DESC LIMIT 5`, [fund.id]),
    formsOf(fund.id),
    remindersOf(fund.id),
    many<{ n: unknown; last: unknown }>(`SELECT COUNT(*) AS n, MAX(donor_name) AS last FROM kupa_deposits WHERE fund_id = $1 AND status = 'paid' AND paid_at > now() - interval '3 days'`, [fund.id]),
  ]);
  const out: Notice[] = [];
  const pend = Number(reqs[0]?.n || 0);
  if (pend) out.push({ key: 'req', text: `${pend} ${pend === 1 ? 'בקשת תשלום ממתינה' : 'בקשות תשלום ממתינות'} לאישור`, href: `${base}/card`, tone: 'info' });
  for (const h of helps) out.push({ key: `help-${h.id}`, text: `${h.helper_name || 'מישהו'} לוקח/ת: ${h.text.slice(0, 60)}`, href: `${base}/help`, tone: 'ok' });
  const signing = forms.filter((f) => f.status === 'signing');
  for (const f of signing) out.push({ key: `form-${f.def.key}`, text: `${f.def.name}: בתהליך חתימה`, href: `${base}/file#forms`, tone: 'warn' });
  const t = today();
  const soon = [...rems.filter((r) => !r.done && r.due_on), ...autoReminders(fund)].filter((r) => String(r.due_on) >= t && String(r.due_on) <= addDays(t, 7));
  for (const r of soon.slice(0, 4)) out.push({ key: `rem-${r.id}`, text: `${r.title} · ${String(r.due_on).split('-').reverse().slice(0, 2).join('.')}`, href: `${base}/now#reminders`, tone: 'info' });
  const nd = Number(deps[0]?.n || 0);
  if (nd) out.push({ key: 'deps', text: nd === 1 ? `${deps[0].last} הפקיד/ה לקופה` : `${nd} הפקדות חדשות לקופה`, href: `${base}/help`, tone: 'ok' });
  return out;
}
