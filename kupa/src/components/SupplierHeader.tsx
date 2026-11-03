import type { Supplier, Rated } from '@/lib/funds';
import { SUP_ICON } from '@/components/icons';

type IconKey = keyof typeof SUP_ICON;
export const iconOf = (k: string) => SUP_ICON[(k in SUP_ICON ? k : 'meal') as IconKey];

export function Stars({ avg, count }: { avg: unknown; count: unknown }) {
  const n = Number(count) || 0, a = Number(avg) || 0;
  if (!n) return <span className="stars muted">ספק חדש, עדיין בלי דירוגים</span>;
  return <span className="stars" aria-label={`דירוג ${a} מתוך 5, ${n} דירוגים`}><b>{a.toFixed(1)}</b> <i aria-hidden>{'★'.repeat(Math.round(a))}{'☆'.repeat(5 - Math.round(a))}</i> <small className="muted">{`(${n})`}</small></span>;
}

/** לוגו או אייקון של ספק. */
export function SupplierLogo({ s, size = 64 }: { s: Pick<Supplier, 'id' | 'icon' | 'logo_mime' | 'name' | 'updated_at'>; size?: number }) {
  if (s.logo_mime) return <img src={`/suppliers/logo/${s.id}?v=${encodeURIComponent(String(s.updated_at))}`} alt={s.name} width={size} height={size} style={{ borderRadius: 14, objectFit: 'cover' }} />;
  const I = iconOf(s.icon);
  return <span className="img" style={{ width: size, height: size, borderRadius: 14 }}><I /></span>;
}

export function SupplierBadges({ s }: { s: Supplier & Partial<Rated> }) {
  return (
    <div className="badges">
      {s.verified ? <span className="pill pill-ok">✓ מאומת</span> : null}
      {s.founded_year ? <span className="pill pill-muted">{`מאז ${s.founded_year}`}</span> : null}
      {s.kosher && !/לא רלוונטי/.test(s.kosher) ? <span className="pill pill-muted">{`כשרות: ${s.kosher}`}</span> : null}
      {s.delivery ? <span className="pill pill-muted">{s.delivery}</span> : null}
    </div>
  );
}
