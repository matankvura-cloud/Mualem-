import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { payoutsOf, requestsOf, redemptionsOf } from '@/lib/funds';
import { ils, fmtDate } from '@/lib/format';
import { cardState, CARD_STATE_LABEL } from '@/lib/card';
import { CONTACT_PHONE } from '@/lib/site';
import FamilyShell from '@/components/FamilyShell';
import FamilyCard from '@/components/FamilyCard';
import LiveQr from '@/components/LiveQr';
import { RequestPayoutForm } from '../ManageForms';
import { cancelRequest } from '../actions';
import { IcCoins, IcList, IcCard, IcShop } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'הכרטיס שלכם', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ payee?: string; amount?: string; purpose?: string }> };
const REQ: Record<string, [string, string]> = { pending: ['ממתין לאישור', 'pill-warn'], paid: ['שולם', 'pill-ok'], rejected: ['לא אושר', 'pill-err'] };

export default async function CardPage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { payee, amount, purpose } = await searchParams;
  const { fund, tot, family, last4 } = await loadFamily(manage);
  const [pays, reqs, reds] = await Promise.all([payoutsOf(fund.id), requestsOf(fund.id), redemptionsOf(fund.id)]);
  const visiblePays = pays.filter((p) => p.visible);
  const state = cardState(fund);
  const [stateLabel, stateCls] = CARD_STATE_LABEL[state];

  return (
    <FamilyShell manage={manage} active="card">
      <header className="fam-head"><div><h1>הכרטיס שלכם</h1><p>כרטיס החבר של המשפחה: הטבות אצל ספקים משתתפים, ותשלום לספקים ישירות מהקופה.</p></div></header>

      {state === 'blocked' ? <div className="notice notice-err" style={{ marginBottom: 14 }}><b>הכרטיס חסום.</b> {fund.card_block_reason || ''} {CONTACT_PHONE ? <a href={`tel:${CONTACT_PHONE}`}>דברו איתנו</a> : null}</div> : null}
      {state === 'expired' ? <div className="notice notice-warn" style={{ marginBottom: 14 }}><b>תוקף הכרטיס פג</b> ב-{fmtDate(fund.card_valid_until)}. {CONTACT_PHONE ? <a href={`tel:${CONTACT_PHONE}`}>דברו איתנו</a> : 'פנו אלינו'} כדי להאריך.</div> : null}

      <section className="fam-grid fam-grid-card">
        <div className="stack" style={{ gap: 8 }}>
          <FamilyCard familyName={family} last4={last4} />
          <div className="card-meta"><span className={`pill ${stateCls}`}>{stateLabel}</span>{fund.card_valid_until ? <small className="muted">בתוקף עד {fmtDate(fund.card_valid_until)}</small> : null}</div>
        </div>
        <div className="stats" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
          <div className="stat"><small>נאסף</small><b>{ils(tot.raised)}</b></div>
          <div className="stat"><small>שולם מהקופה</small><b>{ils(tot.paid_out)}</b></div>
          <div className="stat"><small>יתרה זמינה</small><b>{ils(tot.available)}</b>{tot.requested ? <small>{ils(tot.requested)} בבקשות שממתינות</small> : null}</div>
        </div>
        <div className="panel">
          <h2><IcCard />להציג אצל הספק</h2>
          {state === 'active' ? (
            <div className="qr"><LiveQr src={`/api/m/${manage}/qr`} size={150} />
              <p>הספק סורק את הקוד מהמסך שלכם. הקוד מתחדש כל דקה, אז צילום מסך לא עובד. הספק רואה את שם המשפחה ואת ההטבה, לא את הקופה שלכם.</p></div>
          ) : <p className="muted">הכרטיס לא פעיל כרגע, ולכן אין קוד להצגה.</p>}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2><IcShop />הטבות שמימשתם</h2>
        {reds.length ? (
          <ul className="pay-list">{reds.map((r) => (
            <li key={r.id}><div className="t"><b>{r.supplier_name}</b><small>{[r.benefit_title, fmtDate(r.created_at)].filter(Boolean).join(' · ')}{r.note ? ` · ${r.note}` : ''}</small></div>{Number(r.amount_saved) ? <span className="a">חסכתם {ils(r.amount_saved)}</span> : null}</li>))}</ul>
        ) : <p className="muted">עדיין לא מימשתם הטבה. ברשימת הספקים תראו מה מגיע לכם עם הכרטיס.</p>}
      </section>

      <section className="fam-grid2">
        <RequestPayoutForm manage={manage} available={tot.available} defaultPayee={payee || ''} defaultAmount={amount || ''} defaultPurpose={purpose || ''} />
        <div className="panel">
          <h2><IcList />בקשות ותשלומים</h2>
          {reqs.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>למי</th><th>סכום</th><th>מצב</th><th></th></tr></thead>
              <tbody>{reqs.map((r) => { const [label, cls] = REQ[r.status] || [r.status, '']; return (
                <tr key={r.id}>
                  <td><b>{r.payee}</b>{r.purpose ? <><br /><small className="muted">{r.purpose}</small></> : null}{r.source === 'supplier' ? <><br /><small className="muted">בקשה מהספק דרך הכרטיס</small></> : null}{r.admin_note ? <><br /><small>{r.admin_note}</small></> : null}</td>
                  <td className="num">{ils(r.amount)}</td>
                  <td><span className={`pill ${cls}`}>{label}</span><br /><small className="muted">{fmtDate(r.updated_at)}</small></td>
                  <td>{r.status === 'pending' ? <form action={cancelRequest.bind(null, manage, r.id)}><button className="btn-ghost" type="submit" style={{ minHeight: 32, fontSize: 12 }}>לבטל</button></form> : null}</td>
                </tr>); })}</tbody>
            </table></div>
          ) : <p className="muted">עדיין אין בקשות.</p>}
          {visiblePays.length ? (<>
            <h2 style={{ marginTop: 16 }}><IcCoins />שולם מהקופה</h2>
            <ul className="pay-list">{visiblePays.map((p) => (
              <li key={p.id}><div className="t"><b>{p.payee}</b><small>{[p.purpose, fmtDate(p.paid_on)].filter(Boolean).join(' · ')}</small></div><span className="a">{ils(p.amount)}</span></li>))}</ul>
          </>) : null}
        </div>
      </section>
    </FamilyShell>
  );
}
