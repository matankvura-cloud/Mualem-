"use client";
import { useState } from "react";
import { money } from "@/lib/format";

export function AmountPicker({ presets, initial, initialCustom }: { presets: number[]; initial: number | null; initialCustom: string }) {
  const isPreset = initial !== null && presets.includes(initial);
  const [sel, setSel] = useState<string>(isPreset ? String(initial) : initial ? "custom" : "");
  const [custom, setCustom] = useState(initialCustom);
  return (
    <fieldset>
      <legend className="field-label">סכום המתנה</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {presets.map((p) => (
          <label key={p} className={`choice ${sel === String(p) ? "choice-on" : ""}`}>
            <input type="radio" name="amount" value={p} className="sr-only" checked={sel === String(p)} onChange={() => setSel(String(p))} required />
            <span className="tabular text-lg">{money(p)}</span>
          </label>
        ))}
        <label className={`choice ${sel === "custom" ? "choice-on" : ""}`}>
          <input type="radio" name="amount" value="custom" className="sr-only" checked={sel === "custom"} onChange={() => setSel("custom")} />
          <span>סכום אחר</span>
        </label>
      </div>
      {sel === "custom" && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="custom" className="sr-only">סכום מותאם בשקלים</label>
          <input id="custom" name="custom" inputMode="numeric" className="field max-w-[200px] tabular" dir="ltr" placeholder="למשל 250" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))} required autoFocus />
          <span className="text-muted">₪ (50 עד 5,000)</span>
        </div>
      )}
    </fieldset>
  );
}
