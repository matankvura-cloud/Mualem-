// שיחה עם העוזר. מקבל את היסטוריית השיחה מהדפדפן (לא נשמרת אצלנו), מוסיף את
// ההקשר של המשפחה, ומזרים תשובה כ-NDJSON: שורה לכל טקסט/פעולה.
import { fundByManage, totals, requestsOf, payoutsOf, tasksDone, documentsOf, activeSuppliers, liveBenefits, redemptionsOf } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { aiEnabled, allow, chatStream, type ChatTurn } from '@/lib/assistant';

export const runtime = 'nodejs';
export const maxDuration = 60;

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function POST(req: Request, ctx: { params: Promise<{ manage: string }> }) {
  const { manage } = await ctx.params;
  if (!TOKEN_RE.test(manage)) return json({ error: 'קישור לא תקין' }, 400);
  const fund = await fundByManage(manage);
  if (!fund) return json({ error: 'הקופה לא נמצאה' }, 404);
  if (!aiEnabled()) return json({ error: 'העוזר עדיין לא הופעל. הליווי האישי זמין בינתיים.' }, 503);
  if (!allow(fund.id)) return json({ error: 'יותר מדי הודעות בשעה האחרונה. נסו שוב מאוחר יותר.' }, 429);

  const body = (await req.json().catch(() => ({}))) as { messages?: unknown };
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatTurn[] = raw
    .filter((m): m is { role: string; content: string } => !!m && typeof m === 'object' && typeof (m as { content?: unknown }).content === 'string')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content.trim().slice(0, 2000) }))
    .filter((m) => m.content)
    .slice(-16);
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'אין הודעה' }, 400);

  const [tot, requests, payouts, done, docs, suppliers, benefits, redemptions] = await Promise.all([totals(fund.id), requestsOf(fund.id), payoutsOf(fund.id), tasksDone(fund.id), documentsOf(fund.id), activeSuppliers(), liveBenefits(), redemptionsOf(fund.id)]);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const ev of chatStream({ fund, tot, requests, payouts, done, docs, suppliers, benefits, redemptions }, history)) {
        controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}
