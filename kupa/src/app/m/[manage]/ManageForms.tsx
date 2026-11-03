'use client';
import { useActionState, useState } from 'react';
import { updateFund, addEvent, requestPayout, reviewSupplier, type ActState } from './actions';
import { ils } from '@/lib/format';
import type { Fund } from '@/lib/funds';
import { EVENT_KINDS } from '@/lib/format';

function Status({ s }: { s: ActState }) {
  if (!s) return null;
  return s.error ? <p className="fd-err" role="alert">{s.error}</p> : <p className="notice notice-ok">{s.ok}</p>;
}

export function EditFundForm({ manage, fund }: { manage: string; fund: Fund }) {
  const [state, action, pending] = useActionState<ActState, FormData>(updateFund.bind(null, manage), undefined);
  const target = fund.target_ils ? String(Math.round(Number(fund.target_ils))) : '';
  return (
    <form action={action} className="stack panel" noValidate>
      <h2>פרטי העמוד</h2>
      <div className="field"><label className="l" htmlFor="display_name">שם הנפטר/ת</label><input id="display_name" name="display_name" type="text" required maxLength={120} defaultValue={fund.display_name} /></div>
      <div role="radiogroup" aria-label="לזכרו או לזכרה" style={{ display: 'flex', gap: 18 }}>
        <label className="fd-check"><input type="radio" name="gender" value="m" defaultChecked={fund.gender !== 'f'} />לזכרו</label>
        <label className="fd-check"><input type="radio" name="gender" value="f" defaultChecked={fund.gender === 'f'} />לזכרה</label>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="years">שנים</label><input id="years" name="years" type="text" maxLength={60} defaultValue={fund.years ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="city">עיר</label><input id="city" name="city" type="text" maxLength={80} defaultValue={fund.city ?? ''} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="quote">כמה מילים</label><textarea id="quote" name="quote" maxLength={300} defaultValue={fund.quote ?? ''} /></div>
      <div className="field"><label className="l" htmlFor="quote_by">מי כתב</label><input id="quote_by" name="quote_by" type="text" maxLength={80} defaultValue={fund.quote_by ?? ''} /></div>
      <div className="field"><label className="l" htmlFor="purpose">לאן הכסף הולך</label><textarea id="purpose" name="purpose" maxLength={500} defaultValue={fund.purpose ?? ''} /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="target_ils">יעד בש״ח</label><input id="target_ils" name="target_ils" type="text" inputMode="numeric" defaultValue={target} /></div>
        <div className="field"><label className="l" htmlFor="surplus_to">עודף, אם יישאר</label><input id="surplus_to" name="surplus_to" type="text" maxLength={300} defaultValue={fund.surplus_to ?? ''} /></div>
      </div>
      <label className="fd-check"><input type="checkbox" name="show_amounts" defaultChecked={fund.show_amounts} />להציג בעמוד כמה נאסף</label>
      <label className="fd-check"><input type="checkbox" name="allow_messages" defaultChecked={fund.allow_messages} />לאפשר למפקידים לכתוב מילה למשפחה</label>
      <h3 style={{ fontSize: 15, marginTop: 6 }}>מנהל/ת הקופה (לא מוצג)</h3>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="manager_name">שם</label><input id="manager_name" name="manager_name" type="text" maxLength={80} defaultValue={fund.manager_name ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="manager_phone">טלפון</label><input id="manager_phone" name="manager_phone" type="tel" maxLength={30} dir="ltr" defaultValue={fund.manager_phone ?? ''} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="manager_email">מייל</label><input id="manager_email" name="manager_email" type="email" maxLength={160} dir="ltr" defaultValue={fund.manager_email ?? ''} /></div>
      <Status s={state} />
      <button className="btn" type="submit" disabled={pending}>{pending ? 'שומרים…' : 'לשמור'}</button>
    </form>
  );
}

export function RequestPayoutForm({ manage, available, defaultPayee = '', defaultAmount = '', defaultPurpose = '', suppliers = [] }: { manage: string; available: number; defaultPayee?: string; defaultAmount?: string; defaultPurpose?: string; suppliers?: string[] }) {
  const [state, action, pending] = useActionState<ActState, FormData>(requestPayout.bind(null, manage), undefined);
  const v = state?.values ?? {};
  const initial = v.payee ?? defaultPayee;
  const [pick, setPick] = useState(suppliers.length ? (initial && suppliers.includes(initial) ? initial : initial ? 'other' : suppliers[0]) : 'other');
  return (
    <form action={action} className="stack panel" noValidate>
      <h2>לבקש תשלום לספק מהקופה</h2>
      <p className="muted">בוחרים ספק או כותבים למי, אנחנו מאשרים ומשלמים לספק ישירות מהקופה. היתרה הזמינה: <b>{ils(available)}</b>.</p>
      {suppliers.length ? (
        <div className="field"><label className="l" htmlFor="payee_pick">ספק מהרשימה</label>
          <select id="payee_pick" value={pick} onChange={(e) => setPick(e.target.value)}>
            {suppliers.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="other">ספק אחר (לא ברשימה)</option>
          </select></div>
      ) : null}
      <div className="grid2">
        {pick === 'other' || !suppliers.length
          ? <div className="field"><label className="l" htmlFor="payee">למי לשלם</label><input id="payee" name="payee" defaultValue={initial && !suppliers.includes(initial) ? initial : ''} type="text" required maxLength={120} placeholder="חברה קדישא, קייטרינג, מצבות…" /></div>
          : <input type="hidden" id="payee" name="payee" value={pick} />}
        <div className="field"><label className="l" htmlFor="amount">סכום בש״ח</label><input id="amount" name="amount" defaultValue={v.amount ?? defaultAmount} type="text" inputMode="decimal" required /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="purpose">עבור</label><input id="purpose" name="purpose" defaultValue={v.purpose ?? defaultPurpose} type="text" maxLength={200} placeholder="הלוויה / שבעה / מצבה" /></div>
        <div className="field"><label className="l" htmlFor="contact">איש קשר אצל הספק</label><input id="contact" name="contact" defaultValue={v.contact ?? ''} type="text" maxLength={200} placeholder="שם וטלפון" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="req_note">הערה</label><input id="req_note" name="note" defaultValue={v.note ?? ''} type="text" maxLength={400} placeholder="מספר הצעת מחיר, מועד תשלום…" /></div>
      <Status s={state} />
      <button className="btn-copper" type="submit" disabled={pending || available <= 0}>{pending ? 'שולחים…' : 'לשלוח בקשה'}</button>
    </form>
  );
}

export function AddEventForm({ manage }: { manage: string }) {
  const [state, action, pending] = useActionState<ActState, FormData>(addEvent.bind(null, manage), undefined);
  return (
    <form action={action} className="stack panel" noValidate>
      <h2>להוסיף אירוע</h2>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="kind">סוג</label>
          <select id="kind" name="kind" defaultValue="shiva">{Object.entries(EVENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label className="l" htmlFor="label">כותרת (לא חובה)</label><input id="label" name="label" type="text" maxLength={60} placeholder="למשל: סעודת שבת בשבעה" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="date">תאריך</label><input id="date" name="date" type="date" /></div>
        <div className="field"><label className="l" htmlFor="time">שעה</label><input id="time" name="time" type="time" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="place">מקום</label><input id="place" name="place" type="text" maxLength={160} /></div>
      <div className="field"><label className="l" htmlFor="address">כתובת / פרטים</label><input id="address" name="address" type="text" maxLength={160} /></div>
      <div className="field"><label className="l" htmlFor="note">הערה</label><input id="note" name="note" type="text" maxLength={160} placeholder="תפילות 06:30, 16:30" /></div>
      <div className="field"><label className="l" htmlFor="maps_url">קישור לניווט</label><input id="maps_url" name="maps_url" type="url" maxLength={300} dir="ltr" placeholder="https://maps.google.com/?q=…" /></div>
      <Status s={state} />
      <button className="btn" type="submit" disabled={pending}>{pending ? 'מוסיפים…' : 'להוסיף'}</button>
    </form>
  );
}

export function ReviewForm({ manage, suppliers }: { manage: string; suppliers: { id: string; name: string; reviewed: boolean }[] }) {
  const [state, action, pending] = useActionState<ActState, FormData>(reviewSupplier.bind(null, manage), undefined);
  if (!suppliers.length) return null;
  return (
    <form action={action} className="stack panel" noValidate>
      <h2>לדרג ספק שעבדתם איתו</h2>
      <p className="muted">הדירוג שלכם עוזר למשפחות הבאות. מוצג במדריך עם שם המשפחה בלבד.</p>
      <div className="field"><label className="l" htmlFor="rv-sup">הספק</label>
        <select id="rv-sup" name="supplier" defaultValue={suppliers.find((s) => !s.reviewed)?.id ?? suppliers[0].id}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.reviewed ? ' (דירגתם, אפשר לעדכן)' : ''}</option>)}</select></div>
      <div className="field"><span className="l">כמה כוכבים</span>
        <div className="rate" role="radiogroup" aria-label="דירוג">{[1, 2, 3, 4, 5].map((n) => <label key={n}><input type="radio" name="rating" value={n} defaultChecked={n === 5} aria-label={`${n} כוכבים`} /><span>★</span></label>)}</div></div>
      <div className="field"><label className="l" htmlFor="rv-text">כמה מילים (לא חובה)</label><textarea id="rv-text" name="text" maxLength={500} placeholder="איך היה השירות, האם ההטבה כובדה, האם הגיעו בזמן" /></div>
      <Status s={state} />
      <button className="btn-copper" type="submit" disabled={pending}>{pending ? 'שומרים…' : 'לשלוח דירוג'}</button>
    </form>
  );
}
