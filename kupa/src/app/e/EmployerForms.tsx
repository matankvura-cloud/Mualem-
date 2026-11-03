'use client';
import { useActionState, useState } from 'react';
import { registerEmployer, addCase, approveCase, addEmployee, importEmployees, caseForEmployee, type EmpState } from './actions';

const PKG = [['escort', 'חבילת ליווי'], ['escort-plus', 'ליווי + השתתפות בקופה']] as const;
const s = (v: Record<string, string> | undefined, k: string) => v?.[k] || '';

function CaseFields({ v, prefix = 'c' }: { v?: Record<string, string>; prefix?: string }) {
  return (
    <>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`${prefix}-emp`}>שם העובד/ת</label><input id={`${prefix}-emp`} name="employee_name" type="text" defaultValue={s(v, 'employee_name')} maxLength={80} required /></div>
        <div className="field"><label className="l" htmlFor={`${prefix}-rel`}>הקרבה לנפטר/ת</label><input id={`${prefix}-rel`} name="relation" type="text" defaultValue={s(v, 'relation')} maxLength={40} placeholder="אב, אם, בן/בת זוג…" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`${prefix}-dec`}>שם הנפטר/ת (אם ידוע)</label><input id={`${prefix}-dec`} name="deceased_name" type="text" defaultValue={s(v, 'deceased_name')} maxLength={80} /></div>
        <div className="field"><label className="l" htmlFor={`${prefix}-pkg`}>חבילה</label><select id={`${prefix}-pkg`} name="package" defaultValue={s(v, 'package') || 'escort'}>{PKG.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`${prefix}-fc`}>איש קשר במשפחה</label><input id={`${prefix}-fc`} name="family_contact" type="text" defaultValue={s(v, 'family_contact')} maxLength={80} /></div>
        <div className="field"><label className="l" htmlFor={`${prefix}-fp`}>טלפון במשפחה</label><input id={`${prefix}-fp`} name="family_phone" type="tel" defaultValue={s(v, 'family_phone')} maxLength={30} dir="ltr" /></div>
      </div>
      <div className="field"><label className="l" htmlFor={`${prefix}-note`}>הערה (לא חובה)</label><input id={`${prefix}-note`} name="note" type="text" defaultValue={s(v, 'note')} maxLength={300} placeholder="מה חשוב שנדע" /></div>
    </>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<EmpState, FormData>(registerEmployer, undefined);
  const v = state?.values;
  return (
    <form action={action} className="stack" style={{ gap: 12 }} noValidate>
      <h2 style={{ fontSize: 17 }}>המעסיק</h2>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="e-company">החברה / הארגון</label><input id="e-company" name="company" type="text" defaultValue={s(v, 'company')} maxLength={120} required /></div>
        <div className="field"><label className="l" htmlFor="e-contact">איש קשר (משאבי אנוש / רווחה)</label><input id="e-contact" name="contact_name" type="text" defaultValue={s(v, 'contact_name')} maxLength={80} required /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="e-phone">טלפון</label><input id="e-phone" name="phone" type="tel" defaultValue={s(v, 'phone')} maxLength={30} dir="ltr" required /></div>
        <div className="field"><label className="l" htmlFor="e-email">אימייל</label><input id="e-email" name="email" type="email" defaultValue={s(v, 'email')} maxLength={160} dir="ltr" /></div>
      </div>
      <h2 style={{ fontSize: 17, marginTop: 6 }}>המשפחה של העובד/ת</h2>
      <CaseFields v={v} />
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'רושמים…' : 'לרשום את המשפחה'}</button>
      <p className="fd-small">נחזור לאיש הקשר תוך יום עבודה, וניצור קשר עם המשפחה רק אחרי שהמעסיק אישר.</p>
    </form>
  );
}

export function AddCaseForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<EmpState, FormData>(addCase.bind(null, token), undefined);
  return (
    <form action={action} className="stack" style={{ gap: 12 }} noValidate>
      <CaseFields v={state?.values} prefix="n" />
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn-copper" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'רושמים…' : 'לרשום משפחה נוספת'}</button>
    </form>
  );
}

export function ApproveForm({ token, caseId, company }: { token: string; caseId: string; company: string }) {
  const [state, action, pending] = useActionState<EmpState, FormData>(approveCase.bind(null, token, caseId), undefined);
  if (state?.ok) return <p className="notice notice-ok">{state.ok}</p>;
  return (
    <form action={action} className="stack" style={{ gap: 8 }} noValidate>
      <p className="sign-text" style={{ margin: 0 }}>{company} מאשר/ת את חבילת הליווי למשפחת העובד/ת, ואת העברת פרטי הקשר לצוות "לצידכם" לצורך הליווי בלבד.</p>
      <div className="grid2">
        <input name="signer_name" type="text" placeholder="שם מלא של המאשר/ת" maxLength={80} required />
        <label className="agree"><input type="checkbox" name="agree" /> מאשר/ת בשם המעסיק</label>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn-copper" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'רגע…' : 'לאשר את החבילה'}</button>
    </form>
  );
}

export function EmployeeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<EmpState, FormData>(addEmployee.bind(null, token), undefined);
  const v = state?.values;
  return (
    <form action={action} className="stack" style={{ gap: 8 }} noValidate>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="w-name">שם העובד/ת</label><input id="w-name" name="name" type="text" defaultValue={s(v, 'name')} maxLength={80} required /></div>
        <div className="field"><label className="l" htmlFor="w-phone">טלפון</label><input id="w-phone" name="phone" type="tel" defaultValue={s(v, 'phone')} maxLength={30} dir="ltr" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="w-dept">מחלקה</label><input id="w-dept" name="department" type="text" defaultValue={s(v, 'department')} maxLength={60} /></div>
        <div className="field"><label className="l" htmlFor="w-email">אימייל</label><input id="w-email" name="email" type="email" defaultValue={s(v, 'email')} maxLength={160} dir="ltr" /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn-copper" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'מוסיפים…' : 'להוסיף עובד/ת'}</button>
    </form>
  );
}

export function ImportForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<EmpState, FormData>(importEmployees.bind(null, token), undefined);
  return (
    <form action={action} className="stack" style={{ gap: 8 }} noValidate>
      <div className="field"><label className="l" htmlFor="w-rows">ייבוא רשימה (שורה לכל עובד/ת: שם, טלפון, מחלקה)</label>
        <textarea id="w-rows" name="rows" rows={4} placeholder={'דנה לוי, 050-1234567, שיווק\nיוסי כהן, 052-7654321, תפעול'} dir="auto" /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn-outline" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'מייבאים…' : 'לייבא את הרשימה'}</button>
      <p className="fd-small">אפשר להדביק ישירות מאקסל (עמודות מופרדות בטאב). עד 500 שורות בכל פעם.</p>
    </form>
  );
}

export function CaseForEmployeeForm({ token, employeeId, name }: { token: string; employeeId: string; name: string }) {
  const [state, action, pending] = useActionState<EmpState, FormData>(caseForEmployee.bind(null, token, employeeId), undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <p className="notice notice-ok">{state.ok}</p>;
  if (!open) return <button className="btn-copper" type="button" onClick={() => setOpen(true)} style={{ width: 'auto', minHeight: 36, fontSize: 13 }}>לרשום את המשפחה לליווי</button>;
  return (
    <form action={action} className="stack" style={{ gap: 8 }} noValidate>
      <p className="muted">המשפחה של {name}. ממלאים רק מה שידוע; את השאר נברר בשיחה.</p>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`ce-rel-${employeeId}`}>מי נפטר/ה (הקרבה)</label><input id={`ce-rel-${employeeId}`} name="relation" type="text" maxLength={40} placeholder="אב, אם, בן/בת זוג…" /></div>
        <div className="field"><label className="l" htmlFor={`ce-dec-${employeeId}`}>שם הנפטר/ת</label><input id={`ce-dec-${employeeId}`} name="deceased_name" type="text" maxLength={80} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`ce-pkg-${employeeId}`}>חבילה</label><select id={`ce-pkg-${employeeId}`} name="package" defaultValue="escort">{PKG.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label className="l" htmlFor={`ce-fp-${employeeId}`}>טלפון במשפחה (אם שונה)</label><input id={`ce-fp-${employeeId}`} name="family_phone" type="tel" maxLength={30} dir="ltr" /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <div className="fd-actions">
        <button className="btn-copper" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'רושמים…' : 'לרשום לליווי'}</button>
        <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>ביטול</button>
      </div>
    </form>
  );
}
