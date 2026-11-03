import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFamily } from './_shared';
import { payoutsOf, requestsOf, depositsOf, tasksDone, documentsOf } from '@/lib/funds';
import { GENERAL, planByKey } from '@/data/now';
import { ils, fmtDate, initials, memOf } from '@/lib/format';
import { CONTACT_PHONE } from '@/lib/site';
import { SUPPLIERS } from '@/data/suppliers';
import FamilyShell from '@/components/FamilyShell';
import FamilyCard from '@/components/FamilyCard';
import CopyButton from '@/components/CopyButton';
import { IcCoins, IcList, IcPlus, IcPeople, IcHeadset, IcFolder, IcShop, IcCheck, IcUser, IcPhone, IcChat, IcSteps, SUP_ICON } from '@/components/icons';
import { FAMILY_BRAND } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הבית שלי', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function FamilyHome({ params, searchParams }: Props) {
  const { manage } = await params;
  const { welcome } = await searchParams;
  const { fund, tot, publicLink, family, last4 } = await loadFamily(manage);
  const [pays, reqs, deps, done, docs] = await Promise.all([payoutsOf(fund.id), requestsOf(fund.id), depositsOf(fund.id), tasksDone(fund.id), documentsOf(fund.id)]);
  const plan = planByKey(fund.situation);
  const allTasks = [...GENERAL.tasks, ...(plan ? plan.tasks : [])];
  const nextTasks = allTasks.filter((t) => !done.has(t.key)).slice(0, 3);
  const doneN = allTasks.filter((t) => done.has(t.key)).length;
  const base = `/m/${manage}`;
  const recent = [
    ...pays.filter((p) => p.visible).map((p) => ({ id: p.id, who: p.payee, what: p.purpose, amount: Number(p.amount), at: p.paid_on, status: 'שולם' })),
    ...reqs.filter((r) => r.status === 'pending').map((r) => ({ id: r.id, who: r.payee, what: r.purpose, amount: Number(r.amount), at: r.created_at, status: 'ממתין' })),
  ].sort((a, b) => new Date(b.at as string).getTime() - new Date(a.at as string).getTime()).slice(0, 3);
  const donors = deps.filter((d) => d.status === 'paid');
  const hasEvent = (k: string) => fund.events.some((e) => e.kind === k);
  const checks = [
    { label: `מסמכים בתיק: ${docs.length}`, done: docs.length > 0 },
    { label: 'פרטי העמוד (שם, מילים)', done: !!fund.quote },
    { label: 'הלוויה: מתי ואיפה', done: hasEvent('funeral') },
    { label: 'השבעה: כתובת ושעות', done: hasEvent('shiva') },
    { label: 'אזכרת השלושים', done: hasEvent('shloshim') || hasEvent('azkara') },
  ];
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. אפשר להפקיד לקופה של המשפחה: ${publicLink}`);

  return (
    <FamilyShell manage={manage} active="home">
      {welcome ? <div className="notice notice-ok" style={{ marginBottom: 14 }}><b>הקופה נפתחה.</b> הקישור לשיתוף נמצא למטה ב"עזרה מהקרובים". את הקישור לעמוד הזה שומרים לעצמכם.</div> : null}
      <header className="fam-head">
        <div><h1>אנחנו כאן בשבילכם</h1><p>צעד אחד בכל פעם, בקצב שלכם. {memOf(fund.gender)} {fund.display_name}.</p></div>
        {CONTACT_PHONE ? <a className="btn-outline" href={`tel:${CONTACT_PHONE}`} style={{ width: 'auto' }}><IcPhone />בקשת שיחה</a> : null}
      </header>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcSteps />הצעדים הבאים <small className="muted" style={{ fontFamily: 'Heebo, Arial, sans-serif', fontWeight: 400 }}>{doneN} מתוך {allTasks.length} בוצעו</small></h2>
        <div className="fd-bar" aria-hidden="true"><i style={{ width: `${allTasks.length ? Math.round((doneN / allTasks.length) * 100) : 0}%` }} /></div>
        {nextTasks.length ? <ul className="checks">{nextTasks.map((t) => <li key={t.key}><i /> {t.text}</li>)}</ul> : <p className="muted">כל הצעדים סומנו. כל הכבוד.</p>}
        <Link className="more" href={`${base}/now`}>{plan ? 'לכל הצעדים ›' : 'לבחור את המצב ולקבל רשימה מותאמת ›'}</Link>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcChat />העוזר של {FAMILY_BRAND}</h2>
        <form className="chat-strip" action={`${base}/assistant`} method="get">
          <input id="home-q" name="q" type="text" placeholder="שאלו כל דבר: מה עושים היום, כמה נשאר, איך מזמינים…" maxLength={500} />
          <button className="btn-copper" type="submit" style={{ width: 'auto' }}>לשאול</button>
        </form>
      </section>

      <section className="fam-grid">
        <Link href={`${base}/card`} style={{ textDecoration: 'none' }}><FamilyCard familyName={family} last4={last4} /></Link>
        <div className="panel bal">
          <div><span className="lbl"><IcCoins />היתרה הזמינה</span><div className="amt">{ils(tot.available)}</div>
            {tot.requested ? <small className="muted">{ils(tot.requested)} בבקשות שממתינות</small> : null}</div>
          <div className="stack" style={{ gap: 8 }}>
            <Link className="btn-copper" href={`/f/${fund.token}/give`}><IcPlus />הוספת כסף</Link>
            <a className="btn-outline" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener"><IcPeople />בקשת השתתפות</a>
          </div>
        </div>
        <div className="panel">
          <h2><IcList />תשלומים אחרונים</h2>
          {recent.length ? (
            <ul className="pay-list">{recent.map((r) => (
              <li key={r.id}><div className="t"><b>{r.who}</b><small>{[r.what, fmtDate(r.at)].filter(Boolean).join(' · ')} · {r.status}</small></div><span className="a">{ils(r.amount)}</span></li>
            ))}</ul>
          ) : <p className="muted">עדיין לא שולם מהקופה. כשתבקשו תשלום לספק, הוא יופיע כאן.</p>}
          <Link className="more" href={`${base}/card`}>לכל התשלומים ›</Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcShop />הטבות וספקים מומלצים עבורכם</h2>
        <div className="sups">{SUPPLIERS.slice(0, 4).map((s) => { const I = SUP_ICON[s.icon]; return (
          <div className="sup" key={s.id}><div className="img"><I /></div>
            <div className="body"><b>{s.name}</b><span className="benefit">{s.benefit}</span>
              <Link className="btn-copper" href={`${base}/card?payee=${encodeURIComponent(s.name)}`}>תשלום בכרטיס</Link></div></div>); })}
        </div>
        <Link className="more" href={`${base}/suppliers`}>לכל הספקים וההסדרים ›</Link>
      </section>

      <section className="fam-grid">
        <div className="panel">
          <h2><IcHeadset />הליווי האישי שלכם</h2>
          <div className="escort"><div className="face"><IcUser /></div>
            <p>יועץ הליווי שלנו כאן להקשיב, לכוון ולעזור לכם בכל שאלה ובכל שלב.{CONTACT_PHONE ? '' : ' הטלפון יופיע כאן ברגע שיוגדר.'}</p></div>
          {CONTACT_PHONE ? <a className="btn-copper" href={`https://wa.me/972${CONTACT_PHONE.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener" style={{ marginTop: 12 }}><IcPhone />בקשת שיחה</a> : <Link className="btn-outline" href={`${base}/support`} style={{ marginTop: 12 }}>לליווי האישי</Link>}
        </div>
        <div className="panel">
          <h2><IcPeople />עזרה מהקרובים</h2>
          {donors.length ? (<>
            <div className="avatars">{donors.slice(0, 4).map((d) => <span key={d.id}>{initials(d.donor_name)}</span>)}{donors.length > 4 ? <span className="more">+{donors.length - 4}</span> : null}</div>
            <p className="muted" style={{ marginTop: 8 }}>כבר {donors.length} קרובים השתתפו בסיוע למשפחה.</p>
          </>) : <p className="muted">עדיין אף אחד לא השתתף. שלחו את הקישור, וכל מי שיפקיד יופיע כאן.</p>}
          <span className="linkbox" style={{ marginTop: 10 }}>{publicLink}</span>
          <div className="fd-actions" style={{ marginTop: 8 }}>
            <a className="btn-copper" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener"><IcPlus />בקשת השתתפות נוספת</a>
            <CopyButton text={publicLink} className="btn-outline" />
          </div>
        </div>
        <div className="panel">
          <h2><IcFolder />התיק המשפחתי</h2>
          <ul className="checks">{checks.map((c) => <li key={c.label} className={c.done ? 'done' : ''}><i>{c.done ? <IcCheck /> : null}</i>{c.label}</li>)}</ul>
          <Link className="more" href={`${base}/file`}>לניהול התיק המשפחתי ›</Link>
        </div>
      </section>
    </FamilyShell>
  );
}
