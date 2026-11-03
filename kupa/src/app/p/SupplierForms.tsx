'use client';
import { useActionState } from 'react';
import { saveBenefit, updateSupplierProfile, setLeadStatus, type FormState } from './actions';

export function BenefitForm({ supplierId, asAdmin = false }: { supplierId: string; asAdmin?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBenefit.bind(null, supplierId, asAdmin), undefined);
  return (
    <form action={action} className="stack card" noValidate>
      <h3 style={{ fontSize: 15 }}>להוסיף הטבה</h3>
      <div className="field"><label className="l" htmlFor="b-title">שם ההטבה</label><input id="b-title" name="title" type="text" required maxLength={120} placeholder="למשל: 10% הנחה על ארוחות לשבעה" /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="b-kind">סוג</label>
          <select id="b-kind" name="kind" defaultValue="percent"><option value="percent">אחוז הנחה</option><option value="fixed">הנחה בשקלים</option><option value="gift">מתנה / שירות</option></select></div>
        <div className="field"><label className="l" htmlFor="b-value">ערך (אחוז או ש״ח)</label><input id="b-value" name="value" type="text" inputMode="decimal" placeholder="10" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="b-terms">תנאים (יוצגו למשפחה)</label><input id="b-terms" name="terms" type="text" maxLength={300} placeholder="בהזמנה מראש, לא כולל משלוח" /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="b-max">כמה פעמים למשפחה</label><input id="b-max" name="max_per_family" type="number" min={1} max={20} defaultValue={1} /></div>
        <div className="field"><label className="l" htmlFor="b-until">בתוקף עד (לא חובה)</label><input id="b-until" name="valid_until" type="date" /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'שומרים…' : 'להוסיף הטבה'}</button>
    </form>
  );
}

export function ProfileForm({ v }: { v: { description: string | null; city: string | null; phone: string | null; website: string | null } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSupplierProfile, undefined);
  return (
    <form action={action} className="stack card" noValidate>
      <h3 style={{ fontSize: 15 }}>הפרופיל שלכם (מוצג למשפחות)</h3>
      <div className="field"><label className="l" htmlFor="p-desc">תיאור קצר</label><textarea id="p-desc" name="description" maxLength={400} defaultValue={v.description ?? ''} /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="p-city">עיר / אזור</label><input id="p-city" name="city" type="text" maxLength={80} defaultValue={v.city ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="p-phone">טלפון</label><input id="p-phone" name="phone" type="tel" maxLength={30} dir="ltr" defaultValue={v.phone ?? ''} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="p-web">אתר (לא חובה)</label><input id="p-web" name="website" type="url" maxLength={200} dir="ltr" defaultValue={v.website ?? ''} /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'שומרים…' : 'לשמור'}</button>
    </form>
  );
}

export function LeadActions({ leadId, status, asAdmin = false }: { leadId: string; status: string; asAdmin?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setLeadStatus.bind(null, leadId, asAdmin), undefined);
  if (status === 'closed' || status === 'lost') return state?.ok ? <small className="muted">{state.ok}</small> : null;
  return (
    <form action={action} className="stack" style={{ gap: 6 }} noValidate>
      <div className="fd-actions">
        {status === 'new' ? <button className="btn-outline" type="submit" name="status" value="contacted" disabled={pending} style={{ minHeight: 36, fontSize: 13 }}>דיברנו</button> : null}
        <button className="btn-ghost" type="submit" name="status" value="lost" disabled={pending} style={{ minHeight: 36, fontSize: 13 }}>לא יצא</button>
      </div>
      <div className="fd-actions">
        <input name="order_amount" type="text" inputMode="decimal" placeholder="סכום העבודה בש״ח" style={{ flex: 1 }} />
        <button className="btn btn-inline" type="submit" name="status" value="closed" disabled={pending} style={{ minHeight: 36, fontSize: 13 }}>נסגר</button>
      </div>
      {state?.error ? <p className="fd-err">{state.error}</p> : null}
    </form>
  );
}
