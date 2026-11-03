'use client';
import { useActionState } from 'react';
import { adminLogin, addPayout, approveRequest, rejectRequest, addSupplier, makeSupplierLogin, adminSetCard, type LoginState, type PayoutState, type ReqState, type SupplierState, type CardState2 } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(adminLogin, undefined);
  return (
    <form action={action} className="fd-pay" style={{ paddingTop: 40 }}>
      <div><h1>ניהול</h1><p className="lead">מסך הניהול. סיסמה בלבד.</p></div>
      <div className="field"><label className="l" htmlFor="password">סיסמה</label><input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required /></div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? 'רגע…' : 'להיכנס'}</button>
    </form>
  );
}

export function RequestDecision({ fundId, id, amount }: { fundId: string; id: string; amount: number }) {
  const [a, approve, ap] = useActionState<ReqState, FormData>(approveRequest.bind(null, fundId, id), undefined);
  const [r, reject, rp] = useActionState<ReqState, FormData>(rejectRequest.bind(null, fundId, id), undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <form action={approve} className="stack" style={{ gap: 6 }} noValidate>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor={`amt-${id}`}>סכום ששולם</label><input id={`amt-${id}`} name="amount" type="text" inputMode="decimal" defaultValue={String(amount)} /></div>
          <div className="field"><label className="l" htmlFor={`on-${id}`}>תאריך</label><input id={`on-${id}`} name="paid_on" type="date" defaultValue={today} /></div>
        </div>
        <input name="admin_note" type="text" maxLength={300} placeholder="הערה למשפחה (לא חובה)" />
        {a?.error ? <p className="fd-err">{a.error}</p> : a?.ok ? <p className="notice notice-ok">{a.ok}</p> : null}
        <button className="btn btn-inline" type="submit" disabled={ap}>{ap ? 'רושמים…' : 'שולם, לרשום'}</button>
      </form>
      <form action={reject} className="stack" style={{ gap: 6 }} noValidate>
        <input name="reason" type="text" maxLength={300} placeholder="למה לא אושר (המשפחה תראה)" required />
        {r?.error ? <p className="fd-err">{r.error}</p> : r?.ok ? <p className="notice notice-ok">{r.ok}</p> : null}
        <button className="btn-ghost btn-danger" type="submit" disabled={rp} style={{ width: '100%' }}>{rp ? 'רגע…' : 'לדחות'}</button>
      </form>
    </div>
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

export function SupplierForm() {
  const [state, action, pending] = useActionState<SupplierState, FormData>(addSupplier, undefined);
  return (
    <form action={action} className="stack card" noValidate>
      <h3 style={{ fontSize: 15 }}>להוסיף ספק</h3>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="s-name">שם העסק</label><input id="s-name" name="name" type="text" required maxLength={120} /></div>
        <div className="field"><label className="l" htmlFor="s-cat">קטגוריה</label><input id="s-cat" name="category" type="text" required maxLength={60} placeholder="קייטרינג לשבעה, מצבות, ציוד…" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="s-icon">אייקון</label>
          <select id="s-icon" name="icon" defaultValue="meal"><option value="meal">ארוחות</option><option value="chairs">ציוד</option><option value="stone">מצבות</option><option value="home">בית</option><option value="flowers">פרחים</option><option value="transport">הסעות</option></select></div>
        <div className="field"><label className="l" htmlFor="s-city">עיר / אזור</label><input id="s-city" name="city" type="text" maxLength={80} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="s-phone">טלפון</label><input id="s-phone" name="phone" type="tel" maxLength={30} dir="ltr" /></div>
        <div className="field"><label className="l" htmlFor="s-email">מייל</label><input id="s-email" name="email" type="email" maxLength={160} dir="ltr" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="s-desc">תיאור קצר (מוצג למשפחות)</label><input id="s-desc" name="description" type="text" maxLength={400} /></div>
      <label className="fd-check"><input type="checkbox" name="activate" />להציג למשפחות מיד (ספק פעיל)</label>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
      <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'מוסיפים…' : 'להוסיף ספק'}</button>
    </form>
  );
}

export function LoginLinkButton({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SupplierState, FormData>(makeSupplierLogin.bind(null, supplierId), undefined);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'מנפיקים…' : 'קישור כניסה לספק'}</button>
      {state?.link ? <><span className="linkbox">{state.link}</span><small className="muted">{state.ok} שלחו לספק בוואטסאפ; הוא פותח בטלפון ומחובר ל-90 יום.</small></> : state?.error ? <p className="fd-err">{state.error}</p> : null}
    </form>
  );
}

export function CardControls({ fundId, blocked, validUntil }: { fundId: string; blocked: boolean; validUntil: string }) {
  const [state, action, pending] = useActionState<CardState2, FormData>(adminSetCard.bind(null, fundId), undefined);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <form action={action} className="fd-actions" noValidate>
        <input type="hidden" name="act" value="valid" />
        <div className="field" style={{ flex: 1 }}><label className="l" htmlFor={`vu-${fundId}`}>בתוקף עד</label><input id={`vu-${fundId}`} name="valid_until" type="date" defaultValue={validUntil} /></div>
        <button className="btn-outline" type="submit" disabled={pending} style={{ alignSelf: 'flex-end' }}>לעדכן תוקף</button>
      </form>
      <form action={action} className="fd-actions" noValidate>
        <input type="hidden" name="act" value={blocked ? 'unblock' : 'block'} />
        {!blocked ? <input name="reason" type="text" maxLength={200} placeholder="סיבת החסימה (המשפחה תראה)" style={{ flex: 1 }} /> : null}
        <button className={`btn-ghost ${blocked ? '' : 'btn-danger'}`} type="submit" disabled={pending}>{blocked ? 'לשחרר את החסימה' : 'לחסום את הכרטיס'}</button>
      </form>
      {state?.error ? <p className="fd-err">{state.error}</p> : state?.ok ? <p className="notice notice-ok">{state.ok}</p> : null}
    </div>
  );
}
