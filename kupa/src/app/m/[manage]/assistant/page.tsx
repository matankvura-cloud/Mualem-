import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from '../_shared';
import { aiEnabled, QUICK_QUESTIONS } from '@/lib/assistant';
import { FAMILY_BRAND, CONTACT_PHONE } from '@/lib/site';
import FamilyShell from '@/components/FamilyShell';
import Chat from './Chat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'העוזר', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ q?: string }> };

export default async function AssistantPage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { q } = await searchParams;
  await loadFamily(manage);
  const enabled = aiEnabled();
  return (
    <FamilyShell manage={manage} active="assistant">
      <header className="fam-head">
        <div><h1>העוזר של {FAMILY_BRAND}</h1><p>שאלו בחופשיות. הוא מכיר את הקופה שלכם, ולדברים שדורשים אדם הוא מפנה לליווי האישי{CONTACT_PHONE ? ` (${CONTACT_PHONE})` : ''}.</p></div>
        <Link className="btn-outline" href={`/m/${manage}/support`} style={{ width: 'auto' }}>לדבר עם אדם</Link>
      </header>
      {!enabled ? <div className="notice notice-warn" style={{ marginBottom: 12 }}>העוזר עדיין לא הופעל בסביבה הזו (חסר מפתח ANTHROPIC_API_KEY). הליווי האישי זמין כרגיל.</div> : null}
      <Chat manage={manage} enabled={enabled} quick={QUICK_QUESTIONS} initialQ={q?.slice(0, 500)} brand={FAMILY_BRAND} />
      <p className="fd-small" style={{ marginTop: 10 }}>השיחה נשמרת רק בדפדפן שלכם. העוזר לא משלם ולא מזמין בעצמו: כל פעולה עוברת דרככם ודרך הצוות.</p>
    </FamilyShell>
  );
}
