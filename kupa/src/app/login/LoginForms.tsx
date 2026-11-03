'use client';
import { useActionState, useState } from 'react';
import { loginFamily, loginSupplier, loginEmployer, type LoginState } from './actions';
import { IcHome, IcShop, IcBriefcase } from '@/components/icons';

const TABS = [
  { key: 'family', label: 'משפחה', Icon: IcHome, action: loginFamily, hint: 'הטלפון שמסרתם בפתיחה, וקוד הכניסה בן 6 הספרות שקיבלתם.' },
  { key: 'supplier', label: 'ספק', Icon: IcShop, action: loginSupplier, hint: 'טלפון העסק, וקוד הספק בן 6 הספרות.' },
  { key: 'employer', label: 'מעסיק', Icon: IcBriefcase, action: loginEmployer, hint: 'טלפון איש הקשר, וקוד הכניסה שקיבלתם ברישום.' },
] as const;

function OneForm({ tab }: { tab: (typeof TABS)[number] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(tab.action, undefined);
  return (
    <form action={action} className="stack" style={{ gap: 10 }} noValidate>
      <p className="muted">{tab.hint}</p>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor={`${tab.key}-phone`}>טלפון</label><input id={`${tab.key}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} defaultValue={state?.values?.phone || ''} placeholder="050-1234567" required /></div>
        <div className="field"><label className="l" htmlFor={`${tab.key}-pin`}>קוד כניסה</label><input id={`${tab.key}-pin`} name="pin" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} pattern="[0-9]{6}" placeholder="6 ספרות" required /></div>
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'נכנסים…' : 'כניסה'}</button>
    </form>
  );
}

export default function LoginForms({ initial = 'family' }: { initial?: string }) {
  const [cur, setCur] = useState(TABS.some((t) => t.key === initial) ? initial : 'family');
  const tab = TABS.find((t) => t.key === cur)!;
  return (
    <div className="panel">
      <div className="sit" role="tablist" aria-label="מי נכנס">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={t.key === cur} className={`sit-opt${t.key === cur ? ' on' : ''}`} onClick={() => setCur(t.key)}><t.Icon />{t.label}</button>)}
      </div>
      <div style={{ marginTop: 12 }}><OneForm key={tab.key} tab={tab} /></div>
    </div>
  );
}
