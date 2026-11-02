// העוזר של אתרי המותג (אבלות ישראל, תל"מ, מארגנים): שיחה עם Claude שמכירה את
// האתר, את השירותים ואת השאלות הנפוצות, ומפנה לעמודים ולאדם. אותו מנוע כמו
// העוזר של המשפחה, בלי כלים ובלי הקשר אישי. בסיס הידע: src/data/brand-kb.json.
import Anthropic from '@anthropic-ai/sdk';
import kb from '@/data/brand-kb.json';
import { AI_MODEL, type ChatEvent, type ChatTurn } from './assistant';

export type BrandKey = 'avlut' | 'tlm' | 'meargenim';
type Page = { t: string; u: string };
type Faq = { q: string; a: string };

export type Brand = {
  key: BrandKey; name: string; nameEn: string; site: string; phoneDisplay: string; phoneE164: string; whatsapp: string;
  what: string; langs: string[]; origins: string[]; quick: Record<string, string[]>;
};

export const BRANDS: Record<BrandKey, Brand> = {
  avlut: {
    key: 'avlut', name: 'אבלות ישראל', nameEn: 'Avelut Israel', site: 'https://www.avlut.org.il',
    phoneDisplay: '077-604-9884', phoneE164: '+972776049884', whatsapp: '972535877774',
    what: 'שירות פרטי של ליווי, תיאום וסיוע למשפחות לאחר פטירה בישראל, לצד שירותי הקבורה הציבוריים: פינוי ושינוע נפטרים, תיאום הלוויה, ארגון שבעה, אזכרות, מצבות, הטסת נפטרים מחו"ל ולחו"ל, מיצוי זכויות וליווי בירוקרטי. זמינות 24/7. אבלות ישראל אינה חברה קדישא ואינה גוף ממשלתי.',
    langs: ['he', 'en', 'fr', 'ru'],
    origins: ['https://www.avlut.org.il', 'https://avlut.org.il', 'https://avlut-preview.vercel.app', 'https://avlut-launch.vercel.app'],
    quick: {
      he: ['מה עושים כשאדם נפטר בבית?', 'מה מגיע למשפחה ללא תשלום?', 'איך מתאמים לוויה?', 'מה עושים במקרה פטירה בחו״ל?'],
      en: ['What do we do first after a death at home?', 'What is covered at no cost in Israel?', 'How is a funeral arranged?', 'Death abroad: what now?'],
    },
  },
  tlm: {
    key: 'tlm', name: 'תל״מ', nameEn: 'TLM International Repatriation', site: 'https://tlm-repatriation.com',
    phoneDisplay: '077-777-3445', phoneE164: '+972777773445', whatsapp: '972777773445',
    what: 'תיאום הטסת נפטרים בינלאומית: העברת נפטרים לישראל, מישראל לחו"ל ובין מדינות זרות. תל"מ מנהלת את התיק כולו: הספק המקומי במדינת הפטירה, המסמכים והאישורים הקונסולריים, הכנת הנפטר והארון, הטיסה, המכס וקליטה ביעד. עובדים מול בתי לוויות, חברות ביטוח וחברות סיוע. אין להמציא רגולציה: כל דרישה תלויה במדינות ובחברת התעופה ונבדקת פרטנית.',
    langs: ['he', 'en', 'fr', 'es', 'de'],
    origins: ['https://tlm-repatriation.com', 'https://www.tlm-repatriation.com'],
    quick: {
      he: ['כמה עולה הטסת נפטר לישראל?', 'כמה זמן לוקח התהליך?', 'אילו מסמכים נדרשים?', 'האם ביטוח נסיעות מכסה את זה?'],
      en: ['How much does repatriation to Israel cost?', 'How long does it take?', 'Which documents are required?', 'Does travel insurance cover it?'],
    },
  },
  meargenim: {
    key: 'meargenim', name: 'מארגנים', nameEn: 'Margenim', site: 'https://meargenim.avlut.org.il',
    phoneDisplay: '053-587-7774', phoneE164: '+972535877774', whatsapp: '972535877774',
    what: 'ארגון השבעה והאזכרה בכתובת אחת: ציוד לשבעה (אוהל, כיסאות, שולחנות, תאורה, קירור וחימום), כיבוד וקייטרינג לשבעה, סעודת הבראה, מארזי ניחומים, ציוד תפילה, ארגון לוויה ואזכרה, מוצרי הנצחה. "אתם עם המשפחה, אנחנו מארגנים את כל השאר." אין לנקוב במחירים או בכמויות קבועות שלא מופיעות באתר, ואין להבטיח שעות פעילות או אזורי שירות: על אלה מפנים לשיחה.',
    langs: ['he'],
    origins: ['https://meargenim.avlut.org.il', 'https://margenim.vercel.app'],
    quick: { he: ['מה כולל ציוד לשבעה?', 'איך מזמינים כיבוד לשבעה?', 'מה ההבדל בין החבילות?', 'אפשר להזמין רק אוהל וכיסאות?'] },
  },
};

const LANG_NAMES: Record<string, string> = { he: 'עברית', en: 'English', fr: 'français', ru: 'русский', es: 'español', de: 'Deutsch' };

function knowledge(b: Brand, lang: string): string {
  const k = (kb as Record<string, { pages: Page[]; faq: Faq[]; faq_en?: Faq[]; footer?: string }>)[b.key];
  const faq = lang === 'en' && k.faq_en ? k.faq_en : k.faq;
  return [
    `עמודים באתר (לקישור):`,
    ...k.pages.map((p) => `- ${p.t}: ${p.u}`),
    ``,
    `שאלות ותשובות מאושרות (לצטט מהן, לא להרחיב מעבר):`,
    ...faq.map((f) => `ש: ${f.q}\nת: ${f.a}`),
  ].join('\n');
}

export function systemFor(b: Brand, lang: string): string {
  const l = LANG_NAMES[lang] || LANG_NAMES.he;
  return `את/ה העוזר/ת באתר של ${b.name} (${b.nameEn}).
מה ${b.name} עושה: ${b.what}
טלפון: ${b.phoneDisplay}. וואטסאפ: https://wa.me/${b.whatsapp}. אתר: ${b.site}.

מי שמדבר איתך הוא לרוב בן משפחה בימים שאחרי פטירה, לפעמים איש מקצוע. ענו ב${l} (השפה של העמוד), אלא אם פונים אליכם בשפה אחרת. חם, פשוט, קצר: משפט או שניים ואז שאלה אחת, או קישור לעמוד המתאים. בלי רשימות ארוכות, בלי סיסמאות שיווקיות.

כללים:
- הסתמכו על הידע שמצורף. מה שלא כתוב שם, אמרו שצריך לבדוק עם הצוות ותנו את הטלפון או הוואטסאפ.
- אל תקבעו זכויות, מענקים, מחירים, לוחות זמנים מחייבים, רגולציה או הלכה שלא מופיעים בידע. גם כשהשאלה לוחצת.
- אל תבטיחו זמינות, אזור שירות, הנחה או התחייבות. הצעת מחיר ואישור ניתנים רק על ידי אדם.
- כשמתאים, קשרו לעמוד מהרשימה בכתובת המלאה. לא להמציא כתובות.
- אל תבקשו פרטים אישיים מעבר למה שדרוש, ואל תשמרו דבר. אם רוצים שיחזרו אליהם, הפנו לטלפון או לוואטסאפ.
- במצוקה נפשית: עצרו הכול, היו עם האדם, והפנו לאדם: הטלפון שלנו, ובמצב חירום 101 או ער"ן 1201.
- אתם לא מבצעים פעולות (הזמנה, תשלום, פתיחת תיק). אתם מסבירים ומפנים.`;
}

/* ---------- הגנה מהצפה: לכל כתובת 30 הודעות לשעה, לכל מותג 600 ---------- */
const buckets = new Map<string, { n: number; reset: number }>();
export function allowSite(key: string, limit: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + 3600e3 }); return true; }
  if (b.n >= limit) return false;
  b.n += 1; return true;
}

export async function* siteChatStream(b: Brand, lang: string, history: ChatTurn[]): AsyncGenerator<ChatEvent> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  try {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: systemFor(b, lang) },
        { type: 'text', text: knowledge(b, lang), cache_control: { type: 'ephemeral' } },
      ],
      messages,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield { t: 'text', v: event.delta.text };
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') yield { t: 'text', v: `על זה אני לא יכול לעזור כאן. אפשר לדבר איתנו: ${b.phoneDisplay}.` };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) yield { t: 'error', v: 'העוזר עמוס כרגע. נסו שוב בעוד דקה.' };
    else if (e instanceof Anthropic.APIError) yield { t: 'error', v: `העוזר לא זמין כרגע (${e.status}).` };
    else yield { t: 'error', v: 'העוזר לא זמין כרגע.' };
    console.error('site assistant', b.key, e);
  }
  yield { t: 'done' };
}
