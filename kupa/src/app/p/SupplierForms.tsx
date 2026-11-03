'use client';
import { useActionState } from 'react';
import { saveBenefit, updateSupplierProfile, setLeadStatus, type FormState } from './actions';
import ProfileFields from '@/app/suppliers/ProfileFields';

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

export function ProfileForm({ v, hasLogo }: { v: Record<string, string | number | null>; hasLogo: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSupplierProfile, undefined);
  return (
    <div className="stack">
      <form action="/api/p/logo" method="post" encType="multipart/form-data" className="card stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 15 }}>לוגו</h3>
        <div className="fd-actions" style={{ alignItems: 'center' }}>
          {hasLogo ? <img src={`/suppliers/logo/${v.id}?v=${String(v.updated_at)}`} alt="" width={56} height={56} style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid var(--line)' }} /> : null}
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required style={{ flex: 1 }} />
          <button className="btn-outline" type="submit" style={{ width: 'auto' }}>להעלות</button>
        </div>
        <small className="muted">ריבוע, עד 2MB. מוצג במדריך ובעמוד שלכם.</small>
      </form>
      <form action={action} className="stack card" noValidate>
        <h3 style={{ fontSize: 15 }}>הפרופיל שלכם (מוצג למשפחות)</h3>
        <ProfileFields v={v} withBasics={false} />
        {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
        <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'שומרים…' : 'לשמור'}</button>
      </form>
    </div>
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
