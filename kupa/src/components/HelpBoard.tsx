'use client';
// "איך אפשר לעזור" בעמוד הציבורי: הבקשות הפתוחות של המשפחה, וכפתור "אני אעזור".
import { useActionState, useState } from 'react';
import { takeHelp, type TakeState } from '@/app/f/[token]/help-actions';
import type { HelpRequest } from '@/lib/family';

const LABEL: Record<string, string> = { meals: 'ארוחות', errands: 'סידורים', expenses: 'שיתוף בהוצאות', other: 'עזרה' };

function TakeForm({ token, id }: { token: string; id: string }) {
  const [state, action, pending] = useActionState<TakeState, FormData>(takeHelp.bind(null, token), undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <p className="notice notice-ok" style={{ marginTop: 8 }}>{state.ok}</p>;
  if (!open) return <button className="btn-ghost" type="button" onClick={() => setOpen(true)} style={{ marginTop: 8 }}>אני אעזור</button>;
  return (
    <form action={action} className="stack" style={{ gap: 8, marginTop: 8 }} noValidate>
      <input type="hidden" name="id" value={id} />
      <div className="grid2">
        <input name="name" type="text" placeholder="השם שלך" maxLength={80} autoComplete="name" required />
        <input name="phone" type="tel" placeholder="טלפון" maxLength={30} autoComplete="tel" dir="ltr" required />
      </div>
      {state?.error ? <p className="fd-err" role="alert">{state.error}</p> : null}
      <button className="btn btn-inline" type="submit" disabled={pending}>{pending ? 'רגע…' : 'לוקח/ת את זה'}</button>
    </form>
  );
}

export default function HelpBoard({ token, requests, giveHref }: { token: string; requests: HelpRequest[]; giveHref: string }) {
  return (
    <section className="fd-sec" id="help"><h2>איך אפשר לעזור <small>{requests.filter((r) => r.status === 'open').length} בקשות פתוחות</small></h2>
      <div className="fd-book">
        {requests.map((r) => (
          <div className="fd-msg" key={r.id}>
            <b>{LABEL[r.kind] || 'עזרה'}</b>{r.when_text ? <small> · {r.when_text}</small> : null}
            <p>{r.text}</p>
            {r.status === 'taken' ? <p className="muted" style={{ marginTop: 6 }}>{r.helper_name || 'מישהו'} כבר לוקח/ת את זה. תודה.</p>
              : r.kind === 'expenses' ? <a className="btn-ghost" href={giveHref} style={{ marginTop: 8 }}>להפקיד לקופה</a>
              : <TakeForm token={token} id={r.id} />}
          </div>
        ))}
      </div>
    </section>
  );
}
