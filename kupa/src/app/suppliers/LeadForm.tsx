'use client';
import { useActionState } from 'react';
import { createLead, type LeadState } from './actions';

export default function LeadForm({ supplierId, fundToken, family }: { supplierId: string; fundToken: string | null; family: string | null }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(createLead.bind(null, supplierId, fundToken), undefined);
  const v = state?.values ?? {};
  if (state?.ok) return (
    <div className="notice notice-ok stack" style={{ gap: 10 }}><div><b>{state.ok}</b> הספק יחזור אליכם.</div>
      {state.wa ? <a className="btn" href={state.wa} target="_blank" rel="noopener">לשלוח לספק בוואטסאפ עכשיו</a> : null}
    </div>);
  return (
    <form action={action} className="stack" noValidate>
      {family ? <p className="fd-small">הפנייה תגיע לספק עם שם המשפחה: {family}.</p> : null}
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="lead-name">שם</label><input id="lead-name" name="name" type="text" required maxLength={80} defaultValue={v.name ?? ''} autoComplete="name" /></div>
        <div className="field"><label className="l" htmlFor="lead-phone">טלפון</label><input id="lead-phone" name="phone" type="tel" required maxLength={30} dir="ltr" defaultValue={v.phone ?? ''} autoComplete="tel" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="lead-msg">מה אתם צריכים</label><textarea id="lead-msg" name="message" maxLength={500} defaultValue={v.message ?? ''} placeholder="למשל: ארוחות ל-20 איש, 3 ימים, מירושלים" /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'שולחים…' : 'לקבל הצעה עם ההטבה'}</button>
      <p className="fd-small">בלי התחייבות. הספק מתחייב לתת את ההטבה של הכרטיס.</p>
    </form>
  );
}
