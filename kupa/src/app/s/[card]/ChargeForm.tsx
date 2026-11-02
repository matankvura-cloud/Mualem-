'use client';
import { useActionState } from 'react';
import { requestCharge, type ChargeState } from './actions';

export default function ChargeForm({ card }: { card: string }) {
  const [state, action, pending] = useActionState<ChargeState, FormData>(requestCharge.bind(null, card), undefined);
  const v = state?.values ?? {};
  if (state?.ok) return <div className="notice notice-ok"><b>תודה.</b> {state.ok}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="payee">שם העסק</label><input id="payee" name="payee" type="text" required maxLength={120} defaultValue={v.payee ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="contact">טלפון לתשלום</label><input id="contact" name="contact" type="tel" required maxLength={200} dir="ltr" defaultValue={v.contact ?? ''} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="amount">סכום לחיוב בש״ח</label><input id="amount" name="amount" type="text" inputMode="decimal" required defaultValue={v.amount ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="purpose">עבור</label><input id="purpose" name="purpose" type="text" maxLength={200} placeholder="ארוחות לשבעה, 3 ימים" defaultValue={v.purpose ?? ''} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="note">הערה / מספר חשבונית</label><input id="note" name="note" type="text" maxLength={400} defaultValue={v.note ?? ''} /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn-copper" type="submit" disabled={pending}>{pending ? 'שולחים…' : 'לשלוח בקשת חיוב'}</button>
      <p className="fd-small">הבקשה מגיעה למשפחה ולצוות. התשלום מועבר אחרי אישור, בהעברה או בקישור תשלום.</p>
    </form>
  );
}
