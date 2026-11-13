"use client";
import { useState } from "react";
export function CopyButton({ text, label = "העתקה", className = "btn btn-outline btn-sm" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
      catch { window.prompt("העתיקו את הטקסט:", text); }
    }}>{done ? "הועתק ✓" : label}</button>
  );
}
