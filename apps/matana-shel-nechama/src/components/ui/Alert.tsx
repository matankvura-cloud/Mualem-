export function Alert({ kind = "info", children }: { kind?: "info" | "ok" | "warn" | "danger"; children: React.ReactNode }) {
  const cls = { info: "bg-cream-2 border-line text-ink", ok: "bg-ok-soft border-ok/30 text-ok", warn: "bg-warn-soft border-warn/30 text-warn", danger: "bg-danger-soft border-danger/30 text-danger" }[kind];
  return <div role={kind === "danger" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
