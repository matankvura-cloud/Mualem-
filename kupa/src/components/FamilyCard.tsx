import { IcNfc, IcLeaf } from './icons';

/** כרטיס המשפחה, ויזואלי. mini: גרסה נמוכה לכותרות. */
export default function FamilyCard({ familyName, last4, mini = false }: { familyName: string; last4: string; mini?: boolean }) {
  return (
    <div className={`fcard${mini ? ' fcard-mini' : ''}`} aria-label={`כרטיס המשפחה של ${familyName}`}>
      <span className="leaf"><IcLeaf /></span>
      <div className="top"><b>כרטיס המשפחה</b></div>
      <div className="chip"><i aria-hidden /><IcNfc /></div>
      <div><div className="name">{familyName}</div><div className="num">•••• {last4}</div></div>
    </div>
  );
}
