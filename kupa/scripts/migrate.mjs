// מריץ את db/schema.sql על מסד הנתונים. אידמפוטנטי.
//   node scripts/migrate.mjs                 דורש DATABASE_URL (או POSTGRES_URL)
//   node scripts/migrate.mjs --if-configured מדלג בשקט אם אין כתובת (ל-build מקומי)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const ifConfigured = process.argv.includes('--if-configured');

if (!url) {
  if (ifConfigured) { console.log('migrate: אין DATABASE_URL, מדלג.'); process.exit(0); }
  console.error('migrate: חסר DATABASE_URL'); process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(url);
const statements = splitSql(readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8'));
for (const s of statements) await sql.query(s);
console.log(`migrate: ${statements.length} פקודות הורצו.`);

/** פיצול לפי ; בסוף שורה, אחרי הסרת הערות. הסכמה לא מכילה פונקציות עם $$. */
export function splitSql(text) {
  return text.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
}
