import type { Metadata } from 'next';
import Link from 'next/link';
import { FAMILY_BRAND } from '@/lib/site';
import JoinForm from './JoinForm';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'ספקים: להצטרף לרשת כרטיס המשפחה', description: 'הצטרפו חינם לרשת הספקים של כרטיס המשפחה של אבלות ישראל וקבלו פניות ממשפחות ישירות לוואטסאפ.' };

export default function JoinPage() {
  return (
    <div className="fd">
      <div className="topbar"><Link className="fd-back" href="/suppliers">&rsaquo; מדריך הספקים</Link><Link className="brand" href="/">{FAMILY_BRAND}</Link></div>
      <div className="fd-pay">
        <div><h1>להצטרף לרשת הספקים</h1><p className="lead">משפחות עם כרטיס המשפחה מחפשות ספקים שמקבלים אותו. תופיעו במדריך, פניות יגיעו לוואטסאפ שלכם, ותקבלו עבודה. ההצטרפות חינם; עמלה רק על עבודה שנסגרה.</p></div>
        <ol className="fd-steps"><li className="done"><i>1</i>ממלאים</li><li className="cur"><i>2</i>אנחנו מאשרים</li><li><i>3</i>פניות מגיעות</li></ol>
        <JoinForm />
      </div>
      <Footer />
    </div>
  );
}
