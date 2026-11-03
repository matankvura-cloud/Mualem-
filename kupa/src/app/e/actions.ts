'use server';
// פורטל מעסיקים: רישום מעסיק ומשפחה של עובד, הוספת מקרה, אישור חבילת הליווי.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { many, one } from '@/lib/db';
import { employerByToken, PACKAGES, type EmployerCase } from '@/lib/family';
import { TOKEN_RE, UUID_RE, token } from '@/lib/tokens';
import { newPin } from '@/lib/login';

export type EmpState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max);
const PHONE_OK = (p: string) => p.replace(/\D/g, '').length >= 9;

function caseInput(fd: FormData) {
  const v = { employee_name: str(fd, 'employee_name', 80), deceased_name: str(fd, 'deceased_name', 80), relation: str(fd, 'relation', 40), family_contact: str(fd, 'family_contact', 80), family_phone: str(fd, 'family_phone', 30), package: str(fd, 'package', 20), note: str(fd, 'note', 300) };
  if (!(v.package in PACKAGES)) v.package = 'escort';
  return v;
}

export async function registerEmployer(_prev: EmpState, fd: FormData): Promise<EmpState> {
  const v = { company: str(fd, 'company', 120), contact_name: str(fd, 'contact_name', 80), phone: str(fd, 'phone', 30), email: str(fd, 'email', 160), ...caseInput(fd) };
  if (v.company.length < 2) return { error: 'שם החברה או הארגון.', values: v };
  if (v.contact_name.length < 2) return { error: 'מי איש הקשר מטעם המעסיק?', values: v };
  if (!PHONE_OK(v.phone)) return { error: 'טלפון של איש הקשר.', values: v };
  if (v.employee_name.length < 2) return { error: 'שם העובד/ת.', values: v };
  if (v.family_phone && !PHONE_OK(v.family_phone)) return { error: 'הטלפון של המשפחה לא תקין.', values: v };
  const t = token(24);
  const emp = await one<{ id: string }>(`INSERT INTO kupa_employers (token, company, contact_name, phone, email, pin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [t, v.company, v.contact_name, v.phone, v.email || null, newPin()]);
  if (!emp) return { error: 'משהו השתבש. נסו שוב.', values: v };
  await many(`INSERT INTO kupa_employer_cases (employer_id, employee_name, deceased_name, relation, family_contact, family_phone, package, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [emp.id, v.employee_name, v.deceased_name || null, v.relation || null, v.family_contact || null, v.family_phone || null, v.package, v.note || null]);
  redirect(`/e/${t}?new=1`);
}

export async function addCase(empToken: string, _prev: EmpState, fd: FormData): Promise<EmpState> {
  if (!TOKEN_RE.test(empToken)) return { error: 'הקישור לא תקין' };
  const emp = await employerByToken(empToken);
  if (!emp) return { error: 'הקישור לא תקין' };
  const v = caseInput(fd);
  if (v.employee_name.length < 2) return { error: 'שם העובד/ת.', values: v };
  if (v.family_phone && !PHONE_OK(v.family_phone)) return { error: 'הטלפון של המשפחה לא תקין.', values: v };
  await many(`INSERT INTO kupa_employer_cases (employer_id, employee_name, deceased_name, relation, family_contact, family_phone, package, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [emp.id, v.employee_name, v.deceased_name || null, v.relation || null, v.family_contact || null, v.family_phone || null, v.package, v.note || null]);
  revalidatePath(`/e/${empToken}`);
  return { ok: 'המשפחה נרשמה. ניצור קשר תוך יום עבודה.' };
}

/** אישור המעסיק לחבילה: חתימה פשוטה (שם + אישור). אם המקרה מקושר לקופה, הטופס "אישור מהמעסיק" נחתם אצל המשפחה. */
export async function approveCase(empToken: string, caseId: string, _prev: EmpState, fd: FormData): Promise<EmpState> {
  if (!TOKEN_RE.test(empToken) || !UUID_RE.test(caseId)) return { error: 'הקישור לא תקין' };
  const emp = await employerByToken(empToken);
  const c = emp ? await one<EmployerCase>(`SELECT * FROM kupa_employer_cases WHERE id = $1 AND employer_id = $2`, [caseId, emp.id]) : null;
  if (!emp || !c) return { error: 'הקישור לא תקין' };
  const name = str(fd, 'signer_name', 80);
  if (name.length < 4 || !name.includes(' ')) return { error: 'שם מלא של המאשר/ת.' };
  if (fd.get('agree') !== 'on') return { error: 'צריך לסמן את האישור.' };
  await many(`UPDATE kupa_employer_cases SET approved_at = now(), note = COALESCE(note, '') || $3, updated_at = now() WHERE id = $1 AND employer_id = $2`, [caseId, emp.id, `\nאושר על ידי ${name}`]);
  if (c.fund_id) {
    await many(`INSERT INTO kupa_forms (fund_id, form_key, status, signer_name, signed_at, note, updated_at) VALUES ($1,'employer','signed',$2,now(),$3,now())
      ON CONFLICT (fund_id, form_key) DO UPDATE SET status='signed', signer_name=EXCLUDED.signer_name, signed_at=now(), note=EXCLUDED.note, updated_at=now()`, [c.fund_id, name, emp.company]);
  }
  revalidatePath(`/e/${empToken}`);
  return { ok: 'האישור נרשם. תודה.' };
}

/** רשימת העובדים: הוספה אחת, ייבוא מרשימה (שורה לעובד: שם, טלפון, מחלקה), מחיקה. */
export async function addEmployee(empToken: string, _prev: EmpState, fd: FormData): Promise<EmpState> {
  if (!TOKEN_RE.test(empToken)) return { error: 'הקישור לא תקין' };
  const emp = await employerByToken(empToken);
  if (!emp) return { error: 'הקישור לא תקין' };
  const v = { name: str(fd, 'name', 80), phone: str(fd, 'phone', 30), email: str(fd, 'email', 160), department: str(fd, 'department', 60) };
  if (v.name.length < 2) return { error: 'שם העובד/ת.', values: v };
  if (v.phone && !PHONE_OK(v.phone)) return { error: 'הטלפון לא תקין.', values: v };
  const n = await one<{ n: unknown }>(`SELECT COUNT(*) AS n FROM kupa_employees WHERE employer_id = $1`, [emp.id]);
  if (Number(n?.n || 0) >= 2000) return { error: 'הגעתם ל-2000 עובדים. דברו איתנו.', values: v };
  await many(`INSERT INTO kupa_employees (employer_id, name, phone, email, department) VALUES ($1,$2,$3,$4,$5)`, [emp.id, v.name, v.phone || null, v.email || null, v.department || null]);
  revalidatePath(`/e/${empToken}`);
  return { ok: `${v.name} נוסף/ה לרשימה.` };
}

export async function importEmployees(empToken: string, _prev: EmpState, fd: FormData): Promise<EmpState> {
  if (!TOKEN_RE.test(empToken)) return { error: 'הקישור לא תקין' };
  const emp = await employerByToken(empToken);
  if (!emp) return { error: 'הקישור לא תקין' };
  const text = String(fd.get('rows') || '').slice(0, 200000);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 500);
  if (!lines.length) return { error: 'הדביקו רשימה: שורה לכל עובד/ת, למשל "דנה לוי, 050-1234567, שיווק".' };
  let added = 0, skipped = 0;
  for (const line of lines) {
    const parts = line.split(/[,\t;]+/).map((p) => p.trim());
    const name = (parts[0] || '').slice(0, 80);
    const phone = (parts.find((p, i) => i > 0 && /\d{7,}/.test(p)) || '').slice(0, 30);
    const dept = (parts.find((p, i) => i > 0 && p && !/\d{7,}/.test(p) && !p.includes('@')) || '').slice(0, 60);
    const email = (parts.find((p) => p.includes('@')) || '').slice(0, 160);
    if (name.length < 2 || /^(שם|name)$/i.test(name)) { skipped++; continue; }
    await many(`INSERT INTO kupa_employees (employer_id, name, phone, email, department) VALUES ($1,$2,$3,$4,$5)`, [emp.id, name, phone || null, email || null, dept || null]);
    added++;
  }
  revalidatePath(`/e/${empToken}`);
  return { ok: `נוספו ${added} עובדים${skipped ? `, ${skipped} שורות דולגו` : ''}.` };
}

export async function deleteEmployee(empToken: string, id: string) {
  if (!TOKEN_RE.test(empToken) || !UUID_RE.test(id)) return;
  const emp = await employerByToken(empToken);
  if (!emp) return;
  await many(`DELETE FROM kupa_employees WHERE id = $1 AND employer_id = $2`, [id, emp.id]);
  revalidatePath(`/e/${empToken}`);
}

/** רישום משפחה לליווי מתוך רשימת העובדים: לוחצים על עובד/ת, ממלאים רק מה שקרה. */
export async function caseForEmployee(empToken: string, employeeId: string, _prev: EmpState, fd: FormData): Promise<EmpState> {
  if (!TOKEN_RE.test(empToken) || !UUID_RE.test(employeeId)) return { error: 'הקישור לא תקין' };
  const emp = await employerByToken(empToken);
  const { employeeById } = await import('@/lib/family');
  const e = emp ? await employeeById(employeeId, emp.id) : null;
  if (!emp || !e) return { error: 'העובד/ת לא נמצא/ה' };
  const v = caseInput(fd);
  await many(`INSERT INTO kupa_employer_cases (employer_id, employee_id, employee_name, deceased_name, relation, family_contact, family_phone, package, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [emp.id, e.id, e.name, v.deceased_name || null, v.relation || null, v.family_contact || e.name, v.family_phone || e.phone || null, v.package, v.note || null]);
  revalidatePath(`/e/${empToken}`);
  return { ok: `המשפחה של ${e.name} נרשמה לליווי. ניצור קשר תוך יום עבודה.` };
}
