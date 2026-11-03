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

const { default: postgres } = await import('postgres');
const local = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, { prepare: false, max: 1, ssl: local ? undefined : 'require', connect_timeout: 20 });
const schema = readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8');
try {
  await sql.unsafe(schema);
  console.log('migrate: הסכמה הוחלה.');
} finally {
  await sql.end({ timeout: 5 });
}
