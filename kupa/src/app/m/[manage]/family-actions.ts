'use server';
// פעולות מרכז המשפחה: חתימה על טפסים, תזכורות, בקשות עזרה.
import { revalidatePath } from 'next/cache';
import { many } from '@/lib/db';
import { fundByManage } from '@/lib/funds';
import { TOKEN_RE, UUID_RE } from '@/lib/tokens';
import { formByKey } from '@/data/forms';
import { HELP_KINDS } from '@/lib/family';
import type { ActState } from './actions';

async function own(manage: string) {
  if (!TOKEN_RE.test(manage)) return null;
  return fundByManage(manage);
}
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** חתימה דיגיטלית פשוטה: שם מלא, 4 ספרות אחרונות של ת"ז, ואישור. */
export async function signForm(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const key = str(fd.get('form_key'), 20);
  const def = formByKey(key);
  if (!def || def.by !== 'family') return { error: 'טופס לא מוכר.' };
  const name = str(fd.get('signer_name'), 80), id4 = str(fd.get('signer_id4'), 4);
  const values = { form_key: key, signer_name: name, signer_id4: id4, agree: fd.get('agree') === 'on' ? 'on' : '' };
  if (name.length < 4 || !name.includes(' ')) return { error: 'כותבים שם מלא, פרטי ומשפחה.', values };
  if (!/^\d{4}$/.test(id4)) return { error: '4 הספרות האחרונות של תעודת הזהות.', values };
  if (fd.get('agree') !== 'on') return { error: 'צריך לסמן שקראתם ואתם מסכימים.', values };
  await many(`INSERT INTO kupa_forms (fund_id, form_key, status, signer_name, signer_id4, signed_at, updated_at) VALUES ($1,$2,'signed',$3,$4,now(),now())
    ON CONFLICT (fund_id, form_key) DO UPDATE SET status='signed', signer_name=EXCLUDED.signer_name, signer_id4=EXCLUDED.signer_id4, signed_at=now(), updated_at=now()`, [fund.id, key, name, id4]);
  revalidatePath(`/m/${manage}/file`); revalidatePath(`/m/${manage}`);
  return { ok: `${def.name} נחתם. תודה.` };
}

/** המשפחה מסמנת שהטופס נשלח לחתימה אצל גורם חיצוני (למשל המעסיק). */
export async function markFormSigning(manage: string, key: string) {
  const fund = await own(manage);
  if (!fund || !formByKey(key)) return;
  await many(`INSERT INTO kupa_forms (fund_id, form_key, status, updated_at) VALUES ($1,$2,'signing',now()) ON CONFLICT (fund_id, form_key) DO UPDATE SET status = CASE WHEN kupa_forms.status = 'signed' THEN 'signed' ELSE 'signing' END, updated_at=now()`, [fund.id, key]);
  revalidatePath(`/m/${manage}/file`); revalidatePath(`/m/${manage}`);
}

export async function addReminder(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const title = str(fd.get('title'), 120), due = str(fd.get('due_on'), 10);
  if (title.length < 2) return { error: 'מה להזכיר?', values: { title, due_on: due } };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: 'תאריך לא תקין.', values: { title, due_on: due } };
  await many(`INSERT INTO kupa_reminders (fund_id, title, due_on) VALUES ($1,$2,$3)`, [fund.id, title, due || null]);
  revalidatePath(`/m/${manage}/now`); revalidatePath(`/m/${manage}`);
  return { ok: 'התזכורת נוספה.' };
}

export async function toggleReminder(manage: string, id: string, done: boolean) {
  const fund = await own(manage);
  if (!fund || !UUID_RE.test(id)) return;
  await many(`UPDATE kupa_reminders SET done = $3 WHERE id = $1 AND fund_id = $2`, [id, fund.id, done]);
  revalidatePath(`/m/${manage}/now`); revalidatePath(`/m/${manage}`);
}

export async function deleteReminder(manage: string, id: string) {
  const fund = await own(manage);
  if (!fund || !UUID_RE.test(id)) return;
  await many(`DELETE FROM kupa_reminders WHERE id = $1 AND fund_id = $2`, [id, fund.id]);
  revalidatePath(`/m/${manage}/now`);
}

/** אירוע שנגזר אוטומטית (שלושים, שנה) הופך לתזכורת אמיתית כדי שאפשר יהיה לסמן אותו. */
export async function adoptReminder(manage: string, title: string, due: string) {
  const fund = await own(manage);
  if (!fund || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return;
  await many(`INSERT INTO kupa_reminders (fund_id, title, due_on, done) VALUES ($1,$2,$3,true)`, [fund.id, str(title, 120), due]);
  revalidatePath(`/m/${manage}/now`); revalidatePath(`/m/${manage}`);
}

export async function createHelpRequest(manage: string, _prev: ActState, fd: FormData): Promise<ActState> {
  const fund = await own(manage);
  if (!fund) return { error: 'הקישור לא תקין' };
  const kind = str(fd.get('kind'), 12), text = str(fd.get('text'), 300), when = str(fd.get('when_text'), 80);
  const values = { kind, text, when_text: when };
  if (!(kind in HELP_KINDS)) return { error: 'בוחרים סוג בקשה.', values };
  if (text.length < 3) return { error: 'כמה מילים על מה צריך.', values };
  const n = await many<{ n: unknown }>(`SELECT COUNT(*) AS n FROM kupa_help_requests WHERE fund_id = $1 AND status <> 'done'`, [fund.id]);
  if (Number(n[0]?.n || 0) >= 30) return { error: 'יש כבר 30 בקשות פתוחות. סמנו כמה כבוצעו.', values };
  await many(`INSERT INTO kupa_help_requests (fund_id, kind, text, when_text) VALUES ($1,$2,$3,$4)`, [fund.id, kind, text, when || null]);
  revalidatePath(`/m/${manage}/help`); revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
  return { ok: 'הבקשה פורסמה בעמוד של הקרובים. שלחו להם את הקישור.' };
}

export async function setHelpStatus(manage: string, id: string, status: 'open' | 'done') {
  const fund = await own(manage);
  if (!fund || !UUID_RE.test(id) || !['open', 'done'].includes(status)) return;
  await many(`UPDATE kupa_help_requests SET status = $3, helper_name = CASE WHEN $3 = 'open' THEN NULL ELSE helper_name END, helper_phone = CASE WHEN $3 = 'open' THEN NULL ELSE helper_phone END WHERE id = $1 AND fund_id = $2`, [id, fund.id, status]);
  revalidatePath(`/m/${manage}/help`); revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
}

export async function deleteHelpRequest(manage: string, id: string) {
  const fund = await own(manage);
  if (!fund || !UUID_RE.test(id)) return;
  await many(`DELETE FROM kupa_help_requests WHERE id = $1 AND fund_id = $2`, [id, fund.id]);
  revalidatePath(`/m/${manage}/help`); revalidatePath(`/m/${manage}`); revalidatePath(`/f/${fund.token}`);
}
