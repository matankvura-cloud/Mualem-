'use client';
import { useActionState, useState } from 'react';
import { createFund, type NewState } from './actions';

const STEPS = ['מי', 'מתי ואיפה', 'הקופה ואתם'];

export default function NewFundForm() {
  const [state, action, pending] = useActionState<NewState, FormData>(createFund, undefined);
  // אשף בשלושה צעדים. כל השדות נשארים בטופס (מוסתרים), כך שהשליחה והשרת לא משתנים.
  const [step, setStep] = useState(0);
  // אחרי שגיאה React מאפס את הטופס; מחזירים את מה שהוקלד.
  const v = state?.values ?? {};
  const d = (k: string) => ({ defaultValue: v[k] ?? '' });
  const last = step === STEPS.length - 1;
  return (
    <form action={action} className="fd-pay" noValidate>
      <div>
        <h1>פותחים את מרכז המשפחה</h1>
        <p className="lead">שלושה צעדים קצרים, ומיד יש לכם כרטיס משפחה, קופה, מדריכים וליווי. רק השם ופרטי הקשר שלכם חובה; את כל השאר אפשר להשלים אחר כך.</p>
      </div>

      <ol className="fd-steps" aria-label="שלבי הפתיחה">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'cur' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><i>{i + 1}</i>{s}</li>)}
      </ol>

      <fieldset className="stack" hidden={step !== 0}>
        <legend>מי</legend>
        <div className="field"><label className="l" htmlFor="display_name">שם הנפטר/ת, כפי שיופיע בעמוד</label>
          <input id="display_name" name="display_name" {...d('display_name')} type="text" required maxLength={120} placeholder="למשל: יעקב לוי ז״ל" /></div>
        <div role="radiogroup" aria-label="לזכרו או לזכרה" style={{ display: 'flex', gap: 18 }}>
          <label className="fd-check"><input type="radio" name="gender" value="m" defaultChecked={v.gender !== 'f'} />לזכרו</label>
          <label className="fd-check"><input type="radio" name="gender" value="f" defaultChecked={v.gender === 'f'} />לזכרה</label>
        </div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="years">שנים</label><input id="years" name="years" {...d('years')} type="text" maxLength={60} placeholder="1941 – 2026" /></div>
          <div className="field"><label className="l" htmlFor="city">עיר</label><input id="city" name="city" {...d('city')} type="text" maxLength={80} /></div>
        </div>
      </fieldset>

      <fieldset className="stack" hidden={step !== 1}>
        <legend>מתי ואיפה (אפשר להשלים אחר כך)</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="funeral_date">תאריך הלוויה</label><input id="funeral_date" name="funeral_date" {...d('funeral_date')} type="date" /></div>
          <div className="field"><label className="l" htmlFor="funeral_time">שעה</label><input id="funeral_time" name="funeral_time" {...d('funeral_time')} type="time" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="funeral_place">מקום הלוויה</label><input id="funeral_place" name="funeral_place" {...d('funeral_place')} type="text" maxLength={160} placeholder="בית העלמין, חלקה" /></div>
        <div className="field"><label className="l" htmlFor="shiva_place">כתובת השבעה</label><input id="shiva_place" name="shiva_place" {...d('shiva_place')} type="text" maxLength={200} /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="shiva_date">מתאריך</label><input id="shiva_date" name="shiva_date" {...d('shiva_date')} type="date" /></div>
          <div className="field"><label className="l" htmlFor="shiva_note">שעות / תפילות</label><input id="shiva_note" name="shiva_note" {...d('shiva_note')} type="text" maxLength={160} placeholder="10:00–22:00 · תפילות 06:30, 16:30" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="quote">כמה מילים (יופיעו בראש העמוד)</label>
          <textarea id="quote" name="quote" {...d('quote')} maxLength={300} placeholder="אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום." /></div>
        <div className="field"><label className="l" htmlFor="quote_by">מי כתב</label><input id="quote_by" name="quote_by" {...d('quote_by')} type="text" maxLength={80} placeholder="המשפחה" /></div>
      </fieldset>

      <fieldset className="stack" hidden={step !== 2}>
        <legend>הקופה</legend>
        <div className="field"><label className="l" htmlFor="purpose">לאן הכסף הולך</label>
          <textarea id="purpose" name="purpose" {...d('purpose')} maxLength={500} placeholder="הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה ולאזכרת השלושים." /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="target_ils">יעד בש״ח (לא חובה)</label><input id="target_ils" name="target_ils" {...d('target_ils')} type="text" inputMode="numeric" placeholder="34000" /></div>
          <div className="field"><label className="l" htmlFor="surplus_to">עודף, אם יישאר</label><input id="surplus_to" name="surplus_to" {...d('surplus_to')} type="text" maxLength={300} placeholder="ייתרם ל…" /></div>
        </div>
        <label className="fd-check"><input type="checkbox" name="show_amounts" defaultChecked={state ? v.show_amounts === 'on' : true} />להציג בעמוד כמה נאסף</label>
        <label className="fd-check"><input type="checkbox" name="allow_messages" defaultChecked={state ? v.allow_messages === 'on' : true} />לאפשר למפקידים לכתוב מילה למשפחה</label>
      </fieldset>

      <fieldset className="stack" hidden={step !== 2}>
        <legend>מי מנהל את הקופה (לא מוצג בעמוד)</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="manager_name">שם</label><input id="manager_name" name="manager_name" {...d('manager_name')} type="text" required maxLength={80} autoComplete="name" /></div>
          <div className="field"><label className="l" htmlFor="manager_phone">טלפון</label><input id="manager_phone" name="manager_phone" {...d('manager_phone')} type="tel" required maxLength={30} autoComplete="tel" dir="ltr" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="manager_email">מייל (לא חובה, לשליחת קישור הניהול)</label><input id="manager_email" name="manager_email" {...d('manager_email')} type="email" maxLength={160} autoComplete="email" dir="ltr" /></div>
      </fieldset>

      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}

      {/* מפתחות שונים: אחרת React משתמש באותו אלמנט, משנה type ל-submit באמצע הלחיצה, והדפדפן שולח את הטופס מוקדם. */}
      {last ? (
        <button key="submit" className="btn" type="submit" disabled={pending}>{pending ? 'פותחים…' : 'לפתוח את מרכז המשפחה'}</button>
      ) : (
        <button key="next" className="btn" type="button" onClick={(e) => { e.preventDefault(); setStep(step + 1); }}>המשך</button>
      )}
      <div className="fd-actions">
        {step > 0 ? <button key="back" className="btn-outline" type="button" onClick={(e) => { e.preventDefault(); setStep(step - 1); }}>חזרה</button> : null}
        {!last ? <button key="skip" className="btn-outline" type="button" onClick={(e) => { e.preventDefault(); setStep(STEPS.length - 1); }}>לדלג, להשלים אחר כך</button> : null}
      </div>
      <p className="fd-small">{last ? 'מרכז המשפחה נפתח מיד. שמרו את הקישור האישי שתקבלו בעמוד הבא.' : `שלב ${step + 1} מתוך ${STEPS.length}`}</p>
    </form>
  );
}
