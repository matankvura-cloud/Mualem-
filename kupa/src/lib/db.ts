// שכבת מסד הנתונים. פרודקשן: Postgres לפי DATABASE_URL (Supabase, Neon או כל Postgres)
// דרך postgres.js. פיתוח/בדיקות בלי מסד: KUPA_LOCAL_DB=memory מריץ Postgres בזיכרון
// (pglite) עם אותה סכמה, כך שה-SQL זהה בשני המקרים.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Row = Record<string, unknown>;
export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

const g = globalThis as unknown as { __kupaDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__kupaDb) g.__kupaDb = open();
  return g.__kupaDb;
}

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (url) {
    const { default: postgres } = await import('postgres');
    const local = /localhost|127\.0\.0\.1/.test(url);
    // pooler במצב transaction (Supabase 6543) לא תומך ב-prepared statements; max קטן כי כל פונקציה היא תהליך משלה.
    const sql = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 15, ssl: local ? undefined : 'require', types: { bigint: postgres.BigInt } });
    return { query: async (text, params = []) => (await sql.unsafe(text, params as never[])) as unknown as never };
  }
  if (process.env.KUPA_LOCAL_DB) {
    const { PGlite } = await import('@electric-sql/pglite');
    const pg = process.env.KUPA_LOCAL_DB === 'memory' ? new PGlite() : new PGlite(process.env.KUPA_LOCAL_DB);
    await pg.waitReady;
    const schema = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf8');
    await pg.exec(schema);
    const local: Db = { query: async (text, params = []) => (await pg.query(text, params as never[])).rows as never };
    if (process.env.KUPA_DEMO_SEED === '1') {
      const { seedDemo } = await import('./demo-seed');
      await seedDemo(local).catch((e) => console.error('demo seed', e));
    }
    return local;
  }
  throw new Error('חסר DATABASE_URL (או KUPA_LOCAL_DB=memory לפיתוח)');
}

/** שאילתה שמחזירה שורה אחת או null. */
export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await (await db()).query<T>(text, params);
  return rows[0] ?? null;
}
export async function many<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(text, params);
}
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
