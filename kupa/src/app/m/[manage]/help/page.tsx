import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { depositsOf } from '@/lib/funds';
import { helpRequestsOf, HELP_KINDS, HELP_STATUS } from '@/lib/family';
import { ils, fmtDateTime, memOf } from '@/lib/format';
import FamilyShell from '@/components/FamilyShell';
import CopyButton from '@/components/CopyButton';
import { IcPeople, IcPlus, IcMeal } from '@/components/icons';
import { HelpRequestForm } from '../FamilyForms';
import { setHelpStatus, deleteHelpRequest } from '../family-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'עזרה מהקרובים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ ask?: string }> };

export default async function HelpPage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { ask } = await searchParams;
  const { fund, tot, publicLink, manageLink } = await loadFamily(manage);
  const [deps, helps] = await Promise.all([depositsOf(fund.id), helpRequestsOf(fund.id)]);
  const paid = deps.filter((d) => d.status === 'paid');
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. אפשר להפקיד לקופה של המשפחה: ${publicLink}`);
  const helpText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. מי שיכול לעזור למשפחה (ארוחות, סידורים, השתתפות), כל הבקשות כאן: ${publicLink}#help`);
  return (
    <FamilyShell manage={manage} active="help">
      <header className="fam-head"><div><h1>עזרה מהקרובים</h1><p>{tot.donors ? `${tot.donors} קרובים השתתפו עד עכשיו, ${ils(tot.raised)} בסך הכול.` : 'בקשה קצרה, וקרוב שרוצה לעזור לוקח אותה. גם ארוחות וסידורים, לא רק כסף.'}</p></div></header>
      <section className="fam-grid2">
        <div className="panel">
          <h2><IcMeal />לבקש עזרה</h2>
          <p className="muted" style={{ marginBottom: 10 }}>הבקשה מתפרסמת בעמוד של הקרובים. מי שלוחץ "אני אעזור" משאיר שם וטלפון, ואתם רואים את זה כאן.</p>
          <HelpRequestForm manage={manage} initialKind={ask} />
          <div className="fd-actions" style={{ marginTop: 10 }}>
            <a className="btn-outline" href={`https://wa.me/?text=${helpText}`} target="_blank" rel="noopener" style={{ width: 'auto' }}>לשלוח את הבקשות לקבוצה</a>
          </div>
        </div>
        <div className="panel">
          <h2>הבקשות שלכם <small className="muted">({helps.length})</small></h2>
          {helps.length ? <ul className="rems">{helps.map((h) => (
            <li key={h.id} className={h.status === 'done' ? 'done' : ''}>
              <div className="task-text"><span><b>{HELP_KINDS[h.kind]?.label || h.kind}</b> · {h.text}</span>
                <small>{h.when_text ? `${h.when_text} · ` : ''}<span className={`pill ${HELP_STATUS[h.status][1]}`}>{HELP_STATUS[h.status][0]}</span>{h.helper_name ? ` ${h.helper_name}${h.helper_phone ? ` · ${h.helper_phone}` : ''}` : ''}</small></div>
              <div className="stack" style={{ gap: 4 }}>
                {h.status !== 'done' ? <form action={setHelpStatus.bind(null, manage, h.id, 'done')}><button className="btn-ghost" type="submit" style={{ minHeight: 30, fontSize: 12 }}>בוצע</button></form>
                  : <form action={setHelpStatus.bind(null, manage, h.id, 'open')}><button className="btn-ghost" type="submit" style={{ minHeight: 30, fontSize: 12 }}>לפתוח שוב</button></form>}
                <form action={deleteHelpRequest.bind(null, manage, h.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 30, fontSize: 12 }}>למחוק</button></form>
              </div>
            </li>))}</ul> : <p className="muted">עדיין אין בקשות. ארוחות לשבעה הן התחלה טובה.</p>}
        </div>
      </section>
      <section className="fam-grid2">
        <div className="panel">
          <h2><IcPeople />הקישור לשיתוף</h2>
          <span className="linkbox">{publicLink}</span>
          <div className="fd-actions">
            <a className="btn-copper" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener"><IcPlus />בקשת השתתפות בוואטסאפ</a>
            <CopyButton text={publicLink} className="btn-outline" />
          </div>
          <h3 style={{ fontSize: 15, marginTop: 16 }}>קישור הניהול (סודי, לא מעבירים)</h3>
          <span className="linkbox">{manageLink}</span>
          {fund.login_pin ? <p className="muted" style={{ marginTop: 6 }}>בלי הקישור: במסך הכניסה מקלידים את הטלפון {fund.manager_phone ? <span dir="ltr">{fund.manager_phone}</span> : 'שמסרתם'} וקוד הכניסה <b dir="ltr" style={{ letterSpacing: '.15em' }}>{fund.login_pin}</b>.</p> : null}
          <div className="fd-actions">
            <CopyButton text={manageLink} label="העתק קישור ניהול" className="btn-outline" />
            <a className="btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`קישור הניהול של הקופה ${memOf(fund.gender)} ${fund.display_name} (לא להעביר הלאה): ${manageLink}`)}`} target="_blank" rel="noopener">לשלוח לעצמי בוואטסאפ</a>
          </div>
        </div>
        <div className="panel">
          <h2>מי השתתף <small className="muted">({paid.length})</small></h2>
          {paid.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>מי</th><th>סכום</th><th>מילה למשפחה</th><th>מתי</th></tr></thead>
              <tbody>{paid.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.donor_name}</b>{d.donor_email ? <><br /><small className="muted" dir="ltr">{d.donor_email}</small></> : null}</td>
                  <td className="num">{ils(d.amount)}{d.hide_amount ? <><br /><small className="muted">לא מוצג בעמוד</small></> : null}</td>
                  <td>{d.message || <span className="muted">—</span>}</td>
                  <td className="num">{fmtDateTime(d.paid_at)}</td>
                </tr>))}</tbody>
            </table></div>
          ) : <p className="muted">עדיין אין הפקדות. מי שיפקיד יופיע כאן עם המילה שכתב.</p>}
          {tot.pending ? <p className="muted" style={{ marginTop: 8 }}>{tot.pending} הפקדות התחילו ולא הושלמו עדיין.</p> : null}
        </div>
      </section>
    </FamilyShell>
  );
}
