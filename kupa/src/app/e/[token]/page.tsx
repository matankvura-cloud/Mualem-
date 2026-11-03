import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { employerByToken, employerCases, CASE_STATUS, PACKAGES } from '@/lib/family';
import { TOKEN_RE } from '@/lib/tokens';
import { FAMILY_BRAND, PRODUCT, CONTACT_PHONE } from '@/lib/site';
import { siteUrl } from '@/lib/site';
import { fmtDate } from '@/lib/format';
import Footer from '@/components/Footer';
import CopyButton from '@/components/CopyButton';
import { AddCaseForm, ApproveForm } from '../EmployerForms';
import { IcBriefcase, IcCheck } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `המשפחות שלנו · ${PRODUCT}`, robots: { index: false, follow: false } };
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> };

export default async function EmployerHome({ params, searchParams }: Props) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  if (!TOKEN_RE.test(token)) notFound();
  const emp = await employerByToken(token);
  if (!emp) notFound();
  const [cases, site] = await Promise.all([employerCases(emp.id), siteUrl()]);
  const link = `${site}/e/${token}`;
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><span className="pill"><IcBriefcase /> פורטל מעסיקים</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        {isNew ? <div className="notice notice-ok"><b>המשפחה נרשמה.</b> זה העמוד שלכם למעקב. שמרו את הקישור, הוא הכניסה היחידה.</div> : null}
        <div><h1 className="page-title">{emp.company}</h1><p className="lead">איש קשר: {emp.contact_name} · {emp.phone}{CONTACT_PHONE ? ` · הליווי: ${CONTACT_PHONE}` : ''}</p></div>
        <section className="card stack" style={{ gap: 6 }}>
          <small className="muted">הקישור לעמוד הזה (סודי)</small><span className="linkbox">{link}</span>
          <div className="fd-actions"><CopyButton text={link} className="btn-outline" /><a className="btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`פורטל המעסיקים של ${emp.company} ב${PRODUCT}: ${link}`)}`} target="_blank" rel="noopener">לשלוח לעצמי בוואטסאפ</a></div>
        </section>
        <section className="panel">
          <h2>המשפחות בליווי <small className="muted">({cases.length})</small></h2>
          <ul className="cases">{cases.map((c) => (
            <li key={c.id}>
              <div className="t"><b>{c.employee_name}</b>{c.deceased_name ? <small> · {c.relation ? `${c.relation}: ` : ''}{c.deceased_name}</small> : null}
                <small>{PACKAGES[c.package]?.label || c.package} · נרשם {fmtDate(c.created_at)}{c.family ? ` · מרכז המשפחה פתוח` : ''}</small></div>
              <span className={`pill ${CASE_STATUS[c.status]?.[1] || ''}`}>{CASE_STATUS[c.status]?.[0] || c.status}</span>
              <div className="steps-mini" aria-label="שלבי הליווי">
                {(['new', 'contacted', 'active'] as const).map((s, i) => { const idx = ['new', 'contacted', 'active', 'done'].indexOf(c.status); return <span key={s} className={idx >= i ? 'on' : ''}>{CASE_STATUS[s][0]}</span>; })}
              </div>
              {c.approved_at ? <p className="muted"><IcCheck /> אישור המעסיק נרשם {fmtDate(c.approved_at)}</p> : <ApproveForm token={token} caseId={c.id} company={emp.company} />}
            </li>))}</ul>
        </section>
        <section className="panel"><h2>לרשום משפחה נוספת</h2><AddCaseForm token={token} /></section>
      </div>
      <Footer />
    </div>
  );
}
