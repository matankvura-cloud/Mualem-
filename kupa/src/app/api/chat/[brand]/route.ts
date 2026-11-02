// עוזר האתרים: GET מחזיר הגדרות לווידג'ט, POST מזרים שיחה (NDJSON).
// נקרא מהאתרים עצמם (CORS לפי רשימת מקורות), ולכן ההגבלות כאן לפי כתובת IP.
import { aiEnabled, type ChatTurn } from '@/lib/assistant';
import { BRANDS, allowSite, siteChatStream, type BrandKey } from '@/lib/site-assistant';
import { ipHash } from '@/lib/tokens';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cors(req: Request, brandKey: BrandKey | null): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = brandKey ? BRANDS[brandKey].origins : [];
  const ok = allowed.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.avlut.org.il');
  return {
    'access-control-allow-origin': ok ? origin : allowed[0] || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
    'cache-control': 'no-store',
  };
}
const brandOf = (k: string): BrandKey | null => (k in BRANDS ? (k as BrandKey) : null);
const json = (b: unknown, status: number, h: Record<string, string>) => new Response(JSON.stringify(b), { status, headers: { ...h, 'content-type': 'application/json; charset=utf-8' } });

export async function OPTIONS(req: Request, ctx: { params: Promise<{ brand: string }> }) {
  const { brand } = await ctx.params;
  return new Response(null, { status: 204, headers: cors(req, brandOf(brand)) });
}

export async function GET(req: Request, ctx: { params: Promise<{ brand: string }> }) {
  const { brand } = await ctx.params;
  const key = brandOf(brand);
  const h = cors(req, key);
  if (!key) return json({ error: 'unknown brand' }, 404, h);
  const b = BRANDS[key];
  const lang = new URL(req.url).searchParams.get('lang') || 'he';
  return json({ name: b.name, nameEn: b.nameEn, phone: b.phoneDisplay, tel: b.phoneE164, whatsapp: `https://wa.me/${b.whatsapp}`, langs: b.langs, quick: b.quick[lang] || b.quick.he, enabled: aiEnabled() }, 200, h);
}

export async function POST(req: Request, ctx: { params: Promise<{ brand: string }> }) {
  const { brand } = await ctx.params;
  const key = brandOf(brand);
  const h = cors(req, key);
  if (!key) return json({ error: 'unknown brand' }, 404, h);
  const b = BRANDS[key];
  if (!aiEnabled()) return json({ error: `העוזר עדיין לא הופעל. אפשר לדבר איתנו: ${b.phoneDisplay}.` }, 503, h);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  if (!allowSite(`${key}:${ipHash(ip)}`, 30) || !allowSite(key, 600)) return json({ error: 'יותר מדי הודעות. נסו שוב מאוחר יותר, או התקשרו.' }, 429, h);

  const body = (await req.json().catch(() => ({}))) as { messages?: unknown; lang?: unknown };
  const lang = typeof body.lang === 'string' && b.langs.includes(body.lang) ? body.lang : 'he';
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatTurn[] = raw
    .filter((m): m is { role: string; content: string } => !!m && typeof m === 'object' && typeof (m as { content?: unknown }).content === 'string')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content.trim().slice(0, 1500) }))
    .filter((m) => m.content).slice(-12);
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'אין הודעה' }, 400, h);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const ev of siteChatStream(b, lang, history)) controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...h, 'content-type': 'application/x-ndjson; charset=utf-8', 'x-accel-buffering': 'no' } });
}
