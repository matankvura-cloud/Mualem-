import { IcNfc, IcLeaf, IcQr, IcCheck } from './icons';

/** כרטיס המשפחה, ויזואלי. mini: גרסה נמוכה לכותרות. status: תג "פעיל" כמו בהמחשה. */
export default function FamilyCard({ familyName, last4, mini = false, status }: { familyName: string; last4: string; mini?: boolean; status?: string }) {
  return (
    <div className={`fcard${mini ? ' fcard-mini' : ''}`} aria-label={`כרטיס המשפחה של ${familyName}`}>
      <span className="leaf"><IcLeaf /></span>
      <div className="top"><b>כרטיס המשפחה</b>{status ? <span className={`fcard-status${status === 'פעיל' ? ' on' : ''}`}>{status === 'פעיל' ? <IcCheck /> : null}{status}</span> : null}</div>
      <div className="chip"><i aria-hidden /><IcNfc /></div>
      <div className="fcard-foot"><div><div className="name">{familyName}</div><div className="num">•••• {last4}</div></div>{status ? <span className="fcard-qr" aria-hidden><IcQr /></span> : null}</div>
    </div>
  );
}
