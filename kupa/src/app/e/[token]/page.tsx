import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { employerByToken, employerCases, employeesOf, CASE_STATUS, PACKAGES } from '@/lib/family';
import { TOKEN_RE } from '@/lib/tokens';
import { FAMILY_BRAND, PRODUCT, CONTACT_PHONE } from '@/lib/site';
import { siteUrl } from '@/lib/site';
import { fmtDate } from '@/lib/format';
import Footer from '@/components/Footer';
import CopyButton from '@/components/CopyButton';
import { AddCaseForm, ApproveForm, EmployeeForm, ImportForm, CaseForEmployeeForm } from '../EmployerForms';
import { deleteEmployee } from '../actions';
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
  const [cases, site, employees] = await Promise.all([employerCases(emp.id), siteUrl(), employeesOf(emp.id)]);
  const link = `${site}/e/${token}`;
  return (
    <div className="fd fd-wide">
      <div className="topbar"><Link className="brand" href="/">{FAMILY_BRAND}</Link><span className="pill"><IcBriefcase /> פורטל מעסיקים</span></div>
      <div className="pad stack" style={{ gap: 16 }}>
        {isNew ? <div className="notice notice-ok"><b>המשפחה נרשמה.</b> זה העמוד שלכם למעקב. שמרו את הקישור, הוא הכניסה היחידה.</div> : null}
        <div><h1 className="page-title">{emp.company}</h1><p className="lead">איש קשר: {emp.contact_name} · {emp.phone}{CONTACT_PHONE ? ` · הליווי: ${CONTACT_PHONE}` : ''}</p></div>
        <section className="card stack" style={{ gap: 6 }}>
          <small className="muted">הקישור לעמוד הזה (סודי)</small><span className="linkbox">{link}</span>
          {emp.pin ? <p className="muted">או במסך <Link href="/login?as=employer">הכניסה</Link>: הטלפון <span dir="ltr">{emp.phone}</span> וקוד הכניסה <b id="emp-pin" dir="ltr" style={{ letterSpacing: '.15em' }}>{emp.pin}</b>.</p> : null}
          <div className="fd-actions"><CopyButton text={link} className="btn-outline" /><a className="btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`פורטל המעסיקים של ${emp.company} ב${PRODUCT}: ${link}`)}`} target="_blank" rel="noopener">לשלוח לעצמי בוואטסאפ</a></div>
        </section>
        <section className="panel">
          <h2>המשפחות בליווי <small className="muted">({cases.length})</small></h2>
          <ul className="cases">{cases.map((c) => (
            <li key={c.id}>
              <div className="t"><b>{c.employee_name}</b>{c.deceased_name || c.relation ? <small>{` · ${[c.relation, c.deceased_name].filter(Boolean).join(': ')}`}</small> : null}
                <small>{PACKAGES[c.package]?.label || c.package} · נרשם {fmtDate(c.created_at)}{c.family ? ` · מרכז המשפחה פתוח` : ''}</small></div>
              <span className={`pill ${CASE_STATUS[c.status]?.[1] || ''}`}>{CASE_STATUS[c.status]?.[0] || c.status}</span>
              <div className="steps-mini" aria-label="שלבי הליווי">
                {(['new', 'contacted', 'active'] as const).map((s, i) => { const idx = ['new', 'contacted', 'active', 'done'].indexOf(c.status); return <span key={s} className={idx >= i ? 'on' : ''}>{CASE_STATUS[s][0]}</span>; })}
              </div>
              {c.approved_at ? <p className="muted"><IcCheck /> אישור המעסיק נרשם {fmtDate(c.approved_at)}</p> : <ApproveForm token={token} caseId={c.id} company={emp.company} />}
            </li>))}</ul>
        </section>
        <section className="panel" id="employees">
          <h2>העובדים שלנו <small className="muted">({employees.length})</small></h2>
          <p className="muted" style={{ marginBottom: 10 }}>מוסיפים את העובדים פעם אחת. כשקורה משהו, לוחצים על העובד/ת ורושמים את המשפחה לליווי בלי למלא הכול מחדש.</p>
          {employees.length ? <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>שם</th><th>מחלקה</th><th>טלפון</th><th>ליווי</th><th></th></tr></thead>
            <tbody>{employees.map((e) => (
              <tr key={e.id}>
                <td><b>{e.name}</b>{e.email ? <><br /><small className="muted" dir="ltr">{e.email}</small></> : null}</td>
                <td>{e.department || <span className="muted">—</span>}</td>
                <td dir="ltr">{e.phone || ''}</td>
                <td>{e.case_status ? <span className={`pill ${CASE_STATUS[e.case_status]?.[1] || ''}`}>{CASE_STATUS[e.case_status]?.[0] || e.case_status}</span> : <CaseForEmployeeForm token={token} employeeId={e.id} name={e.name} />}</td>
                <td><form action={deleteEmployee.bind(null, token, e.id)}><button className="btn-ghost btn-danger" type="submit" style={{ minHeight: 30, fontSize: 12 }}>להסיר</button></form></td>
              </tr>))}</tbody>
          </table></div> : null}
          <div className="fam-grid2" style={{ marginTop: 12, marginBottom: 0 }}>
            <div><h3 style={{ fontSize: 15, marginBottom: 8 }}>להוסיף עובד/ת</h3><EmployeeForm token={token} /></div>
            <div><ImportForm token={token} /></div>
          </div>
        </section>
        <section className="panel"><h2>לרשום משפחה שלא ברשימה</h2><AddCaseForm token={token} /></section>
      </div>
      <Footer />
    </div>
  );
}
