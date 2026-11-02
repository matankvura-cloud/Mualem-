// יוצר דמו סטטי לצפייה: מריץ את האפליקציה עם מסד בזיכרון ושרת-דמה של מורנינג,
// מזין קופה לדוגמה, ושומר את ה-HTML של כל מסך (בלי JS, עם ה-CSS בפנים)
// לתיקייה שמתקבלת כארגומנט. הקישורים בין המסכים מוחלפים לקבצים.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { startMockMorning } from './mock-morning.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tests/snapshot.mjs <out-dir>'); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const PORT = 3102, MOCK = 4546, SITE = `http://localhost:${PORT}`, PUBLIC = 'https://kupa.avlut.org.il';
const BRAND = process.env.NEXT_PUBLIC_BRAND || 'במקום פרחים';

const mock = await startMockMorning(MOCK);
const app = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: { ...process.env, KUPA_LOCAL_DB: 'memory', DATABASE_URL: '', POSTGRES_URL: '',
    MORNING_AUTH_URL: `http://localhost:${MOCK}/idp/v1/oauth/token`, MORNING_API_BASE: `http://localhost:${MOCK}/api/v1`,
    MORNING_ID: 'test-id', MORNING_SECRET: 'test-secret', MORNING_HOOK: 'hook-secret-123', ADMIN_PASSWORD: 'admin-pass',
    NEXT_PUBLIC_SITE_URL: SITE, FEE_PCT: '6', NEXT_PUBLIC_BRAND: BRAND },
  stdio: ['ignore', 'ignore', 'inherit'], detached: true,
});
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${SITE}/api/health`)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 500)); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 860 }, locale: 'he-IL' });
const deposit = async (pub, name, msg, amount, { hide = false, fee = true, ok = true } = {}) => {
  await page.goto(pub + '/give');
  if ([180, 360, 540].includes(amount)) await page.click(`.fd-amts button:has-text("${amount}")`); else await page.fill('#fdAmt', String(amount));
  if (!fee) await page.click('.fd-check:has-text("לתפעול") input');
  await page.fill('#fdName', name); if (msg) await page.fill('#fdMsg', msg);
  if (hide) await page.check('input[name=hide]');
  await page.click('button[type=submit]'); await page.waitForURL(/\/pay\//);
  await page.click(ok ? '#approve' : '#fail'); await page.waitForURL(/\?paid=/);
};
try {
  await page.goto(`${SITE}/new`);
  await page.fill('#display_name', 'יעקב לוי ז״ל'); await page.fill('#years', '1941 – 2026'); await page.fill('#city', 'ירושלים');
  await page.fill('#quote', 'אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום.'); await page.fill('#quote_by', 'המשפחה');
  await page.fill('#funeral_date', '2026-11-03'); await page.fill('#funeral_time', '14:00'); await page.fill('#funeral_place', 'הר המנוחות, גבעת שאול');
  await page.fill('#shiva_place', 'רח׳ הפלמ״ח 12, ירושלים'); await page.fill('#shiva_date', '2026-11-03'); await page.fill('#shiva_note', '10:00–22:00 · תפילות 06:30, 16:30');
  await page.fill('#purpose', 'הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה ולאזכרת השלושים.');
  await page.fill('#target_ils', '34000'); await page.fill('#surplus_to', 'ייתרם לבית הכנסת ״אוהל יעקב״');
  await page.fill('#manager_name', 'רונית לוי'); await page.fill('#manager_phone', '0501234567');
  await page.click('button[type=submit]'); await page.waitForURL(/\/m\//);
  const manage = page.url().replace('?welcome=1', '');
  const pub = (await page.locator('.linkbox').first().textContent()).trim();
  await page.selectOption('#kind', 'shloshim'); await page.fill('#date', '2026-12-02'); await page.fill('#place', 'הפרטים יישלחו לכל מי שהפקיד');
  await page.click('form:has(#kind) button[type=submit]'); await page.waitForSelector('.notice-ok');
  await deposit(pub, 'רותי ואבי שמעוני', 'יעקב היה השכן שכולם היו רוצים. משתתפים בצערכם מכל הלב.', 360);
  await deposit(pub, 'דני כץ, ניו ג׳רזי', 'לא אוכל להגיע, אבל אני איתכם. עם אבא שלכם עבדתי 20 שנה.', 1000, { hide: true, fee: false });
  await deposit(pub, 'משפחת פרץ', 'יהי זכרו ברוך.', 180);
  await deposit(pub, 'הצוות של יעקב ממשרד', '', 540);
  await deposit(pub, 'ניסיון שבוטל', '', 100, { ok: false });
  await page.goto(`${SITE}/admin`); await page.fill('#password', 'admin-pass'); await page.click('button[type=submit]'); await page.waitForSelector('table.tbl');
  await page.click('table.tbl a'); await page.waitForSelector('#payee');
  await page.fill('#payee', 'חברה קדישא ירושלים'); await page.fill('#amount', '1200'); await page.fill('#purpose', 'הלוויה');
  await page.click('form:has(#payee) button[type=submit]'); await page.waitForSelector('.notice-ok');
  const adminFund = page.url();

  const cssDir = ['.next/static/css', '.next/static/chunks'].find((d) => { try { return readdirSync(d).some((f) => f.endsWith('.css')); } catch { return false; } });
  const css = readdirSync(cssDir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${cssDir}/${f}`, 'utf8')).join('\n');
  const t = pub.split('/f/')[1], m = manage.split('/m/')[1], id = adminFund.split('/admin/')[1];
  const screens = [
    ['index', '/', 'נחיתה'], ['new', '/new', 'פתיחת קופה'], ['fund', `/f/${t}`, 'עמוד הקופה'], ['give', `/f/${t}/give`, 'הפקדה'],
    ['paid', `/f/${t}?paid=1`, 'אחרי תשלום'], ['manage', `/m/${m}`, 'ניהול משפחתי'], ['admin', '/admin', 'ניהול (מתן)'], ['admin-fund', `/admin/${id}`, 'קופה בניהול'],
  ];
  const nav = `<nav class="demo-nav" aria-label="מסכי הדמו"><span class="demo-tag">דמו · נתונים מומצאים</span>${screens.map(([f, , l]) => `<a href="${f}.html">${l}</a>`).join('')}</nav>`;
  const extra = `<style>.demo-nav{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));background:#1F2A33;font:600 12.5px Heebo,Arial,sans-serif}.demo-nav a{color:#fff;text-decoration:none;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.12)}.demo-nav a:hover,.demo-nav a:focus-visible{background:rgba(255,255,255,.24);outline:none}.demo-tag{background:#C98A2C;color:#fff;padding:4px 9px;border-radius:999px;letter-spacing:.04em;font-size:11px}.demo-toast{position:fixed;bottom:max(16px,env(safe-area-inset-bottom,0px));inset-inline:16px;margin:0 auto;max-width:420px;background:#1F2A33;color:#fff;padding:12px 16px;border-radius:12px;font:14px Heebo,Arial,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}.fd{border-inline:0}body{padding-left:max(0px,env(safe-area-inset-left,0px));padding-right:max(0px,env(safe-area-inset-right,0px))}</style>`;
  const script = `<script>document.addEventListener('submit',function(e){e.preventDefault();var t=document.createElement('div');t.className='demo-toast';t.textContent='זה דמו לצפייה בלבד. באתר האמיתי הטופס עובד.';document.body.appendChild(t);setTimeout(function(){t.remove()},2600)});document.addEventListener('click',function(e){var a=e.target.closest('a[href="#demo"]');if(a){e.preventDefault()}});</script>`;
  const rewrite = (html) => html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]+_next\/static[^>]*>/g, '')
    .replace(/<link rel="preload"[^>]*>/g, '')
    .replace(new RegExp(`href="/f/${t}/give"`, 'g'), 'href="give.html"')
    .replace(new RegExp(`href="/f/${t}"`, 'g'), 'href="fund.html"')
    .replace(new RegExp(`href="/m/${m}"`, 'g'), 'href="manage.html"')
    .replace(new RegExp(`href="/admin/${id}"`, 'g'), 'href="admin-fund.html"')
    .replace(/href="\/admin"/g, 'href="admin.html"').replace(/href="\/new"/g, 'href="new.html"').replace(/href="\/"/g, 'href="index.html"')
    .replace(new RegExp(SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), PUBLIC)
    .replace(new RegExp(encodeURIComponent(SITE).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodeURIComponent(PUBLIC))
    .replace(/<a ([^>]*)href="#"/g, '<a $1href="#demo"');
  for (const [file, path] of screens) {
    await page.goto(SITE + path, { waitUntil: 'networkidle' });
    const title = await page.title();
    const bodyInner = rewrite(await page.evaluate(() => document.body.innerHTML));
    const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet">';
    const head = `<title>${title}</title><meta name="claude:viewport-fit-sides" content="cover">${fonts}<style>${css}</style>${extra}`;
    const body = `${nav}${bodyInner}${script}`;
    writeFileSync(`${OUT}/${file}.html`, file === 'index'
      ? `${head}\n<div lang="he" dir="rtl">${body}</div>`
      : `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body style="margin:0">${body}</body></html>`);
    console.log('saved', file, '←', path);
  }
} finally {
  await browser.close(); try { process.kill(-app.pid, 'SIGTERM'); } catch { app.kill('SIGTERM'); } mock.close();
}
