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
    // pooler במצב transaction (Supabase 6543) לא תומך ב-prepared statements. בסביבה serverless התהליך מוקפא
    // בין בקשות, וחיבור שנשאר פתוח יכול "למות" בשקט; לכן חיבורים לא פעילים נסגרים מהר, ולכל שאילתה יש
    // timeout: אם היא נתקעת (3 שניות), סוגרים את כל החיבורים, פותחים מחדש ומנסים פעם אחת נוספת.
    const make = () => postgres(url, { prepare: false, max: 4, idle_timeout: 5, max_lifetime: 300, connect_timeout: 10, ssl: local ? undefined : 'require', types: { bigint: postgres.BigInt } });
    let sql = make();
    const QUERY_MS = Math.max(1500, Number(process.env.DB_QUERY_TIMEOUT_MS || 3000));
    const run = (text: string, params: unknown[]) => new Promise<unknown[]>((resolve, reject) => {
      const t = setTimeout(() => reject(Object.assign(new Error('db query timeout'), { code: 'KUPA_DB_TIMEOUT' })), QUERY_MS);
      sql.unsafe(text, params as never[]).then((r) => { clearTimeout(t); resolve(r as unknown as unknown[]); }, (e) => { clearTimeout(t); reject(e); });
    });
    return {
      query: async (text, params = []) => {
        try { return (await run(text, params)) as never; }
        catch (e) {
          const code = (e as { code?: string })?.code;
          if (code !== 'KUPA_DB_TIMEOUT' && code !== 'CONNECTION_CLOSED' && code !== 'CONNECTION_ENDED' && code !== 'CONNECTION_DESTROYED') throw e;
          console.warn('db: חיבור תקוע, פותחים מחדש', code);
          const old = sql; sql = make();
          old.end({ timeout: 0 }).catch(() => {});
          return (await run(text, params)) as never;
        }
      },
    };
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
