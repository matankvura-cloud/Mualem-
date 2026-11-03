'use client';
import { useActionState } from 'react';
import { joinSupplier, type JoinState } from '../actions';
import ProfileFields from '../ProfileFields';

export default function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinSupplier, undefined);
  const v = state?.values ?? {};
  if (state?.ok) return <div className="notice notice-ok"><b>תודה.</b> {state.ok}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <ProfileFields v={v} />
      <fieldset className="stack"><legend>ההטבה למשפחות עם הכרטיס</legend>
        <div className="field"><label className="l" htmlFor="j-bt">מה ההטבה</label><input id="j-bt" name="benefit_title" type="text" required maxLength={120} defaultValue={v.benefit_title ?? ''} placeholder="למשל: 10% הנחה על ארוחות לשבעה" /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="j-bk">סוג</label>
            <select id="j-bk" name="benefit_kind" defaultValue={v.benefit_kind ?? 'percent'}><option value="percent">אחוז הנחה</option><option value="fixed">הנחה בשקלים</option><option value="gift">מתנה / שירות</option></select></div>
          <div className="field"><label className="l" htmlFor="j-bv">ערך (אחוז או ש״ח)</label><input id="j-bv" name="benefit_value" type="text" inputMode="decimal" defaultValue={v.benefit_value ?? ''} /></div>
        </div>
        <div className="field"><label className="l" htmlFor="j-bterms">תנאים</label><input id="j-bterms" name="benefit_terms" type="text" maxLength={300} defaultValue={v.benefit_terms ?? ''} placeholder="בהזמנה מראש, לא כולל משלוח" /></div>
      </fieldset>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'שולחים…' : 'להצטרף לרשת הספקים'}</button>
      <p className="fd-small">ההצטרפות חינם. אנחנו גובים עמלה רק על עבודה שנסגרה דרך הכרטיס.</p>
    </form>
  );
}
