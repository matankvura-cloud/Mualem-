// נתוני הדגמה לסביבת ניסיון (KUPA_LOCAL_DB בלי DATABASE_URL). הקישורים קבועים,
// כך שגם אחרי שהמסד בזיכרון מתאפס, הקופה לדוגמה חוזרת באותן כתובות.
import type { Db } from './db';

export const DEMO = {
  token: 'demo-yaakov-levi-2026',
  manage: 'demo-manage-yaakov-levi-2026-kupa',
  card: 'demo-card-yaakov-levi-2026',
};

export async function seedDemo(db: Db) {
  const exists = await db.query(`SELECT 1 FROM funds WHERE token = $1`, [DEMO.token]);
  if (exists.length) return;
  const events = [
    { id: 'ev1', kind: 'funeral', date: '2026-11-03', time: '14:00', place: 'הר המנוחות, גבעת שאול', address: 'חלקה ד׳', maps_url: 'https://maps.google.com/?q=הר+המנוחות' },
    { id: 'ev2', kind: 'shiva', date: '2026-11-03', place: 'רח׳ הפלמ״ח 12, ירושלים', note: '10:00–22:00 · תפילות 06:30, 16:30' },
    { id: 'ev3', kind: 'shloshim', date: '2026-12-02', place: 'הפרטים יישלחו לכל מי שהפקיד' },
  ];
  const f = await db.query<{ id: string }>(
    `INSERT INTO funds (token, manage_token, card_token, display_name, gender, years, city, quote, quote_by, photo_initial, purpose, target_ils,
       surplus_to, events, manager_name, manager_phone, show_amounts, allow_messages, fee_pct)
     VALUES ($1,$2,$3,'יעקב לוי ז״ל','m','1941 – 2026','ירושלים','אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום.','המשפחה','י',
       'הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה ולאזכרת השלושים.',34000,'ייתרם לבית הכנסת ״אוהל יעקב״',$4,'רונית לוי','0501234567',true,true,6)
     RETURNING id`, [DEMO.token, DEMO.manage, DEMO.card, JSON.stringify(events)]);
  const id = f[0].id;
  const deps: [string, string | null, number, boolean][] = [
    ['רותי ואבי שמעוני', 'יעקב היה השכן שכולם היו רוצים. משתתפים בצערכם מכל הלב.', 360, false],
    ['דני כץ, ניו ג׳רזי', 'לא אוכל להגיע, אבל אני איתכם. עם אבא שלכם עבדתי 20 שנה.', 1000, true],
    ['משפחת פרץ', 'יהי זכרו ברוך.', 180, false],
    ['הצוות של יעקב מהמשרד', null, 540, false],
  ];
  for (const [name, msg, amount, hide] of deps) {
    await db.query(
      `INSERT INTO deposits (fund_id, donor_name, message, amount, fee_amount, charged_amount, hide_amount, status, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'paid', now() - interval '1 day')`,
      [id, name, msg, amount, Math.round(amount * 6) / 100, Math.round(amount * 106) / 100, hide]);
  }
  await db.query(`INSERT INTO payouts (fund_id, payee, purpose, amount, note) VALUES ($1,'חברה קדישא ירושלים','הלוויה',1200,'הדגמה')`, [id]);
  await db.query(`INSERT INTO payout_requests (fund_id, payee, purpose, amount, contact) VALUES ($1,'קייטרינג "שולחן ערוך"','ארוחות לשבעה',600,'אבי 052-0000000')`, [id]);
}
