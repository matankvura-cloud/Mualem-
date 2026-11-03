import Link from 'next/link';
import { CONTACT_PHONE, BRAND } from '@/lib/site';

export default function Footer({ brandLink = true }: { brandLink?: boolean }) {
  return (
    <footer className="fd-foot">
      <span>
        {brandLink ? <Link href="/" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}>{BRAND}</Link> : <b>{BRAND}</b>}
      </span>
      {CONTACT_PHONE ? <a href={`tel:${CONTACT_PHONE}`}>דברו איתנו</a> : <Link href="/new">לפתוח מרכז משפחה</Link>}
    </footer>
  );
}
