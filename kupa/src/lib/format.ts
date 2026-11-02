/** לזכרו / לזכרה. */
export const memOf = (gender: string | null | undefined) => (gender === 'f' ? 'לזכרה של' : 'לזכרו של');
export const was = (gender: string | null | undefined) => (gender === 'f' ? 'הייתה' : 'היה');
export const ils = (n: unknown) => `₪${Math.round(Number(n) || 0).toLocaleString('he-IL')}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const EVENT_KINDS: Record<string, string> = {
  funeral: 'הלוויה', shiva: 'שבעה', shloshim: 'אזכרת השלושים', azkara: 'אזכרה', other: 'אחר',
};

export type FundEvent = {
  id: string; kind: string; label?: string; date?: string; time?: string;
  place?: string; address?: string; note?: string; maps_url?: string;
};

export function eventDay(e: FundEvent): { day: string; dm: string } {
  if (!e.date) return { day: '', dm: '' };
  const d = new Date(e.date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return { day: '', dm: '' };
  return { day: DAYS[d.getDay()], dm: `${d.getDate()}.${d.getMonth() + 1}` };
}
export const eventTitle = (e: FundEvent) => e.label || EVENT_KINDS[e.kind] || 'אירוע';

export function fmtDate(v: unknown): string {
  if (!v) return '';
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
}
export function fmtDateTime(v: unknown): string {
  if (!v) return '';
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
}
