// שכבת הגישה למסד. כל שאילתה רצה בטרנזקציה עם תפקיד מפורש (anon / authenticated / service_role)
// ועם request.jwt.claims — בדיוק כמו ב-Supabase, כך ש-RLS נאכף זהה בשני הסביבות.
import postgres from "postgres";

const g = globalThis as unknown as { __matanaSql?: postgres.Sql };
function getSql(): postgres.Sql {
  if (g.__matanaSql) return g.__matanaSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  g.__matanaSql = postgres(url, { max: 8, prepare: false, idle_timeout: 20, onnotice: () => {} });
  return g.__matanaSql;
}
/** לקוח גולמי. לשימוש בסקריפטים/בדיקות בלבד; בקוד האפליקציה משתמשים ב-asAnon/asUser/asService. */
export const sql = new Proxy({} as postgres.Sql, { get: (_t, k) => (getSql() as unknown as Record<PropertyKey, unknown>)[k] });

export type Tx = postgres.TransactionSql;

async function withRole<T>(role: "anon" | "authenticated" | "service_role", claims: Record<string, string>, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getSql().begin(async (tx) => {
    await tx.unsafe(`set local role ${role}`);
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** גישה ציבורית (ללא משתמש) */
export const asAnon = <T>(fn: (tx: Tx) => Promise<T>) => withRole("anon", { role: "anon" }, fn);
/** גישה בשם משתמש מחובר; RLS נאכף לפי auth.uid() */
export const asUser = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withRole("authenticated", { sub: userId, role: "authenticated" }, fn);
/** גישה פנימית של שכבת השרת (אימות, הודעות). לא לשימוש מתוך דפי משתמש. */
export const asService = <T>(fn: (tx: Tx) => Promise<T>) => withRole("service_role", { role: "service_role" }, fn);

/** מחלץ קוד שגיאה פנימי מ-raise exception בפונקציות SQL */
export function dbErrorCode(e: unknown): string | null {
  const msg = (e as { message?: string })?.message ?? "";
  const m = msg.match(/^([a-z_]+)$/) ?? msg.match(/^(?:error: )?([a-z_]{4,})\b/);
  return m ? m[1] : null;
}
