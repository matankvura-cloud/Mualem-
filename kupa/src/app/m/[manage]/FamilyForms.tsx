'use client';
// טפסי לקוח של מרכז המשפחה: חתימה על טופס, תזכורת חדשה, בקשת עזרה.
import { useActionState, useState } from 'react';
import { signForm, addReminder, createHelpRequest } from './family-actions';
import type { ActState } from './actions';
import type { FormDef } from '@/data/forms';
import { IcSign, IcCheck } from '@/components/icons';

const HELP_OPTS = [['meals', 'ארוחות'], ['errands', 'סידורים'], ['expenses', 'שיתוף בהוצאות'], ['other', 'אחר']] as const;
const HELP_EX: Record<string, string> = { meals: 'ארוחת ערב ליום שלישי, 8 אנשים, בלי חלב', errands: 'לאסוף את הילדים מהגן ביום רביעי ב-16:00', expenses: 'השתתפות בהוצאות השבעה והמצבה', other: 'מישהו שיענה לטלפונים בשעות הצהריים' };

export function SignForm({ manage, def }: { manage: string; def: FormDef }) {
  const [state, action, pending] = useActionState<ActState, FormData>(signForm.bind(null, manage), undefined);
  const [open, setOpen] = useState(false);
  const v = state?.values || {};
  if (state?.ok) return <p className="notice notice-ok"><IcCheck /> {state.ok}</p>;
  if (!open) return <button className="btn-copper" type="button" onClick={() => setOpen(true)} style={{ width: 'auto' }}><IcSign />לקרוא ולחתום</button>;
  return (
    <form action={action} className="stack sign" style={{ gap: 10 }} noValidate>
      <input type="hidden" name="form_key" value={def.key} />
      <div className="sign-text">{def.text.map((t, i) => <p key={i}>{t}</p>)}</div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`sn-${def.key}`}>שם מלא של החותם/ת</label><input id={`sn-${def.key}`} name="signer_name" type="text" defaultValue={v.signer_name || ''} maxLength={80} autoComplete="name" required /></div>
        <div className="field"><label className="l" htmlFor={`si-${def.key}`}>4 ספרות אחרונות בת״ז</label><input id={`si-${def.key}`} name="signer_id4" type="text" inputMode="numeric" defaultValue={v.signer_id4 || ''} maxLength={4} dir="ltr" required /></div>
      </div>
      <label className="agree"><input type="checkbox" name="agree" defaultChecked={v.agree === 'on'} /> קראתי, ואני מסכים/ה. זו חתימתי.</label>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <div className="fd-actions">
        <button className="btn-copper" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'חותמים…' : 'לחתום'}</button>
        <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>לא עכשיו</button>
      </div>
    </form>
  );
}

export function ReminderForm({ manage }: { manage: string }) {
  const [state, action, pending] = useActionState<ActState, FormData>(addReminder.bind(null, manage), undefined);
  const v = state?.values || {};
  return (
    <form action={action} className="stack" style={{ gap: 8 }} noValidate>
      <div className="grid2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="field"><label className="l" htmlFor="rm-title">תזכורת חדשה</label><input id="rm-title" name="title" type="text" defaultValue={v.title || ''} maxLength={120} placeholder="למשל: להתקשר לביטוח לאומי" required /></div>
        <div className="field"><label className="l" htmlFor="rm-due">מתי</label><input id="rm-due" name="due_on" type="date" defaultValue={v.due_on || ''} /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn-outline" type="submit" disabled={pending} style={{ width: 'auto' }}>{pending ? 'רגע…' : 'להוסיף תזכורת'}</button>
    </form>
  );
}

export function HelpRequestForm({ manage, initialKind }: { manage: string; initialKind?: string }) {
  const [state, action, pending] = useActionState<ActState, FormData>(createHelpRequest.bind(null, manage), undefined);
  const v = state?.values || {};
  const [kind, setKind] = useState(v.kind || initialKind || 'meals');
  return (
    <form action={action} className="stack" style={{ gap: 10 }} noValidate id="ask">
      <div className="sit" role="radiogroup" aria-label="סוג הבקשה">
        {HELP_OPTS.map(([k, l]) => <label key={k} className={`sit-opt${kind === k ? ' on' : ''}`}><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />{l}</label>)}
      </div>
      <div className="field"><label className="l" htmlFor="hr-text">מה צריך</label><textarea id="hr-text" name="text" rows={2} maxLength={300} defaultValue={v.text || ''} placeholder={HELP_EX[kind]} required /></div>
      <div className="field"><label className="l" htmlFor="hr-when">מתי (לא חובה)</label><input id="hr-when" name="when_text" type="text" maxLength={80} defaultValue={v.when_text || ''} placeholder="יום שלישי בערב" /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn-copper" type="submit" disabled={pending}>{pending ? 'שולחים…' : 'לפרסם את הבקשה לקרובים'}</button>
    </form>
  );
}
