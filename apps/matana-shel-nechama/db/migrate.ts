// הרצת מיגרציות: node --import tsx db/migrate.ts [--seed]
// מתחבר כבעל המסד (DATABASE_ADMIN_URL). האפליקציה עצמה משתמשת ב-DATABASE_URL (matana_app).
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_ADMIN_URL;
if (!url) throw new Error("DATABASE_ADMIN_URL is required");
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name as string));
  for (const f of files) {
    if (applied.has(f)) continue;
    const body = readFileSync(join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${f})`;
    });
    console.log("applied", f);
  }
  if (process.argv.includes("--seed")) {
    const seed = readFileSync(join(process.cwd(), "db", "seed", "seed.sql"), "utf8");
    await sql.begin(async (tx) => { await tx.unsafe(seed); });
    console.log("seeded");
  }
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
