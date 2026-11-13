// לפני ריצת הבדיקות: ניקוי קודים חד-פעמיים ותיבת ההודעות, כדי שמגבלת הקצב לא תחסום חשבונות בדיקה
import { config } from "dotenv"; config({ path: ".env.local" }); config();
import postgres from "postgres";
export default async function globalSetup() {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql`delete from auth.otp_codes`;
  await sql`delete from dev_outbox`;
  await sql.end();
}
