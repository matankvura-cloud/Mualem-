'use client';
import { useActionState } from 'react';
import { createFund, type NewState } from './actions';

export default function NewFundForm() {
  const [state, action, pending] = useActionState<NewState, FormData>(createFund, undefined);
  return (
    <form action={action} className="fd-pay" noValidate>
      <div>
        <h1>פותחים קופה לזכרו</h1>
        <p className="lead">דקה אחת, ואפשר לשלוח את הקישור. את כל הפרטים אפשר לערוך אחר כך מקישור הניהול.</p>
      </div>

      <fieldset className="stack">
        <legend>מי</legend>
        <div className="field"><label className="l" htmlFor="display_name">שם הנפטר/ת, כפי שיופיע בעמוד</label>
          <input id="display_name" name="display_name" type="text" required maxLength={120} placeholder="למשל: יעקב לוי ז״ל" /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="years">שנים</label><input id="years" name="years" type="text" maxLength={60} placeholder="1941 – 2026" /></div>
          <div className="field"><label className="l" htmlFor="city">עיר</label><input id="city" name="city" type="text" maxLength={80} /></div>
        </div>
        <div className="field"><label className="l" htmlFor="quote">כמה מילים (יופיעו בראש העמוד)</label>
          <textarea id="quote" name="quote" maxLength={300} placeholder="אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום." /></div>
        <div className="field"><label className="l" htmlFor="quote_by">מי כתב</label><input id="quote_by" name="quote_by" type="text" maxLength={80} placeholder="המשפחה" /></div>
      </fieldset>

      <fieldset className="stack">
        <legend>מתי ואיפה (אפשר להשלים אחר כך)</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="funeral_date">תאריך הלוויה</label><input id="funeral_date" name="funeral_date" type="date" /></div>
          <div className="field"><label className="l" htmlFor="funeral_time">שעה</label><input id="funeral_time" name="funeral_time" type="time" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="funeral_place">מקום הלוויה</label><input id="funeral_place" name="funeral_place" type="text" maxLength={160} placeholder="בית העלמין, חלקה" /></div>
        <div className="field"><label className="l" htmlFor="shiva_place">כתובת השבעה</label><input id="shiva_place" name="shiva_place" type="text" maxLength={200} /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="shiva_date">מתאריך</label><input id="shiva_date" name="shiva_date" type="date" /></div>
          <div className="field"><label className="l" htmlFor="shiva_note">שעות / תפילות</label><input id="shiva_note" name="shiva_note" type="text" maxLength={160} placeholder="10:00–22:00 · תפילות 06:30, 16:30" /></div>
        </div>
      </fieldset>

      <fieldset className="stack">
        <legend>הקופה</legend>
        <div className="field"><label className="l" htmlFor="purpose">לאן הכסף הולך</label>
          <textarea id="purpose" name="purpose" maxLength={500} placeholder="הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה ולאזכרת השלושים." /></div>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="target_ils">יעד בש״ח (לא חובה)</label><input id="target_ils" name="target_ils" type="text" inputMode="numeric" placeholder="34000" /></div>
          <div className="field"><label className="l" htmlFor="surplus_to">עודף, אם יישאר</label><input id="surplus_to" name="surplus_to" type="text" maxLength={300} placeholder="ייתרם ל…" /></div>
        </div>
        <label className="fd-check"><input type="checkbox" name="show_amounts" defaultChecked />להציג בעמוד כמה נאסף</label>
        <label className="fd-check"><input type="checkbox" name="allow_messages" defaultChecked />לאפשר למפקידים לכתוב מילה למשפחה</label>
      </fieldset>

      <fieldset className="stack">
        <legend>מי מנהל את הקופה (לא מוצג בעמוד)</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="manager_name">שם</label><input id="manager_name" name="manager_name" type="text" required maxLength={80} autoComplete="name" /></div>
          <div className="field"><label className="l" htmlFor="manager_phone">טלפון</label><input id="manager_phone" name="manager_phone" type="tel" required maxLength={30} autoComplete="tel" dir="ltr" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="manager_email">מייל (לא חובה, לשליחת קישור הניהול)</label><input id="manager_email" name="manager_email" type="email" maxLength={160} autoComplete="email" dir="ltr" /></div>
      </fieldset>

      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'פותחים…' : 'לפתוח את הקופה'}</button>
      <p className="fd-small">הקופה נפתחת מיד. שמרו את קישור הניהול שתקבלו בעמוד הבא.</p>
    </form>
  );
}
