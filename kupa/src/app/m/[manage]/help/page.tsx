import type { Metadata } from 'next';
import { loadFamily } from '../_shared';
import { depositsOf } from '@/lib/funds';
import { ils, fmtDateTime, memOf } from '@/lib/format';
import { SLOGAN } from '@/lib/site';
import FamilyShell from '@/components/FamilyShell';
import CopyButton from '@/components/CopyButton';
import { IcPeople, IcPlus } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'עזרה מהקרובים', robots: { index: false, follow: false } };
type Props = { params: Promise<{ manage: string }> };

export default async function HelpPage({ params }: Props) {
  const { manage } = await params;
  const { fund, tot, publicLink, manageLink } = await loadFamily(manage);
  const deps = await depositsOf(fund.id);
  const paid = deps.filter((d) => d.status === 'paid');
  const shareText = encodeURIComponent(`${memOf(fund.gender)} ${fund.display_name}. ${SLOGAN}, אפשר להפקיד לקופה של המשפחה: ${publicLink}`);
  return (
    <FamilyShell manage={manage} active="help">
      <header className="fam-head"><div><h1>עזרה מהקרובים</h1><p>{tot.donors ? `${tot.donors} קרובים השתתפו עד עכשיו, ${ils(tot.raised)} בסך הכול.` : 'שלחו את הקישור לכל מי שרוצה לעזור. במקום פרחים.'}</p></div></header>
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
