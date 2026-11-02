'use client';
import { useActionState } from 'react';
import { adminLogin, addPayout, type LoginState, type PayoutState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(adminLogin, undefined);
  return (
    <form action={action} className="fd-pay" style={{ paddingTop: 40 }}>
      <div><h1>ניהול</h1><p className="lead">מסך הניהול של קופת לזכרו. סיסמה בלבד.</p></div>
      <div className="field"><label className="l" htmlFor="password">סיסמה</label><input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'רגע…' : 'להיכנס'}</button>
    </form>
  );
}

export function PayoutForm({ fundId }: { fundId: string }) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(addPayout.bind(null, fundId), undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="stack card" noValidate>
      <h3 style={{ fontSize: 15 }}>לרשום תשלום לספק</h3>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="payee">ספק / למי שולם</label><input id="payee" name="payee" type="text" required maxLength={120} placeholder="חברה קדישא, קייטרינג, מצבות…" /></div>
        <div className="field"><label className="l" htmlFor="amount">סכום בש״ח</label><input id="amount" name="amount" type="text" inputMode="decimal" required /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="purpose">עבור</label><input id="purpose" name="purpose" type="text" maxLength={200} placeholder="הלוויה / שבעה / מצבה" /></div>
        <div className="field"><label className="l" htmlFor="paid_on">תאריך</label><input id="paid_on" name="paid_on" type="date" defaultValue={today} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="note">הערה פנימית</label><input id="note" name="note" type="text" maxLength={300} /></div>
      <label className="fd-check"><input type="checkbox" name="visible" defaultChecked />להציג למשפחה (בעמוד הניהול שלהם)</label>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'רושמים…' : 'לרשום תשלום'}</button>
    </form>
  );
}
