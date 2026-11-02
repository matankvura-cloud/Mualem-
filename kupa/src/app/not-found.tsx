import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fd" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22 }}>הקישור לא נמצא</h1>
      <p className="lead">בדקו את הקישור שקיבלתם, או פנו למי ששלח אותו.</p>
      <p style={{ marginTop: 20 }}><Link href="/">לעמוד הראשי</Link></p>
    </div>
  );
}
