// בדיקת קצה-לקצה: Postgres בזיכרון (pglite), שרת-דמה של מורנינג, והאפליקציה
// הבנויה (next start). פותחים קופה, מפקידים, מאשרים, בודקים ספר ניחומים, ניהול
// משפחתי ומסך admin. מריצים: npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
import { startMockMorning } from './mock-morning.mjs';

const PORT = 3100, MOCK = 4545;
const SITE = `http://localhost:${PORT}`;
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

let fails = 0;
const check = (cond, msg) => { if (cond) console.log('  ✓', msg); else { fails++; console.log('  ✗', msg); } };

const mock = await startMockMorning(MOCK);
const app = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: { ...process.env, KUPA_LOCAL_DB: 'memory', DATABASE_URL: '', POSTGRES_URL: '',
    MORNING_AUTH_URL: `http://localhost:${MOCK}/idp/v1/oauth/token`, MORNING_API_BASE: `http://localhost:${MOCK}/api/v1`,
    MORNING_ID: 'test-id', MORNING_SECRET: 'test-secret', MORNING_HOOK: 'hook-secret-123', MORNING_PLUGIN_ID: '',
    ADMIN_PASSWORD: 'admin-pass', NEXT_PUBLIC_SITE_URL: SITE, FEE_PCT: '6' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
app.stdout.on('data', (d) => process.env.E2E_VERBOSE && process.stdout.write('[app] ' + d));
app.stderr.on('data', (d) => process.stdout.write('[app:err] ' + d));

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${SITE}/api/health`); if (r.ok) return await r.json(); } catch { /* עדיין לא */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('האפליקציה לא עלתה');
}

const browser = await chromium.launch();
try {
  const health = await waitReady();
  check(health.ok && health.funds === 0 && health.morning, 'health: מסד ריק, מורנינג מוגדרת');

  const page = await browser.newPage({ viewport: { width: 420, height: 860 }, locale: 'he-IL' });

  // 1. פתיחת קופה
  console.log('פתיחת קופה');
  await page.goto(`${SITE}/new`);
  await page.fill('#display_name', 'יעקב לוי ז״ל');
  await page.fill('#years', '1941 – 2026');
  await page.fill('#city', 'ירושלים');
  await page.fill('#quote', 'אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום.');
  await page.fill('#quote_by', 'המשפחה');
  await page.fill('#funeral_date', '2026-11-03');
  await page.fill('#funeral_time', '14:00');
  await page.fill('#funeral_place', 'הר המנוחות, גבעת שאול');
  await page.fill('#shiva_place', 'רח׳ הפלמ״ח 12, ירושלים');
  await page.fill('#shiva_date', '2026-11-03');
  await page.fill('#shiva_note', '10:00–22:00 · תפילות 06:30, 16:30');
  await page.fill('#purpose', 'הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה.');
  await page.fill('#target_ils', '34000');
  await page.fill('#manager_name', 'רונית לוי');
  await page.fill('#manager_phone', '0501234567');
  await page.screenshot({ path: OUT + '01-new.png', fullPage: true });
  await page.click('button[type=submit]');
  await page.waitForURL(/\/m\/[A-Za-z0-9_-]+\?welcome=1/, { timeout: 20000 });
  const manageUrl = page.url().replace('?welcome=1', '');
  const publicUrl = (await page.locator('.linkbox').first().textContent()).trim();
  check(/\/f\/[A-Za-z0-9_-]{16}$/.test(publicUrl), `קישור ציבורי: ${publicUrl}`);
  check(/\/m\/[A-Za-z0-9_-]{32}$/.test(manageUrl), 'קישור ניהול באורך 32');
  await page.screenshot({ path: OUT + '02-manage-welcome.png', fullPage: true });

  // 2. העמוד הציבורי
  console.log('העמוד הציבורי');
  await page.goto(publicUrl);
  check((await page.textContent('h1')).includes('יעקב לוי'), 'כותרת עם השם');
  check(await page.locator('.fd-ev').count() === 2, 'שני אירועים (לוויה ושבעה)');
  check((await page.textContent('.fd-card')).includes('₪0'), 'נאסף ₪0 בהתחלה');
  await page.screenshot({ path: OUT + '03-public-empty.png', fullPage: true });

  // 3. הפקדה עם תוספת תפעול
  console.log('הפקדה');
  await page.click('a.btn:has-text("להפקיד")');
  await page.waitForURL(/\/give$/);
  await page.click('.fd-amts button:has-text("180")');
  check((await page.textContent('button[type=submit]')).includes('₪191'), 'כפתור מציג 180 + 6% = ₪191');
  await page.fill('#fdName', 'רותי ואבי שמעוני');
  await page.fill('#fdMsg', 'יעקב היה השכן שכולם היו רוצים. משתתפים בצערכם.');
  await page.fill('#fdMail', 'ruti@example.com');
  await page.screenshot({ path: OUT + '04-give.png', fullPage: true });
  await page.click('button[type=submit]');
  await page.waitForURL(/localhost:4545\/pay\//, { timeout: 20000 });
  const form = [...mock.forms.values()][0];
  check(form.type === 320 && form.amount === 190.8 && form.income.length === 2 && form.income[1].price === 10.8, 'טופס מורנינג: type 320, 190.8 ₪, שתי שורות');
  check(form.notifyUrl === `${SITE}/api/morning/hook?k=hook-secret-123` && form.client.emails[0] === 'ruti@example.com', 'notifyUrl עם אסימון, מייל לקבלה');
  check(form.successUrl.endsWith('?paid=1') && form.failureUrl.endsWith('?paid=0'), 'successUrl/failureUrl');
  await page.click('#approve');
  await page.waitForURL(/\?paid=1$/, { timeout: 20000 });
  check((await page.textContent('h1')).includes('תודה'), 'עמוד תודה');
  const notify = mock.calls.find((c) => c.method === 'NOTIFY');
  check(notify?.status === 200 && notify.body.includes('"ok":true') && !notify.body.includes('ignored'), 'ההודעה-חזרה התקבלה וסומנה');
  await page.screenshot({ path: OUT + '05-paid.png', fullPage: true });

  // 4. הפקדה שנייה: בלי תוספת, בלי להציג סכום, ובהמשך הפקדה שבוטלה
  await page.goto(publicUrl + '/give');
  await page.fill('#fdAmt', '500');
  await page.click('.fd-check:has-text("לתפעול") input');
  check((await page.textContent('button[type=submit]')).includes('₪500'), 'בלי תוספת: ₪500');
  await page.fill('#fdName', 'דני כץ');
  await page.fill('#fdMsg', 'לא אוכל להגיע, אבל אני איתכם.');
  await page.check('input[name=hide]');
  await page.click('button[type=submit]');
  await page.waitForURL(/localhost:4545\/pay\//);
  await page.click('#approve');
  await page.waitForURL(/\?paid=1$/);
  await page.goto(publicUrl + '/give');
  await page.fill('#fdName', 'מישהו שהתחרט');
  await page.click('button[type=submit]');
  await page.waitForURL(/localhost:4545\/pay\//);
  await page.click('#fail');
  await page.waitForURL(/\?paid=0$/);
  check((await page.textContent('h1')).includes('לא הושלמה'), 'עמוד כישלון');

  // 5. העמוד הציבורי אחרי הפקדות
  console.log('ספר הניחומים');
  await page.goto(publicUrl);
  const card = await page.textContent('.fd-card');
  check(card.includes('₪680') && card.includes('2 אנשים'), 'נאסף ₪680 מ-2 אנשים (ביטול לא נספר)');
  const bookText = await page.textContent('.fd-book');
  check(bookText.includes('רותי ואבי שמעוני') && bookText.includes('₪180'), 'רותי עם סכום');
  check(bookText.includes('דני כץ') && !bookText.includes('₪500'), 'דני בלי סכום');
  check(!bookText.includes('מישהו שהתחרט'), 'מי שלא שילם לא בספר');
  await page.screenshot({ path: OUT + '06-public-after.png', fullPage: true });

  // 6. ניהול משפחתי: הפקדות, אירוע, עריכה, סגירה
  console.log('ניהול משפחתי');
  await page.goto(manageUrl);
  const mt = await page.textContent('body');
  check(mt.includes('ruti@example.com') && mt.includes('לא מוצג בעמוד'), 'המשפחה רואה מייל וסכום מוסתר');
  await page.selectOption('#kind', 'shloshim');
  await page.fill('#date', '2026-12-02');
  await page.fill('#place', 'הפרטים יישלחו לכל מי שהפקיד');
  await page.click('form:has(#kind) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("האירוע נוסף")');
  check(await page.locator('.fd-ev').count() === 3, 'שלושה אירועים אחרי הוספה');
  await page.fill('#display_name', 'יעקב (קובי) לוי ז״ל');
  await page.click('form:has(#display_name) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("נשמרו")');
  await page.screenshot({ path: OUT + '07-manage.png', fullPage: true });
  await page.goto(publicUrl);
  check((await page.textContent('h1')).includes('קובי'), 'השם המעודכן בעמוד הציבורי');
  check(await page.locator('.fd-ev').count() === 3, 'האירוע החדש מוצג');
  await page.goto(manageUrl);
  await page.click('button:has-text("לסגור את הקופה")');
  await page.waitForSelector('.pill:has-text("הקופה סגורה")');
  await page.goto(publicUrl);
  check((await page.textContent('.fd-card')).includes('הקופה נסגרה') && await page.locator('a.btn').count() === 0, 'סגורה: אין כפתור הפקדה');
  const closedApi = await fetch(`${SITE}/api/f/${publicUrl.split('/f/')[1]}/deposits`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: 100, name: 'אבג' }) });
  check(closedApi.status === 410, 'API מסרב להפקדה לקופה סגורה (410)');

  // 7. אבטחת ההודעה-חזרה
  console.log('אבטחה');
  const bad = await fetch(`${SITE}/api/morning/hook?k=wrong`, { method: 'POST', body: '{}' });
  check(bad.status === 401, 'hook עם אסימון שגוי: 401');
  const noId = await fetch(`${SITE}/api/morning/hook?k=hook-secret-123`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) });
  check(noId.status === 200 && (await noId.json()).ignored === 'no_id', 'hook בלי custom: 200 ומתעלם');
  const nf = await fetch(`${SITE}/m/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
  check(nf.status === 404, 'קישור ניהול לא קיים: 404');
  const adminNoAuth = await fetch(`${SITE}/admin`);
  check(adminNoAuth.status === 200 && (await adminNoAuth.text()).includes('סיסמה') , 'admin בלי cookie מציג התחברות');

  // 8. admin
  console.log('admin');
  await page.goto(`${SITE}/admin`);
  await page.fill('#password', 'wrong');
  await page.click('button[type=submit]');
  await page.waitForSelector('.fd-err:has-text("שגויה")');
  await page.fill('#password', 'admin-pass');
  await page.click('button[type=submit]');
  await page.waitForSelector('table.tbl');
  const at = await page.textContent('body');
  check(at.includes('קובי') && at.includes('₪680') && at.includes('₪11'), 'רשימת קופות: נאסף ₪680, תפעול ₪11');
  await page.click('table.tbl a');
  await page.waitForSelector('#payee');
  await page.fill('#payee', 'חברה קדישא');
  await page.fill('#amount', '450');
  await page.fill('#purpose', 'הלוויה');
  await page.click('form:has(#payee) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("נרשם")');
  const ft = await page.textContent('.stats');
  check(ft.includes('₪450') && ft.includes('₪230'), 'אחרי תשלום לספק: שולם ₪450, יתרה ₪230');
  check((await page.locator('.pill:has-text("בוטל")').count()) === 1 && (await page.locator('.pill:has-text("שולם")').count()) === 2, 'הפקדות: 2 שולמו, 1 בוטלה');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.screenshot({ path: OUT + '08-admin-fund.png', fullPage: true });
  await page.goto(manageUrl);
  check((await page.textContent('.stats')).includes('₪450'), 'המשפחה רואה את התשלום לספק');
  await page.goto(`${SITE}/`);
  await page.screenshot({ path: OUT + '00-landing.png', fullPage: true });
} catch (e) {
  fails++;
  console.error('שגיאה בבדיקה:', e);
} finally {
  await browser.close();
  app.kill('SIGTERM');
  mock.close();
}
console.log(fails ? `\n${fails} בדיקות נכשלו` : '\nכל הבדיקות עברו');
process.exit(fails ? 1 : 0);
