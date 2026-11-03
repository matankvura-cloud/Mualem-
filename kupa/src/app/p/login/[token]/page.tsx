// דף קישור הכניסה של ספק. GET רק מציג; הכניסה עצמה היא לחיצה (POST), כדי שתצוגות
// מקדימות של וואטסאפ ודומיו לא יצרכו את הקישור החד-פעמי.
import type { Metadata } from 'next';
import Link from 'next/link';
import { TOKEN_RE } from '@/lib/tokens';
import { peekSupplierLogin } from '@/lib/supplier-auth';
import { FAMILY_BRAND as BRAND, CONTACT_PHONE } from '@/lib/site';
import { enterWithToken } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כניסה לפורטל הספקים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ token: string }> };

export default async function SupplierLoginPage({ params }: Props) {
  const { token } = await params;
  const peek = TOKEN_RE.test(token) ? await peekSupplierLogin(token) : { state: 'missing' as const };
  return (
    <div className="fd"><div className="fd-pay" style={{ paddingTop: 40 }}>
      <div><h1>כניסה לפורטל הספקים</h1><p className="lead">{BRAND} · ספקים משתתפים</p></div>
      {peek.state === 'ok' ? (<>
        <div className="fd-note"><b>{peek.name}</b>, הקישור הזה מכניס את הטלפון הזה לפורטל ל-90 יום. לוחצים פעם אחת.</div>
        <form action={enterWithToken.bind(null, token)}><button className="btn" type="submit">להיכנס לפורטל</button></form>
        <p className="fd-small">אם פתחתם את הקישור במחשב, עדיף לפתוח אותו בטלפון: ממנו סורקים את הכרטיס של המשפחה.</p>
      </>) : (
        <div className="notice notice-warn">
          {peek.state === 'used' ? <><b>הקישור כבר שימש לכניסה.</b> אם זה לא היה אתם, או שנכנסתם במכשיר אחר, בקשו קישור חדש.</>
            : peek.state === 'expired' ? <><b>תוקף הקישור פג.</b> בקשו קישור חדש.</>
            : <><b>הקישור לא תקין.</b> בדקו שהועתק במלואו, או בקשו קישור חדש.</>}
          {CONTACT_PHONE ? <> לקישור חדש: <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>.</> : null}
        </div>
      )}
      <Link className="btn-outline" href="/p">לפורטל</Link>
    </div></div>
  );
}
