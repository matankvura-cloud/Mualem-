export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center justify-between gap-2 text-xs" aria-label="שלבים">
      {steps.map((s, i) => {
        const n = i + 1; const state = n < current ? "done" : n === current ? "now" : "todo";
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1" aria-current={state === "now" ? "step" : undefined}>
            <span className={`grid h-7 w-7 place-items-center rounded-full border text-[13px] font-medium ${state === "now" ? "border-navy bg-navy text-cream" : state === "done" ? "border-gold bg-gold-soft text-gold-ink" : "border-line bg-white text-muted"}`}>{state === "done" ? "✓" : n}</span>
            <span className={state === "todo" ? "text-muted" : "text-ink"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
