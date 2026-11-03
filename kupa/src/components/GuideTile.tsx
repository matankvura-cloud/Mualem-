import Link from 'next/link';
import type { Guide } from '@/data/guides';
import { IcSun, IcFlowers, IcCandle, IcDoc } from './icons';

const ICON: Record<string, () => React.JSX.Element> = { 'first-hours': IcSun, funeral: IcFlowers, shiva: IcCandle, rights: IcDoc };

/** אריח מדריך: צבע לפי השלב, אייקון, כותרת ומתי זה רלוונטי. */
export default function GuideTile({ guide, href }: { guide: Guide; href: string }) {
  const I = ICON[guide.key] || IcDoc;
  return (
    <Link href={href} className={`gtile tone-${guide.tone}`}>
      <span className="gicon"><I /></span>
      <b>{guide.title}</b>
      <small>{guide.when}</small>
    </Link>
  );
}
