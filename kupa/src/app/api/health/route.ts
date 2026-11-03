import { NextResponse } from 'next/server';
import { one } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await one<{ n: unknown }>(`SELECT COUNT(*) AS n FROM kupa_funds`);
    return NextResponse.json({ ok: true, funds: Number(r?.n ?? 0), morning: !!(process.env.MORNING_ID && process.env.MORNING_SECRET && process.env.MORNING_HOOK) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'db' }, { status: 500 });
  }
}
