import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { loadFamily } from '../_shared';
import { payoutsOf, requestsOf } from '@/lib/funds';
import { ils, fmtDate } from '@/lib/format';
import FamilyShell from '@/components/FamilyShell';
import FamilyCard from '@/components/FamilyCard';
import CopyButton from '@/components/CopyButton';
import { RequestPayoutForm } from '../ManageForms';
import { cancelRequest } from '../actions';
import { IcCoins, IcList, IcCard } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כרטיס ותשלומים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }>; searchParams: Promise<{ payee?: string; amount?: string; purpose?: string }> };
const REQ: Record<string, [string, string]> = { pending: ['ממתין לאישור', 'pill-warn'], paid: ['שולם', 'pill-ok'], rejected: ['לא אושר', 'pill-err'] };

export default async function CardPage({ params, searchParams }: Props) {
  const { manage } = await params;
  const { payee, amount, purpose } = await searchParams;
  const { fund, tot, family, last4, cardLink } = await loadFamily(manage);
  const [pays, reqs] = await Promise.all([payoutsOf(fund.id), requestsOf(fund.id)]);
  const visiblePays = pays.filter((p) => p.visible);
  const qr = await QRCode.toDataURL(cardLink, { margin: 1, width: 300, color: { dark: '#16304D', light: '#FFFFFF' } });

  return (
    <FamilyShell manage={manage} active="card">
      <header className="fam-head"><div><h1>כרטיס ותשלומים</h1><p>הכרטיס משלם לספקים ישירות מהקופה. אתם מבקשים, אנחנו מאשרים ומשלמים.</p></div></header>

      <section className="fam-grid fam-grid-card">
        <FamilyCard familyName={family} last4={last4} />
        <div className="stats" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
          <div className="stat"><small>נאסף</small><b>{ils(tot.raised)}</b></div>
          <div className="stat"><small>שולם מהקופה</small><b>{ils(tot.paid_out)}</b></div>
          <div className="stat"><small>יתרה זמינה</small><b>{ils(tot.available)}</b>{tot.requested ? <small>{ils(tot.requested)} בבקשות שממתינות</small> : null}</div>
        </div>
        <div className="panel">
          <h2><IcCard />הכרטיס אצל הספק</h2>
          <div className="qr"><img src={qr} alt="QR של כרטיס המשפחה" width={150} height={150} />
            <p>הספק סורק את הקוד, רואה את היתרה הזמינה ושולח בקשת חיוב. אתם רואים אותה כאן, ואנחנו מאשרים ומשלמים לו. הכסף לא יוצא בלי אישור.</p></div>
          <div className="fd-actions"><CopyButton text={cardLink} label="העתק קישור לספק" className="btn-outline" /></div>
        </div>
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
