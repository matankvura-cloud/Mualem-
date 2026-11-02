'use client';
import { useState } from 'react';
import { ils, round2 } from '@/lib/format';

const PRESETS = [180, 360, 540];
const MIN = 10;

type Props = { token: string; displayName: string; showAmounts: boolean; allowMessages: boolean; feePct: number };

export default function GiveForm({ token, displayName, showAmounts, allowMessages, feePct }: Props) {
  const [amount, setAmount] = useState<number>(PRESETS[1]);
  const [custom, setCustom] = useState('');
  const [coverFee, setCoverFee] = useState(feePct > 0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const fee = coverFee && feePct > 0 ? round2(amount * feePct / 100) : 0;
  const total = round2(amount + fee);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErr('');
    const fd = new FormData(ev.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (name.length < 2) { setErr('כתבו שם, כדי שהמשפחה תדע ממי זה.'); return; }
    if (!(amount >= MIN)) { setErr(`הסכום המינימלי הוא ₪${MIN}.`); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/f/${encodeURIComponent(token)}/deposits`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount, name, message: String(fd.get('message') || ''), email: String(fd.get('email') || '').trim(),
          hideAmount: fd.get('hide') === 'on', coverFee,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.url) throw new Error(j?.error || 'משהו השתבש. נסו שוב.');
      window.location.assign(j.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'משהו השתבש. נסו שוב.');
      setBusy(false);
    }
  }

  return (
    <form className="fd-pay" onSubmit={submit} noValidate>
      <div><h1>במקום פרחים</h1>
        <p className="lead">ההפקדה מגיעה ישירות לקופה של המשפחה. הם יראו את שמך ואת המילה שתכתוב{showAmounts ? ', ואת הסכום רק אם תרצה' : ''}.</p></div>

      <fieldset><legend>סכום</legend>
        <div className="fd-amts" role="group" aria-label="סכום">
          {PRESETS.map((a) => (
            <button type="button" key={a} aria-pressed={!custom && amount === a} onClick={() => { setAmount(a); setCustom(''); }}>{ils(a)}</button>
          ))}
        </div>
        <label className="l" htmlFor="fdAmt" style={{ marginTop: 8 }}>או סכום אחר</label>
        <input id="fdAmt" type="text" inputMode="numeric" placeholder="₪" autoComplete="off" value={custom}
          onChange={(e) => { const v = e.target.value; setCustom(v); const n = Number(v.replace(/[^\d.]/g, '')); if (n > 0) setAmount(Math.min(n, 100000)); }} />
      </fieldset>

      <div className="stack" style={{ gap: 8 }}>
        <label className="l" htmlFor="fdName">שם (יופיע בספר הניחומים)</label>
        <input id="fdName" name="name" type="text" required maxLength={80} autoComplete="name" />
        {allowMessages ? (<>
          <label className="l" htmlFor="fdMsg" style={{ marginTop: 4 }}>מילה למשפחה (לא חובה)</label>
          <textarea id="fdMsg" name="message" maxLength={600} placeholder={`${displayName} היה…`} />
        </>) : null}
        <label className="l" htmlFor="fdMail" style={{ marginTop: 4 }}>מייל לקבלה (לא חובה)</label>
        <input id="fdMail" name="email" type="email" autoComplete="email" dir="ltr" maxLength={160} />
        {showAmounts ? <label className="fd-check" style={{ marginTop: 4 }}><input name="hide" type="checkbox" />להציג את שמי בלי הסכום</label> : null}
        {feePct > 0 ? (
          <label className="fd-check" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={coverFee} onChange={(e) => setCoverFee(e.target.checked)} />
            <span>להוסיף {feePct}% ({ils(fee || round2(amount * feePct / 100))}) לתפעול המערכת, כדי שהקופה תקבל את {ils(amount)} במלואם</span>
          </label>) : null}
      </div>

      <p className="fd-err" role="alert">{err}</p>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'מעבירים לתשלום…' : <>להפקיד <span>{ils(total)}</span></>}</button>
      <p className="fd-small">סליקה מאובטחת באשראי · קבלה במייל</p>
    </form>
  );
}
