'use client';
import { useState } from 'react';

export default function CopyButton({ text, label = 'העתק קישור', className = 'btn-ghost' }: { text: string; label?: string; className?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setMsg('הועתק'); } catch { setMsg('לא הצלחנו להעתיק'); }
      setTimeout(() => setMsg(null), 2000);
    }}>{msg ?? label}</button>
  );
}
