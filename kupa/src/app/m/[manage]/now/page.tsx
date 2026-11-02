import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { tasksDone } from '@/lib/funds';
import { GENERAL, PLANS, planByKey, type Plan } from '@/data/now';
import { CONTACT_PHONE } from '@/lib/site';
import FamilyShell from '@/components/FamilyShell';
import { IcCheck } from '@/components/icons';
import { setSituation, toggleTask } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'מה עושים עכשיו', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

function PlanList({ plan, done, manage }: { plan: Plan; done: Set<string>; manage: string }) {
  const n = plan.tasks.filter((t) => done.has(t.key)).length;
  return (
    <section className="panel">
      <h2>{plan.label} <small className="muted" style={{ fontFamily: 'Heebo, Arial, sans-serif', fontWeight: 400 }}>{n} מתוך {plan.tasks.length}</small></h2>
      <p className="muted" style={{ marginBottom: 10 }}>{plan.title}</p>
      <div className="fd-bar" aria-hidden="true"><i style={{ width: `${Math.round((n / plan.tasks.length) * 100)}%` }} /></div>
      <ul className="checks tasks">
        {plan.tasks.map((t) => { const d = done.has(t.key); return (
          <li key={t.key} className={d ? 'done' : ''}>
            <form action={toggleTask.bind(null, manage, t.key, !d)}><button type="submit" className="task-toggle" aria-pressed={d} aria-label={d ? 'לבטל סימון' : 'לסמן כבוצע'}><i>{d ? <IcCheck /> : null}</i></button></form>
            <div className="task-text"><span>{t.text}</span>{t.hint ? <small>{t.hint}</small> : null}{t.link ? <a href={t.link} target="_blank" rel="noopener">לשירות הרשמי ›</a> : null}</div>
          </li>); })}
      </ul>
      {plan.link ? <a className="more" href={plan.link} target="_blank" rel="noopener">מידע מלא באתר ›</a> : null}
    </section>
  );
}

export default async function NowPage({ params }: Props) {
  const { manage } = await params;
  const { fund } = await loadFamily(manage);
  const done = await tasksDone(fund.id);
  const plan = planByKey(fund.situation);
  const all = [GENERAL, ...(plan ? [plan] : [])];
  const total = all.reduce((a, p) => a + p.tasks.length, 0);
  const n = all.reduce((a, p) => a + p.tasks.filter((t) => done.has(t.key)).length, 0);
  return (
    <FamilyShell manage={manage} active="now">
      <header className="fam-head">
        <div><h1>מה עושים עכשיו</h1><p>צעד אחד בכל פעם. {n} מתוך {total} בוצעו. מה שלא ברור, שואלים את הליווי{CONTACT_PHONE ? ` (${CONTACT_PHONE})` : ''}.</p></div>
      </header>
      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>מה המצב אצלכם?</h2>
        <form action={setSituation.bind(null, manage)} className="sit">
          {PLANS.map((p) => (
            <label key={p.key} className={`sit-opt${fund.situation === p.key ? ' on' : ''}`}>
              <input type="radio" name="situation" value={p.key} defaultChecked={fund.situation === p.key} onChange={undefined} />{p.label}
            </label>))}
          <button className="btn-outline" type="submit" style={{ width: 'auto' }}>לעדכן</button>
        </form>
      </section>
      <div className="fam-grid2">
        <PlanList plan={GENERAL} done={done} manage={manage} />
        {plan ? <PlanList plan={plan} done={done} manage={manage} /> : <div className="panel"><h2>רשימה לפי המצב</h2><p className="muted">בחרו למעלה את המצב שלכם, ותקבלו רשימה מותאמת: בבית, בבית חולים, בחו״ל או שבעה.</p></div>}
      </div>
    </FamilyShell>
  );
}
