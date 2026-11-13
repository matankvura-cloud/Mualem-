"use client";
import { useState } from "react";
export function Dedication({ initial }: { initial: string }) {
  const [v, setV] = useState(initial);
  return (
    <div>
      <label htmlFor="dedication" className="field-label">הקדשה אישית <span className="font-normal text-muted">(לא חובה)</span></label>
      <textarea id="dedication" name="dedication" rows={4} maxLength={250} className="field" value={v} onChange={(e) => setV(e.target.value)} placeholder="חושבים עליכם בימים הקשים האלה. שולחים חיבוק חם." />
      <div className="field-hint text-start tabular">{v.length}/250</div>
    </div>
  );
}
