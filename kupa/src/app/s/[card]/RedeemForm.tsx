'use client';
import { useActionState, useState } from 'react';
import { redeemBenefit, type RedeemState } from './actions';

type B = { id: string; title: string; label: string; terms: string | null; left: number };
type S = { id: string; name: string; category: string; benefits: B[] };

/** מימוש הטבה בעמוד הסריקה: בוחרים ספק מהרשימה, מקלידים את קוד הספק, בוחרים הטבה. ספק מחובר (עוגייה) מדלג על הקוד. */
export default function RedeemForm({ card, t, suppliers, loggedId }: { card: string; t: string; suppliers: S[]; loggedId: string | null }) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(redeemBenefit.bind(null, card, t), undefined);
  const v = state?.values ?? {};
  const [supId, setSupId] = useState(v.supplier && suppliers.some((s) => s.id === v.supplier) ? v.supplier : loggedId && suppliers.some((s) => s.id === loggedId) ? loggedId : suppliers[0]?.id ?? '');
  const sup = suppliers.find((s) => s.id === supId);
  const needPin = supId !== loggedId;
  const avail = (sup?.benefits ?? []).filter((b) => b.left > 0);
  if (state?.ok) return <div className="notice notice-ok"><b>ההטבה מומשה.</b> {state.ok}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <div className="field"><label className="l" htmlFor="supplier">הספק</label>
        <select id="supplier" name="supplier" value={supId} onChange={(e) => setSupId(e.target.value)}>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
        </select></div>
      {needPin ? <div className="field"><label className="l" htmlFor="pin">קוד הספק (6 ספרות, קיבלתם אותו בהצטרפות)</label><input id="pin" name="pin" type="text" inputMode="numeric" maxLength={6} dir="ltr" autoComplete="one-time-code" /></div> : <input type="hidden" name="pin" value="" />}
      <div className="field"><label className="l" htmlFor="benefit">ההטבה</label>
        <select id="benefit" name="benefit" required defaultValue={v.benefit && sup?.benefits.some((b) => b.id === v.benefit) ? v.benefit : avail[0]?.id ?? ''} key={supId}>
          {(sup?.benefits ?? []).map((b) => <option key={b.id} value={b.id} disabled={b.left <= 0}>{b.label === b.title ? b.title : `${b.title} · ${b.label}`}{b.left <= 0 ? ' · מומש כבר' : ''}</option>)}
        </select></div>
      {sup?.benefits.some((b) => b.terms) ? <p className="fd-small">{sup.benefits.map((b) => b.terms ? `${b.title}: ${b.terms}` : '').filter(Boolean).join(' · ')}</p> : null}
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="order_amount">סכום העסקה (ש״ח)</label><input id="order_amount" name="order_amount" type="text" inputMode="decimal" placeholder="לפני ההנחה" defaultValue={v.order_amount ?? ''} /></div>
        <div className="field"><label className="l" htmlFor="amount_saved">כמה חסכה המשפחה (ש״ח)</label><input id="amount_saved" name="amount_saved" type="text" inputMode="decimal" defaultValue={v.amount_saved ?? ''} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="rnote">הערה / מספר הזמנה</label><input id="rnote" name="note" type="text" maxLength={200} defaultValue={v.note ?? ''} /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending || !avail.length}>{pending ? 'רושמים…' : 'לממש את ההטבה'}</button>
      <p className="fd-small">המימוש נרשם אצל הספק, אצל המשפחה ובניהול. כל הטבה עד המכסה שהוגדרה למשפחה.</p>
    </form>
  );
}
