// העוזר של המשפחה: שיחה עם Claude שמכירה את הקופה, האירועים, היתרה והספקים.
// כלל ברזל: הוא לא ממציא זכויות, מחירים או הלכה; מה שלא בטוח, הוא מפנה לליווי האישי.
// פעולה אחת בלבד: להציע בקשת תשלום לספק. ההצעה הופכת לכפתור, והמשפחה מאשרת.
import Anthropic from '@anthropic-ai/sdk';
import type { Fund, Totals, PayoutRequest, Payout } from './funds';
import { SUPPLIERS } from '@/data/suppliers';
import { eventTitle, familyName, memOf, ils } from './format';
import { BRAND, FAMILY_BRAND, CONTACT_PHONE, SLOGAN } from './site';

export const AI_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type Suggestion = { payee: string; amount: number; purpose: string };
export type ChatEvent = { t: 'text'; v: string } | { t: 'action'; v: Suggestion } | { t: 'error'; v: string } | { t: 'done' };

export const QUICK_QUESTIONS = [
  'מה אני צריכה לעשות היום?',
  'כמה נשאר בקופה ומה כבר שולם?',
  'איך מזמינים אוכל לשבעה מהקופה?',
  'מה כותבים בהודעה לקרובים?',
];

/* ---------- הקשר ---------- */
export type FamilyContext = {
  fund: Fund; tot: Totals; requests: PayoutRequest[]; payouts: Payout[];
};

function contextText({ fund, tot, requests, payouts }: FamilyContext): string {
  const today = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', year: 'numeric' });
  const events = fund.events.map((e) => `- ${eventTitle(e)}: ${[e.date, e.time, e.place, e.address, e.note].filter(Boolean).join(' · ') || 'פרטים חסרים'}`).join('\n') || '- עדיין לא הוזנו אירועים';
  const open = requests.filter((r) => r.status === 'pending').map((r) => `- ${r.payee}: ${ils(r.amount)}${r.purpose ? ` עבור ${r.purpose}` : ''} (ממתין לאישור${r.source === 'supplier' ? ', הספק ביקש' : ''})`).join('\n') || '- אין';
  const paid = payouts.filter((p) => p.visible).slice(0, 8).map((p) => `- ${p.payee}: ${ils(p.amount)}${p.purpose ? ` עבור ${p.purpose}` : ''}`).join('\n') || '- עדיין לא שולם מהקופה';
  const sups = SUPPLIERS.map((s) => `- ${s.name} (${s.category}): ${s.description}${s.example ? ' [הסדר לדוגמה, טרם נחתם]' : ` [${s.benefit}]`}`).join('\n');
  return `היום: ${today}
המשפחה: ${familyName(fund.display_name)}. ${memOf(fund.gender)} ${fund.display_name}${fund.years ? ` (${fund.years})` : ''}${fund.city ? `, ${fund.city}` : ''}.
מנהל/ת הקופה: ${fund.manager_name || 'לא צוין'}.
מצב הקופה: ${fund.status === 'closed' ? 'סגורה להפקדות' : 'פתוחה להפקדות'}.
אירועים:
${events}
כסף: נאסף ${ils(tot.raised)} מ-${tot.donors} קרובים. שולם לספקים ${ils(tot.paid_out)}. בבקשות שממתינות ${ils(tot.requested)}. יתרה זמינה לבקשות חדשות: ${ils(tot.available)}.
בקשות תשלום פתוחות:
${open}
תשלומים שכבר בוצעו:
${paid}
ספקים שמקבלים את כרטיס המשפחה:
${sups}
ליווי אישי (אדם): ${CONTACT_PHONE ? `טלפון ${CONTACT_PHONE}` : 'דרך מסך "ליווי אישי"'}.`;
}

const SYSTEM = `את/ה העוזר/ת של ${FAMILY_BRAND} בצד המשפחה של "${BRAND} · ${SLOGAN}": קופה דיגיטלית לזכר הנפטר שהקרובים מפקידים אליה במקום פרחים, וכרטיס משפחה שמשלם ממנה לספקים (הלוויה, שבעה, מצבה).
מי שמדבר איתך הוא בן או בת משפחה בימים שאחרי פטירה. דברו בעברית חמה, פשוטה וקצרה. בלי סיסמאות, בלי רשימות ארוכות, בלי להציף. משפט או שניים, ואז השאלה הבאה.

מה מותר ומה אסור:
- הסתמכו רק על ההקשר שמצורף (האירועים, הכסף, הספקים). אל תמציאו סכומים, מועדים או ספקים.
- אל תקבעו זכויות, מענקים, מחירים של גופים ציבוריים או הלכה. על אלה אמרו שזה נבדק מול הליווי האישי, ותנו את דרך ההתקשרות.
- אל תאמרו שביצעתם פעולה. אתם לא משלמים ולא מזמינים. אתם מציעים, והמשפחה מאשרת.
- כשהמשפחה רוצה לשלם לספק מהקופה, קראו לכלי suggest_payment_request עם ספק, סכום ומטרה, פעם אחת, אחרי שהסכום ברור. אם היתרה לא מספיקה, אמרו זאת ואל תקראו לכלי. הכלי יוצר כפתור שהמשפחה לוחצת עליו.
- אל תחשפו קישורים סודיים ואל תבקשו פרטים אישיים מעבר למה שצריך.
- אם מישהו במצוקה קשה, עצרו את כל השאר, היו איתו, והפנו לאדם: הליווי האישי, ובמצב חירום 101 או ער"ן 1201.`;

const TOOL = {
  name: 'suggest_payment_request',
  description: 'מציע למשפחה לשלוח בקשת תשלום לספק מהקופה. ההצעה מוצגת ככפתור והמשפחה מאשרת. לקרוא רק כשהספק, הסכום והמטרה ברורים ויש יתרה מספיקה.',
  input_schema: {
    type: 'object' as const,
    properties: {
      payee: { type: 'string', description: 'שם הספק או למי משלמים' },
      amount: { type: 'number', description: 'הסכום בשקלים' },
      purpose: { type: 'string', description: 'עבור מה, במילים ספורות' },
    },
    required: ['payee', 'amount', 'purpose'],
    additionalProperties: false,
  },
  strict: true,
};

/* ---------- הגנה פשוטה מהצפה: 40 הודעות לשעה לקופה ---------- */
const bucket = new Map<string, { n: number; reset: number }>();
export function allow(fundId: string, limit = 40): boolean {
  const now = Date.now();
  const b = bucket.get(fundId);
  if (!b || b.reset < now) { bucket.set(fundId, { n: 1, reset: now + 3600e3 }); return true; }
  if (b.n >= limit) return false;
  b.n += 1; return true;
}

/* ---------- השיחה ---------- */
export async function* chatStream(ctx: FamilyContext, history: ChatTurn[]): AsyncGenerator<ChatEvent> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  let stream;
  try {
    stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: contextText(ctx) },
      ],
      tools: [TOOL],
      messages,
    });
    let toolJson = '';
    let inTool = false;
    for await (const event of stream) {
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') { inTool = true; toolJson = ''; }
      else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') yield { t: 'text', v: event.delta.text };
        else if (event.delta.type === 'input_json_delta' && inTool) toolJson += event.delta.partial_json;
      } else if (event.type === 'content_block_stop' && inTool) {
        inTool = false;
        try {
          const s = JSON.parse(toolJson || '{}') as Partial<Suggestion>;
          const amount = Math.round(Number(s.amount) * 100) / 100;
          if (typeof s.payee === 'string' && s.payee.trim() && amount > 0 && amount <= ctx.tot.available) {
            yield { t: 'action', v: { payee: s.payee.trim().slice(0, 120), amount, purpose: String(s.purpose || '').slice(0, 200) } };
          }
        } catch { /* קלט לא תקין מהמודל: מתעלמים */ }
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') yield { t: 'text', v: 'על זה אני לא יכול לעזור כאן. הליווי האישי ישמח לדבר.' };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) yield { t: 'error', v: 'העוזר עמוס כרגע. נסו שוב בעוד דקה.' };
    else if (e instanceof Anthropic.AuthenticationError) yield { t: 'error', v: 'העוזר לא מוגדר נכון (מפתח API).' };
    else if (e instanceof Anthropic.APIError) yield { t: 'error', v: `העוזר לא זמין כרגע (${e.status}).` };
    else yield { t: 'error', v: 'העוזר לא זמין כרגע.' };
    console.error('assistant', e);
  }
  yield { t: 'done' };
}
