'use client';
import { useActionState } from 'react';
import { joinSupplier, type JoinState } from '../actions';

export default function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinSupplier, undefined);
  const v = state?.values ?? {};
  if (state?.ok) return <div className="notice notice-ok"><b>תודה.</b> {state.ok}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <fieldset className="stack"><legend>העסק</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="j-name">שם העסק</label><input id="j-name" name="name" type="text" required maxLength={120} defaultValue={v.name ?? ''} /></div>
          <div className="field"><label className="l" htmlFor="j-cat">תחום</label><input id="j-cat" name="category" type="text" required maxLength={60} defaultValue={v.category ?? ''} placeholder="קייטרינג לשבעה, מצבות, אוהלים וציוד, הסעות, פרחים, ניקיון…" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="j-city">עיר / אזור שירות</label><input id="j-city" name="city" type="text" maxLength={80} defaultValue={v.city ?? ''} /></div>
          <div className="field"><label className="l" htmlFor="j-icon">אייקון</label>
            <select id="j-icon" name="icon" defaultValue={v.icon ?? 'meal'}><option value="meal">ארוחות</option><option value="chairs">ציוד</option><option value="stone">מצבות</option><option value="home">בית</option><option value="flowers">פרחים</option><option value="transport">הסעות</option></select></div>
        </div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="j-phone">טלפון (וואטסאפ) לפניות</label><input id="j-phone" name="phone" type="tel" required maxLength={30} dir="ltr" defaultValue={v.phone ?? ''} /></div>
          <div className="field"><label className="l" htmlFor="j-email">מייל</label><input id="j-email" name="email" type="email" maxLength={160} dir="ltr" defaultValue={v.email ?? ''} /></div>
        </div>
        <div className="field"><label className="l" htmlFor="j-desc">כמה מילים על העסק (יוצג למשפחות)</label><textarea id="j-desc" name="description" maxLength={400} defaultValue={v.description ?? ''} /></div>
      </fieldset>
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
