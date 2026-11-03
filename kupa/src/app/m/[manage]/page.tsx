import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from './_shared';
import { payoutsOf, requestsOf, depositsOf, tasksDone, documentsOf, activeSuppliers } from '@/lib/funds';
import { formsOf, helpRequestsOf, HELP_KINDS } from '@/lib/family';
import { FORM_STATUS } from '@/data/forms';
import { GUIDES } from '@/data/guides';
import { GENERAL, planByKey } from '@/data/now';
import { ils, fmtDate, initials, memOf } from '@/lib/format';
import { CONTACT_PHONE, COORDINATOR_NAME, PRODUCT, PRODUCT_TAGLINE } from '@/lib/site';
import { cardState } from '@/lib/card';
import FamilyShell from '@/components/FamilyShell';
import FamilyCard from '@/components/FamilyCard';
import GuideTile from '@/components/GuideTile';
import { IcPhone, IcChat, IcSteps, IcPeople, IcSign, IcMeal, IcBag, IcCoins, IcCheck, IcQr, IcGift, IcBook, IcDoc, IcShop, IcHeadset, IcChairs, IcStone, IcHouse } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הבית שלי', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ welcome?: string }> };

const SERVICES = [
  { cat: 'ארוחות', sub: 'בישול, קייטרינג, משלוחים', Icon: IcMeal, tone: 'candle' },
  { cat: 'ציוד לשבעה', sub: 'כיסאות, שולחנות, הצללה', Icon: IcChairs, tone: 'paper' },
  { cat: 'מצבות', sub: 'ייעוץ, תכנון וביצוע', Icon: IcStone, tone: 'stone' },
  { cat: 'עזרה בבית', sub: 'ניקיון, סידור, כביסה', Icon: IcHouse, tone: 'dawn' },
] as const;

export default async function FamilyHome({ params, searchParams }: Props) {
  const { manage } = await params;
  const { welcome } = await searchParams;
  const { fund, tot, publicLink, family, last4 } = await loadFamily(manage);
  const [pays, reqs, deps, done, docs, sups, forms, helps] = await Promise.all([payoutsOf(fund.id), requestsOf(fund.id), depositsOf(fund.id), tasksDone(fund.id), documentsOf(fund.id), activeSuppliers(), formsOf(fund.id), helpRequestsOf(fund.id)]);
  const plan = planByKey(fund.situation);
  const allTasks = [...GENERAL.tasks, ...(plan ? plan.tasks : [])];
  const nextTasks = allTasks.filter((t) => !done.has(t.key)).slice(0, 3);
  const doneN = allTasks.filter((t) => done.has(t.key)).length;
  const base = `/m/${manage}`;
  const active = cardState(fund) === 'active';
  const pending = reqs.filter((r) => r.status === 'pending');
  const lastPay = pays.filter((p) => p.visible)[0];
  const donors = deps.filter((d) => d.status === 'paid');
  const openHelp = helps.filter((h) => h.status !== 'done');
  const coord = fund.coordinator_name || COORDINATOR_NAME;
  const phone = fund.coordinator_phone || CONTACT_PHONE;
  const wa = phone ? `https://wa.me/972${phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום, ${family} מבקשת שיחה עם הליווי.`)}` : '';
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. אפשר להפקיד לקופה של המשפחה: ${publicLink}`);
  const bySupCat = (cat: string) => sups.filter((s) => s.category === cat).length;

  return (
    <FamilyShell manage={manage} active="home">
      {welcome ? <div className="notice notice-ok" style={{ marginBottom: 14 }}><b>ברוכים הבאים ל{PRODUCT}.</b> הקישור לשיתוף עם הקרובים נמצא ב"עזרה מהקרובים". את הקישור לעמוד הזה שומרים לעצמכם.</div> : null}
      <header className="fam-head">
        <div><h1>אנחנו כאן בשבילכם</h1><p>{PRODUCT_TAGLINE}: מידע, זכויות, שירותים וליווי אישי ל{family} בתקופה זו.</p></div>
        {phone ? <a className="btn-outline" href={wa || `tel:${phone}`} target={wa ? '_blank' : undefined} rel="noopener" style={{ width: 'auto' }}><IcPhone />בקשת שיחה</a> : null}
      </header>

      {/* נייד: כמו אפליקציה. כרטיס, שתי פעולות, ארבעה אריחים. */}
      <section className="m-only app-home">
        <Link href={`${base}/card`} className="card-link"><FamilyCard familyName={family} last4={last4} status={active ? 'פעיל' : 'לא פעיל'} /></Link>
        <Link className="btn-copper" href={`${base}/card#qr`}><IcQr />הצגת הכרטיס</Link>
        <Link className="btn-outline" href={`${base}/suppliers`}><IcGift />ההטבות שלי</Link>
        <nav className="tiles tiles-2" aria-label="האזורים">
          <Link href={`${base}/guides`}><IcBook />מדריכים וזכויות</Link>
          <Link href={`${base}/file`}><IcDoc />מסמכים וחתימות</Link>
          <Link href={`${base}/help`}><IcPeople />עזרה מהקרובים</Link>
          <Link href={`${base}/suppliers`}><IcShop />שירותים והטבות</Link>
        </nav>
      </section>

      <section className="fam-grid fam-grid-home">
        <Link href={`${base}/card`} className="card-link d-only"><FamilyCard familyName={family} last4={last4} status={active ? 'פעיל' : 'לא פעיל'} /></Link>
        <div className="panel coord">
          <h2><IcHeadset />הרכזת האישית שלכם</h2>
          <div className="coord-row"><span className="face">{initials(coord)}</span><div><b>{coord}</b><small className="muted">מלווה את משפחתכם</small></div></div>
          {phone ? <a className="btn-copper" href={wa || `tel:${phone}`} target={wa ? '_blank' : undefined} rel="noopener"><IcPhone />בקשת שיחה</a> : <Link className="btn-copper" href={`${base}/support`}>לפנות לליווי</Link>}
        </div>
        <div className="panel">
          <h2><IcSteps />הצעד הבא שלכם <small className="muted">{doneN} מתוך {allTasks.length}</small></h2>
          <div className="fd-bar" aria-hidden="true"><i style={{ width: `${allTasks.length ? Math.round((doneN / allTasks.length) * 100) : 0}%` }} /></div>
          {nextTasks.length ? <ul className="checks">{nextTasks.map((t) => <li key={t.key}><i /> {t.text}</li>)}</ul> : <p className="muted">כל הצעדים סומנו. כל הכבוד.</p>}
          <Link className="more" href={`${base}/now`}>{plan ? 'לכל הצעדים ›' : 'לבחור את המצב ולקבל רשימה מותאמת ›'}</Link>
        </div>
      </section>

      <section className="fam-grid">
        <div className="panel">
          <h2><IcPeople />עזרה מהקרובים</h2>
          <div className="asks">
            <Link href={`${base}/help?ask=meals#ask`}><IcMeal />ארוחות</Link>
            <Link href={`${base}/help?ask=errands#ask`}><IcBag />סידורים</Link>
            <Link href={`${base}/help?ask=expenses#ask`}><IcCoins />שיתוף בהוצאות</Link>
          </div>
          {openHelp.length ? <ul className="mini-list">{openHelp.slice(0, 2).map((h) => <li key={h.id}><b>{HELP_KINDS[h.kind]?.label || h.kind}</b> · {h.text.slice(0, 50)}{h.status === 'taken' ? <span className="pill pill-ok">{h.helper_name || 'נלקח'}</span> : null}</li>)}</ul>
            : donors.length ? <p className="muted" style={{ marginTop: 8 }}>כבר {donors.length} קרובים השתתפו בסיוע למשפחה.</p> : <p className="muted" style={{ marginTop: 8 }}>בקשה קצרה, וקרוב שרוצה לעזור לוקח אותה.</p>}
          <span className="linkbox" style={{ marginTop: 10 }}>{publicLink}</span>
          <div className="fd-actions" style={{ marginTop: 8 }}>
            <Link className="btn-outline" href={`${base}/help#ask`}>שליחת בקשה לעזרה</Link>
            <a className="btn-ghost" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener">לשתף את הקופה</a>
          </div>
        </div>
        <div className="panel">
          <h2><IcSign />מסמכים וחתימות</h2>
          <ul className="forms-list">
            {forms.map((f) => <li key={f.def.key}><IcDoc /><span>{f.def.name}</span><span className={`pill ${FORM_STATUS[f.status][1]}`}>{f.status === 'signed' ? <IcCheck /> : null}{FORM_STATUS[f.status][0]}</span></li>)}
            <li><IcDoc /><span>מסמך נוסף</span><span className="pill pill-muted">{docs.length ? `${docs.length} בתיק` : 'להעלאה'}</span></li>
          </ul>
          <Link className="btn-copper" href={`${base}/file#upload`} style={{ marginTop: 10 }}>העלאת מסמך חדש</Link>
        </div>
        <div className="panel">
          <h2><IcCoins />הכרטיס והקופה</h2>
          <div className="bal-row"><span className="lbl">היתרה הזמינה</span><b className="amt">{ils(tot.available)}</b></div>
          {pending.length ? <p className="muted">{pending.length} בקשות תשלום ממתינות לאישור.</p> : lastPay ? <p className="muted">תשלום אחרון: {lastPay.payee} · {ils(lastPay.amount)} · {fmtDate(lastPay.paid_on)}</p> : <p className="muted">עדיין לא שולם מהקופה. כשתבקשו תשלום לספק, הוא יופיע כאן.</p>}
          <div className="fd-actions" style={{ marginTop: 10 }}>
            <Link className="btn-copper" href={`${base}/card`}>לכרטיס ולתשלומים</Link>
            <Link className="btn-ghost" href={`/f/${fund.token}/give`}>הוספת כסף</Link>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcBook />מדריכים למשפחה</h2>
        <div className="guide-grid">{GUIDES.map((g) => <GuideTile key={g.key} guide={g} href={`${base}/guides/${g.key}`} />)}</div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcShop />שירותים והטבות <small className="muted">{sups.length ? `${sups.length} ספקים משתתפים` : 'ספקים מצטרפים בימים אלה'}</small></h2>
        <div className="guide-grid">{SERVICES.map((s) => (
          <Link key={s.cat} href={`${base}/suppliers?cat=${encodeURIComponent(s.cat)}`} className={`gtile tone-${s.tone}`}><span className="gicon"><s.Icon /></span><b>{s.cat}</b><small>{s.sub}{bySupCat(s.cat) ? ` · ${bySupCat(s.cat)} ספקים` : ''}</small></Link>
        ))}</div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcChat />לשאול את העוזר</h2>
        <form className="chat-strip" action={`${base}/assistant`} method="get">
          <input id="home-q" name="q" type="text" placeholder="שאלו כל דבר: מה עושים היום, כמה נשאר, איך מזמינים…" maxLength={500} />
          <button className="btn-copper" type="submit" style={{ width: 'auto' }}>לשאול</button>
        </form>
      </section>
    </FamilyShell>
  );
}
