export const ils = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
export const ilsExact = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2 });
/** אגורות → "₪500" */
export function money(agorot: number | string | null | undefined): string {
  const n = Number(agorot ?? 0) / 100;
  return Number.isInteger(n) ? ils.format(n) : ilsExact.format(n);
}
export function shekelsToAgorot(s: string | number): number {
  const n = typeof s === "number" ? s : Number(String(s).replace(/[^\d.]/g, ""));
  return Math.round(n * 100);
}
export function dateHe(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Asia/Jerusalem" }).format(date);
}
export function normalizePhone(input: string): string | null {
  const d = input.replace(/[^\d+]/g, "");
  if (!d) return null;
  let e = d;
  if (e.startsWith("00")) e = "+" + e.slice(2);
  else if (e.startsWith("0")) e = "+972" + e.slice(1);
  else if (e.startsWith("972")) e = "+" + e;
  else if (!e.startsWith("+")) e = "+972" + e;
  return /^\+[1-9]\d{7,14}$/.test(e) ? e : null;
}
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}
export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  return p.replace(/^\+972/, "0").replace(/(\d{3})\d{4}(\d{3})$/, "$1••••$2");
}
