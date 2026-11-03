'use client';
import { useActionState } from 'react';
import { redeemBenefit, type RedeemState } from './actions';

type B = { id: string; title: string; label: string; terms: string | null; left: number };

export default function RedeemForm({ card, t, benefits }: { card: string; t: string; benefits: B[] }) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(redeemBenefit.bind(null, card, t), undefined);
  if (state?.ok) return <div className="notice notice-ok"><b>ההטבה מומשה.</b> {state.ok}</div>;
  const avail = benefits.filter((b) => b.left > 0);
  return (
    <form action={action} className="stack" noValidate>
      <div className="field"><label className="l" htmlFor="benefit">איזו הטבה</label>
        <select id="benefit" name="benefit" required defaultValue={avail[0]?.id ?? ''}>
          {benefits.map((b) => <option key={b.id} value={b.id} disabled={b.left <= 0}>{b.title} · {b.label}{b.left <= 0 ? ' · מומש כבר' : ''}</option>)}
        </select></div>
      {benefits.some((b) => b.terms) ? <p className="fd-small">{benefits.map((b) => b.terms ? `${b.title}: ${b.terms}` : '').filter(Boolean).join(' · ')}</p> : null}
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="amount_saved">כמה חסכה המשפחה (ש״ח, לא חובה)</label><input id="amount_saved" name="amount_saved" type="text" inputMode="decimal" /></div>
        <div className="field"><label className="l" htmlFor="rnote">הערה / מספר הזמנה</label><input id="rnote" name="note" type="text" maxLength={200} /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending || !avail.length}>{pending ? 'רושמים…' : 'לממש את ההטבה'}</button>
      <p className="fd-small">המימוש נרשם אצלכם, אצל המשפחה ובניהול. אפשר לממש כל הטבה עד המכסה שהגדרתם למשפחה.</p>
    </form>
  );
}
