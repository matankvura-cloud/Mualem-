'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ils } from '@/lib/format';

type Action = { payee: string; amount: number; purpose: string };
type Msg = { role: 'user' | 'assistant'; content: string; actions?: Action[]; error?: string };

export default function Chat({ manage, enabled, quick, initialQ, brand }: { manage: string; enabled: boolean; quick: string[]; initialQ?: string; brand: string }) {
  const key = `kupa-chat-${manage}`;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => { try { const s = sessionStorage.getItem(key); if (s) setMsgs(JSON.parse(s)); } catch { /* אין אחסון */ } }, [key]);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(msgs.slice(-30))); } catch { /* אין אחסון */ } endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, key]);
  useEffect(() => { if (initialQ && enabled && !sentInitial.current) { sentInitial.current = true; void send(initialQ); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ, enabled]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy || !enabled) return;
    setInput('');
    const history: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      const r = await fetch(`/api/m/${encodeURIComponent(manage)}/chat`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        setMsgs([...history, { role: 'assistant', content: '', error: j?.error || 'העוזר לא זמין כרגע.' }]);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', text = '', actions: Action[] = [], error = '';
      const flush = () => setMsgs([...history, { role: 'assistant', content: text, actions, error: error || undefined }]);
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.t === 'text') text += ev.v;
            else if (ev.t === 'action') actions = [...actions, ev.v];
            else if (ev.t === 'error') error = ev.v;
          } catch { /* שורה חלקית */ }
        }
        flush();
      }
      flush();
    } catch {
      setMsgs([...history, { role: 'assistant', content: '', error: 'החיבור נפל. נסו שוב.' }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="chat">
      <div className="chat-log" role="log" aria-live="polite">
        {!msgs.length ? (
          <div className="chat-hello">
            <p><b>שלום, אני העוזר של {brand}.</b> אני מכיר את הקופה, את האירועים ואת הספקים, ואפשר לשאול אותי כל דבר. על זכויות, מחירים והלכה אני מפנה לאדם.</p>
            <div className="chat-quick">{quick.map((q) => <button type="button" key={q} onClick={() => send(q)} disabled={!enabled || busy}>{q}</button>)}</div>
          </div>
        ) : null}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content ? <p>{m.content}</p> : m.role === 'assistant' && !m.error ? <p className="muted">חושב…</p> : null}
            {m.error ? <p className="fd-err">{m.error}</p> : null}
            {m.actions?.length ? (
              <div className="chat-actions">{m.actions.map((a, k) => (
                <Link key={k} className="btn-copper" href={`/m/${manage}/card?payee=${encodeURIComponent(a.payee)}&amount=${a.amount}&purpose=${encodeURIComponent(a.purpose)}`}>
                  לבקש תשלום: {a.payee} · {ils(a.amount)}
                </Link>))}</div>
            ) : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input id="chat-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={enabled ? 'כתבו כאן…' : 'העוזר עדיין לא הופעל'} disabled={!enabled || busy} maxLength={2000} autoComplete="off" />
        <button className="btn-copper" type="submit" disabled={!enabled || busy || !input.trim()} style={{ width: 'auto' }}>{busy ? '…' : 'לשלוח'}</button>
      </form>
      {msgs.length ? <button type="button" className="chat-clear" onClick={() => setMsgs([])}>להתחיל שיחה חדשה</button> : null}
    </div>
  );
}
