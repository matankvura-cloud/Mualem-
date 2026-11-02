import Link from 'next/link';
import type { Metadata } from 'next';
import NewFundForm from './NewFundForm';
import Footer from '@/components/Footer';
import { BRAND } from '@/lib/site';

export const metadata: Metadata = { title: 'פתיחת קופה', robots: { index: false } };

export default function NewFundPage() {
  return (
    <div className="fd">
      <div style={{ padding: '8px 10px' }}><Link className="fd-back" href="/">&rsaquo; {BRAND}</Link></div>
      <NewFundForm />
      <Footer />
    </div>
  );
}
