// בדיקת קצה-לקצה: Postgres בזיכרון (pglite), שרת-דמה של מורנינג, והאפליקציה
// הבנויה (next start). פותחים קופה, מפקידים, מאשרים, בודקים ספר ניחומים, ניהול
// משפחתי ומסך admin. מריצים: npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
import { createHmac } from 'node:crypto';
const hm = (k, m) => createHmac('sha256', k).update(m).digest('hex');
// חתימת כרטיס כמו בשרת (src/lib/card.ts), כדי לדמות סריקה טרייה או ישנה
const signCard = (card, ts) => `${ts}.${hm(hm('card-secret-test', 'kupa-card-v1'), `${card}|${ts}`).slice(0, 32)}`;
import { startMockMorning } from './mock-morning.mjs';
import { startMockAnthropic } from './mock-anthropic.mjs';

const PORT = 3100, MOCK = 4545;
const SITE = `http://localhost:${PORT}`;
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

let fails = 0;
const check = (cond, msg) => { if (cond) console.log('  ✓', msg); else { fails++; console.log('  ✗', msg); } };

const mock = await startMockMorning(MOCK);
const ai = await startMockAnthropic(4547);
const app = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: { ...process.env, KUPA_LOCAL_DB: 'memory', DATABASE_URL: '', POSTGRES_URL: '',
    MORNING_AUTH_URL: `http://localhost:${MOCK}/idp/v1/oauth/token`, MORNING_API_BASE: `http://localhost:${MOCK}/api/v1`,
    MORNING_ID: 'test-id', MORNING_SECRET: 'test-secret', MORNING_HOOK: 'hook-secret-123', MORNING_PLUGIN_ID: '',
    ADMIN_PASSWORD: 'admin-pass', CARD_SECRET: 'card-secret-test', NEXT_PUBLIC_SITE_URL: SITE, FEE_PCT: '6', FEE_MODE: 'required', NEXT_PUBLIC_BRAND: 'לזכרם',
    ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://localhost:4547', AI_MODEL: 'claude-opus-5-5' },
  stdio: ['ignore', 'pipe', 'pipe'], detached: true,
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
  await page.click('button:has-text("המשך")');
  await page.fill('#quote', 'אבא תמיד אמר שלא צריך פרחים. אם רוצים לעזור, זה המקום.');
  await page.fill('#quote_by', 'המשפחה');
  await page.fill('#funeral_date', '2026-11-03');
  await page.fill('#funeral_time', '14:00');
  await page.fill('#funeral_place', 'הר המנוחות, גבעת שאול');
  await page.fill('#shiva_place', 'רח׳ הפלמ״ח 12, ירושלים');
  await page.fill('#shiva_date', '2026-11-03');
  await page.fill('#shiva_note', '10:00–22:00 · תפילות 06:30, 16:30');
  await page.click('button:has-text("המשך")');
  await page.fill('#purpose', 'הקופה מכסה את הלוויה והשבעה. מה שייאסף מעבר לכך מיועד למצבה.');
  await page.fill('#target_ils', '34000');
  await page.fill('#manager_name', 'רונית לוי');
  await page.fill('#manager_phone', '0501234567');
  await page.screenshot({ path: OUT + '01-new.png', fullPage: true });
  await page.click('button[type=submit]');
  await page.waitForURL(/\/m\/[A-Za-z0-9_-]+\?welcome=1/, { timeout: 20000 });
  const manageUrl = page.url().replace('?welcome=1', '');
  const familyPin = (await page.locator('#family-pin').textContent()).trim();
  check(/^\d{6}$/.test(familyPin), 'קוד כניסה בן 6 ספרות מוצג בפתיחה');
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
  check((await page.textContent('button[type=submit]')).includes('₪190.80'), 'כפתור מציג 180 + 6% = ₪190.80');
  check(await page.locator('.fd-check:has-text("לתפעול")').count() === 0 && (await page.textContent('.fd-note')).includes('₪10.80'), 'תוספת חובה: אין תיבת ביטול, השורה מציגה ₪10.80');
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

  // 4. הפקדה שנייה: סכום אחר, בלי להציג סכום, ובהמשך הפקדה שבוטלה
  await page.goto(publicUrl + '/give');
  await page.fill('#fdAmt', '500');
  check((await page.textContent('button[type=submit]')).includes('₪530'), 'סכום אחר 500 + 6% = ₪530');
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
  await page.goto(manageUrl + '/help');
  const mt = await page.textContent('body');
  check(mt.includes('ruti@example.com') && mt.includes('לא מוצג בעמוד'), 'המשפחה רואה מייל וסכום מוסתר');
  await page.goto(manageUrl);
  const home = await page.textContent('body');
  check(home.includes('אנחנו כאן בשבילכם') && home.includes('כרטיס המשפחה') && home.includes('משפחת לוי') && home.includes('₪680'), 'הבית: כותרת, כרטיס המשפחה, יתרה ₪680');
  check(home.includes('כבר 2 קרובים השתתפו'), 'עזרה מהקרובים: 2 קרובים השתתפו');
  await page.goto(manageUrl + '/file');
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
  await page.goto(manageUrl + '/file');
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
  check(at.includes('קובי') && at.includes('₪680') && at.includes('₪40.80'), 'רשימת קופות: נאסף ₪680, תפעול ₪40.80 (10.8 + 30)');
  // 8א. המשפחה מבקשת תשלום לספק (הקופה סגורה להפקדות, אבל הכסף שבה עדיין זמין)
  console.log('בקשת תשלום לספק');
  await page.goto(manageUrl + '/card');
  check((await page.textContent('.stats')).includes('יתרה זמינה') && (await page.textContent('.stats')).includes('₪680'), 'המשפחה רואה יתרה זמינה ₪680');
  check((await page.locator('.qr img').count()) === 1, 'QR של הכרטיס מוצג');
  await page.fill('form:has(#req_note) #payee', 'חברה קדישא');
  await page.fill('form:has(#req_note) #amount', '900');
  await page.click('form:has(#req_note) button[type=submit]');
  await page.waitForSelector('.fd-err:has-text("היתרה הזמינה")');
  check(true, 'בקשה מעל היתרה נדחית עם הסבר');
  await page.fill('form:has(#req_note) #amount', '450');
  await page.fill('form:has(#req_note) #purpose', 'הלוויה');
  await page.fill('form:has(#req_note) #contact', 'משה 050-0000000');
  await page.click('form:has(#req_note) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("הבקשה נשלחה")');
  let st = await page.textContent('.stats');
  check(st.includes('₪230') && st.includes('₪450 בבקשות שממתינות'), 'אחרי הבקשה: יתרה זמינה ₪230, ₪450 ממתינים');
  check((await page.locator('.pill:has-text("ממתין לאישור")').count()) === 1, 'הבקשה מוצגת למשפחה כממתינה');
  // בקשה שנייה שתידחה
  await page.fill('form:has(#req_note) #payee', 'פרחים בע״מ');
  await page.fill('form:has(#req_note) #amount', '100');
  await page.click('form:has(#req_note) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("הבקשה נשלחה")');

  // 8ב. מתן רואה ומאשר
  await page.goto(`${SITE}/admin`);
  check((await page.textContent('table.tbl')).includes('2 ממתינות'), 'רשימת הקופות מראה 2 בקשות ממתינות');
  await page.click('table.tbl a');
  await page.waitForSelector('#payee');
  check(await page.locator('.card:has-text("חברה קדישא")').count() === 1, 'הבקשה מוצגת למתן');
  await page.click('.card:has-text("חברה קדישא") button:has-text("שולם, לרשום")');
  await page.waitForSelector('.card:has-text("חברה קדישא")', { state: 'detached' });
  check(true, 'אחרי האישור הבקשה יורדת מהפתוחות');
  await page.fill('.card:has-text("פרחים בע״מ") input[name=reason]', 'לכיסוי הזר, זוכרים?');
  await page.click('.card:has-text("פרחים בע״מ") button:has-text("לדחות")');
  await page.waitForSelector('.card:has-text("פרחים בע״מ")', { state: 'detached' });
  const ft = await page.textContent('.stats');
  check(ft.includes('₪450') && ft.includes('₪230'), 'אחרי האישור: שולם ₪450, יתרה ₪230');
  check((await page.locator('table.tbl:has-text("חברה קדישא") .pill:has-text("שולם")').count()) >= 1, 'התשלום נרשם ברשימת התשלומים לספקים');
  // רישום ידני עדיין עובד
  await page.fill('#payee', 'קייטרינג לשבעה');
  await page.fill('#amount', '100');
  await page.click('form:has(#payee) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("נרשם")');
  check((await page.locator('.pill:has-text("בוטל")').count()) === 1 && (await page.locator('table.tbl:has-text("נגבה") .pill:has-text("שולם")').count()) === 2, 'הפקדות: 2 שולמו, 1 בוטלה');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.screenshot({ path: OUT + '08-admin-fund.png', fullPage: true });
  await page.goto(manageUrl + '/card');
  st = await page.textContent('body');
  check(st.includes('₪550') && (await page.locator('.pill:has-text("לא אושר")').count()) === 1 && st.includes('לכיסוי הזר, זוכרים?'), 'המשפחה רואה: שולם ₪550, הבקשה השנייה לא אושרה עם ההסבר');
  check((await page.textContent('.stats')).includes('₪130'), 'יתרה זמינה למשפחה ₪130');

  // 10. הכרטיס הסגור: הספק סורק ומבקש חיוב
  console.log('כרטיס סגור');
  await page.goto(`${SITE}/admin`);
  await page.click('table.tbl a');
  const cardLink = (await page.locator('.linkbox').nth(2).textContent()).trim();
  check(/\/s\/[A-Za-z0-9_-]{16}$/.test(cardLink), `קישור כרטיס לספק: ${cardLink}`);
  await page.goto(cardLink);
  const sp = await page.textContent('body');
  check(sp.includes('משפחת לוי') && sp.includes('₪130') && !sp.includes('ruti@example.com') && !sp.includes('רונית'), 'הספק רואה יתרה ושם משפחה בלבד, בלי פרטים');
  await page.fill('#payee', 'קייטרינג שולחן ערוך');
  await page.fill('#contact', '0541234567');
  await page.fill('#amount', '500');
  await page.click('button[type=submit]');
  await page.waitForSelector('.fd-err:has-text("היתרה הזמינה בכרטיס")');
  check(true, 'חיוב מעל היתרה נחסם');
  await page.fill('#amount', '50');
  await page.click('button[type=submit]');
  await page.waitForSelector('.notice-ok');
  await page.goto(manageUrl + '/card');
  st = await page.textContent('body');
  check(st.includes('בקשה מהספק דרך הכרטיס') && (await page.textContent('.stats')).includes('₪80'), 'המשפחה רואה את בקשת הספק, יתרה זמינה ₪80');
  await page.goto(`${SITE}/admin`); await page.click('table.tbl a'); await page.waitForSelector('#payee');
  check((await page.textContent('body')).includes('הספק ביקש דרך הכרטיס'), 'מתן רואה שהבקשה הגיעה מהספק');

  // 10ב. מה עושים עכשיו + המסמכים
  console.log('מה עכשיו ומסמכים');
  await page.goto(manageUrl + '/now');
  check((await page.locator('.checks.tasks li').count()) === 10, 'הרשימה הכללית: 10 צעדים');
  await page.click('.sit-opt:has-text("פטירה בבית") input');
  await page.click('form.sit button[type=submit]');
  await page.waitForSelector('.panel:has-text("פטירה בבית") .checks.tasks');
  check((await page.locator('.checks.tasks li').count()) === 15, 'אחרי בחירת מצב: 15 צעדים');
  await page.click('.checks.tasks li >> nth=0 >> .task-toggle');
  await page.waitForSelector('.checks.tasks li.done');
  await page.click('.checks.tasks li >> nth=1 >> .task-toggle');
  await page.waitForFunction(() => document.querySelectorAll('.checks.tasks li.done').length === 2);
  check((await page.textContent('.fam-head p')).includes('2 מתוך 15'), 'שני צעדים סומנו: 2 מתוך 15');
  await page.goto(manageUrl);
  check((await page.textContent('body')).includes('2 מתוך 15'), 'הבית מציג את ההתקדמות');
  await page.goto(manageUrl + '/file');
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  await page.setInputFiles('#doc-file', { name: 'teudat-ptira.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.selectOption('#doc-kind', 'death-cert');
  await page.fill('#doc-name', 'תעודת פטירה');
  await page.click('form[action$="/documents"] button[type=submit]');
  await page.waitForURL(/doc=ok/);
  check((await page.locator('.docs li').count()) === 1 && (await page.locator('.kinds li.have').count()) === 1, 'המסמך נשמר ומסומן ברשימת המסמכים');
  const docHref = await page.getAttribute('.docs li a', 'href');
  const dl = await page.request.get(`${SITE}${docHref}`);
  check(dl.status() === 200 && dl.headers()['content-type'] === 'application/pdf' && (await dl.body()).equals(pdf), 'המסמך נפתח בחזרה זהה (PDF)');
  const badDoc = await page.request.get(`${SITE}/m/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/doc/${docHref.split('/doc/')[1]}`);
  check(badDoc.status() === 404, 'מסמך לא נגיש עם קישור ניהול אחר');
  await page.setInputFiles('#doc-file', { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(4.5 * 1024 * 1024, 1) });
  await page.click('form[action$="/documents"] button[type=submit]');
  await page.waitForURL(/doc=big/);
  check(true, 'קובץ מעל 4MB נדחה עם הסבר');

  // 11. העוזר
  console.log('העוזר');
  await page.goto(manageUrl + '/assistant');
  check((await page.locator('.chat-quick button').count()) === 4, 'ארבע שאלות מהירות');
  await page.fill('#chat-input', 'כמה נשאר בקופה?');
  await page.click('.chat-form button[type=submit]');
  await page.waitForSelector('.bubble.assistant:has-text("עוזר דמה")');
  const b1 = await page.textContent('.bubble.assistant');
  check(b1.includes('כמה נשאר בקופה?') && b1.includes('היתרה בהקשר'), 'העוזר ענה (זרימה) וקיבל את ההקשר של הקופה');
  const call = ai.calls[0];
  const sysText = call.body.system.map((s) => s.text).join('\n');
  check(call.body.model === 'claude-opus-5-5' && call.body.tools?.[0]?.name === 'suggest_payment_request' && call.body.tools[0].strict === true, 'בקשה: הדגם, הכלי strict');
  check(sysText.includes('משפחת לוי') && sysText.includes('₪80') && sysText.includes('חברה קדישא') && !sysText.includes(manageUrl), 'ההקשר: משפחה, יתרה זמינה ₪80, תשלומים, בלי קישור הניהול');
  check(sysText.includes('[בוצע]') && sysText.includes('תעודת פטירה: תעודת פטירה'), 'ההקשר כולל צעדים ומסמכים');
  check(call.body.fallbacks === 'default' && String(call.headers['anthropic-beta'] || '').includes('server-side-fallback-2026-07-01') && call.body.output_config?.effort === 'low', 'fallbacks ברירת מחדל ומאמץ נמוך');
  await page.fill('#chat-input', 'תזמין קייטרינג לשבעה');
  await page.click('.chat-form button[type=submit]');
  await page.waitForSelector('.chat-actions a');
  const act = await page.textContent('.chat-actions a');
  check(act.includes('קייטרינג שולחן ערוך') && act.includes('₪50'), 'העוזר מציע בקשת תשלום ככפתור');
  check(ai.calls[1].body.messages.length === 3 && ai.calls[1].body.messages[1].role === 'assistant', 'ההיסטוריה נשלחת (3 הודעות)');
  await page.click('.chat-actions a');
  await page.waitForSelector('#req_note');
  check((await page.inputValue('form:has(#req_note) #payee')) === 'קייטרינג שולחן ערוך' && (await page.inputValue('form:has(#req_note) #amount')) === '50', 'הכפתור ממלא מראש את בקשת התשלום');
  // הבית: שורת השאלה מובילה לעוזר עם השאלה
  await page.goto(manageUrl);
  await page.fill('#home-q', 'מה עושים היום?');
  await page.click('form.chat-strip button');
  await page.waitForURL(/\/assistant\?q=/);
  await page.waitForSelector('.bubble.assistant:has-text("מה עושים היום?")');
  check(true, 'שאלה מהבית נשלחת אוטומטית לעוזר');

  // 11. שלב 1: כרטיס ההטבות. ספק, הטבה, קישור כניסה, מימוש מאובטח, חסימה
  console.log('כרטיס ההטבות');
  await page.goto(`${SITE}/admin/suppliers`);
  await page.waitForSelector('#s-name');
  await page.fill('#s-name', 'קייטרינג של רחל');
  await page.fill('#s-cat', 'קייטרינג לשבעה');
  await page.fill('#s-city', 'ירושלים');
  await page.fill('#s-phone', '0529876543');
  await page.fill('#s-desc', 'ארוחות חמות לשבעה, משלוח עד הבית.');
  await page.check('input[name=activate]');
  await page.click('form:has(#s-name) button[type=submit]');
  await page.waitForURL(/\/admin\/suppliers\/[0-9a-f-]{36}$/);
  const supplierAdminUrl = page.url();
  check(true, 'ספק נוסף ואושר, עמוד הספק בניהול נפתח');
  await page.fill('#b-title', 'הנחה על ארוחות לשבעה');
  await page.fill('#b-value', '10');
  await page.fill('#b-terms', 'בהזמנה מראש');
  await page.click('form:has(#b-title) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("ההטבה נוספה")');
  check((await page.textContent('table.tbl')).includes('10% הנחה'), 'ההטבה מופיעה: 10% הנחה');
  await page.fill('#b-title', 'משלוח חינם לשבעה');
  await page.selectOption('#b-kind', 'gift');
  await page.fill('#b-value', '');
  await page.click('form:has(#b-title) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("ההטבה נוספה")');
  const supplierPin = (await page.locator('.card-meta .linkbox').first().textContent()).trim();
  check(/^\d{6}$/.test(supplierPin), 'לספק קוד בן 6 ספרות בניהול');
  await page.click('button:has-text("קישור כניסה לספק")');
  await page.waitForSelector('.linkbox');
  const loginLink = (await page.locator('.linkbox:has-text("/p/login/")').first().textContent()).trim();
  check(/\/p\/login\/[A-Za-z0-9_-]{32}$/.test(loginLink), 'קישור כניסה לספק הונפק');

  // המשפחה: תוקף, QR חי, ורשימת הספקים האמיתית
  await page.goto(manageUrl + '/card');
  let cb = await page.textContent('body');
  check(cb.includes('בתוקף עד') && cb.includes('בתוקף'), 'כרטיס המשפחה: בתוקף, עם תאריך');
  const qrSrc = await page.getAttribute('.qr img', 'src');
  check(qrSrc && qrSrc.includes(`/api/m/`) && qrSrc.includes('/qr'), 'ה-QR מגיע מנקודת הקצה החיה');
  const qrRes = await fetch(`${SITE}${qrSrc.split('?')[0]}`);
  check(qrRes.status === 200 && qrRes.headers.get('content-type') === 'image/png', 'נקודת הקצה של ה-QR מחזירה PNG');
  await page.goto(manageUrl + '/suppliers');
  cb = await page.textContent('body');
  check(cb.includes('קייטרינג של רחל') && cb.includes('10% הנחה') && !cb.includes('להמחשה'), 'רשימת הספקים: הספק האמיתי עם ההטבה, בלי הדוגמאות');

  // הספק: בלי כניסה אין מימוש
  const cardTok = cardLink.split('/s/')[1];
  await page.goto(cardLink);
  check((await page.textContent('body')).includes('כניסת ספקים'), 'ספק לא מחובר: רואה "כניסת ספקים" ולא טופס מימוש');

  // הטלפון של הספק: הקשר נפרד
  const phone = await browser.newContext({ viewport: { width: 420, height: 860 }, locale: 'he-IL' });
  const sp2 = await phone.newPage();
  await sp2.goto(loginLink);
  check((await sp2.textContent('body')).includes('להיכנס לפורטל') && (await sp2.textContent('body')).includes('קייטרינג של רחל'), 'דף הכניסה מציג את שם הספק וכפתור (GET לא צורך את הקישור)');
  await sp2.goto(loginLink);
  await sp2.click('button:has-text("להיכנס לפורטל")');
  await sp2.waitForURL(/\/p$/);
  check((await sp2.textContent('body')).includes('קייטרינג של רחל'), 'הספק נכנס מהקישור ורואה את הפורטל שלו');
  const again = await phone.newPage(); await again.goto(loginLink);
  check((await again.textContent('body')).includes('כבר שימש'), 'קישור הכניסה חד-פעמי: פתיחה שנייה מראה "כבר שימש"');
  await again.close();
  await sp2.goto(cardLink);
  check((await sp2.textContent('body')).includes('זה לא קוד שנסרק'), 'קישור בלי חתימה: אין מימוש');
  const nowSec = Math.floor(Date.now() / 1000);
  await sp2.goto(`${cardLink}?t=${signCard(cardTok, nowSec - 600)}`);
  check((await sp2.textContent('body')).includes('כבר לא טרי'), 'חתימה ישנה (10 דקות): אין מימוש');
  await sp2.goto(`${cardLink}?t=${signCard(cardTok, nowSec)}.x`);
  check((await sp2.textContent('body')).includes('זה לא קוד שנסרק') || (await sp2.textContent('body')).includes('לא טרי'), 'חתימה פגומה: אין מימוש');
  const freshT = signCard(cardTok, nowSec);
  await sp2.goto(`${cardLink}?t=${freshT}`);
  await sp2.waitForSelector('#benefit');
  check((await sp2.locator('#pin').count()) === 0, 'ספק מחובר: אין שדה קוד');
  await sp2.fill('#amount_saved', '120');
  await sp2.fill('#rnote', 'הזמנה 4471');
  await sp2.click('form:has(#benefit) button[type=submit]');
  await sp2.waitForSelector('.notice-ok:has-text("ההטבה מומשה")');
  check(true, 'סריקה טרייה + ספק מחובר: ההטבה מומשה');
  await sp2.goto(`${cardLink}?t=${freshT}`);
  const after = await sp2.textContent('body');
  check(after.includes('מומש כבר') && (await sp2.locator('#benefit option:has-text("הנחה על ארוחות")').isDisabled()), 'אותה משפחה שוב: ההטבה שמומשה מסומנת "מומש כבר" וכבויה');
  await sp2.goto(`${SITE}/p`);
  check((await sp2.textContent('body')).includes('הזמנה 4471') && (await sp2.textContent('body')).includes('₪120'), 'הפורטל מציג את המימוש עם החיסכון');
  await phone.close();

  // מסלול הקוד: טלפון אחר, בלי כניסה. הספק נבחר מהרשימה ומקליד את הקוד שלו
  const phone2 = await browser.newContext({ viewport: { width: 420, height: 860 }, locale: 'he-IL' });
  const sp3 = await phone2.newPage();
  const t2 = signCard(cardTok, Math.floor(Date.now() / 1000));
  await sp3.goto(`${cardLink}?t=${t2}`);
  await sp3.waitForSelector('#supplier');
  check((await sp3.locator('#pin').count()) === 1 && (await sp3.textContent('#supplier')).includes('קייטרינג של רחל'), 'בלי כניסה: רשימת ספקים ושדה קוד');
  await sp3.selectOption('#benefit', { label: 'משלוח חינם לשבעה' });
  await sp3.fill('#pin', '000000');
  await sp3.fill('#order_amount', '2000');
  await sp3.click('form:has(#benefit) button[type=submit]');
  await sp3.waitForSelector('.fd-err:has-text("קוד הספק שגוי")');
  check(true, 'קוד שגוי נדחה');
  await sp3.fill('#pin', supplierPin);
  await sp3.click('form:has(#benefit) button[type=submit]');
  await sp3.waitForSelector('.notice-ok:has-text("ההטבה מומשה")');
  check(true, 'קוד נכון: ההטבה מומשה בלי כניסה');
  await phone2.close();

  // המשפחה והניהול רואים את המימוש; חסימה ושחרור
  await page.goto(manageUrl + '/card');
  cb = await page.textContent('body');
  check(cb.includes('קייטרינג של רחל') && cb.includes('חסכתם ₪120'), 'המשפחה רואה את המימוש: חסכתם ₪120');
  await page.goto(supplierAdminUrl);
  const sa = await page.textContent('body');
  check(sa.includes('הזמנה 4471') && sa.includes('₪2,000') && sa.includes('₪200'), 'ניהול הספק: שני מימושים, עסקה ₪2,000, עמלה ₪200 (10%)');
  await page.goto(`${SITE}/admin/suppliers`);
  check((await page.textContent('body')).includes('₪200'), 'רשימת הספקים: עמלות לפלטפורמה ₪200');
  await page.goto(`${SITE}/admin`); await page.click('table.tbl a'); await page.waitForSelector('#payee');
  check((await page.textContent('body')).includes('מימושי הטבות (2)'), 'עמוד הקופה בניהול: שני מימושים');
  await page.fill('form:has(input[value=block]) input[name=reason]', 'חשד לשימוש לא מורשה');
  await page.click('button:has-text("לחסום את הכרטיס")');
  await page.waitForSelector('.pill:has-text("חסום")');
  check(true, 'הכרטיס נחסם בניהול');
  const blockedSup = await fetch(`${cardLink}?t=${signCard(cardTok, Math.floor(Date.now() / 1000))}`).then((r) => r.text());
  check(blockedSup.includes('הכרטיס לא פעיל'), 'הספק רואה: הכרטיס לא פעיל');
  await page.goto(manageUrl + '/card');
  check((await page.textContent('body')).includes('הכרטיס חסום') && (await page.textContent('body')).includes('חשד לשימוש'), 'המשפחה רואה חסימה עם הסיבה');
  await page.goto(`${SITE}/admin`); await page.click('table.tbl a'); await page.waitForSelector('#payee');
  await page.click('button:has-text("לשחרר את החסימה")');
  await page.waitForSelector('.notice-ok:has-text("הכרטיס עודכן")');
  await page.goto(manageUrl + '/card');
  check((await page.textContent('body')).includes('בתוקף עד') && !(await page.textContent('body')).includes('הכרטיס חסום'), 'אחרי השחרור הכרטיס שוב בתוקף');
  check((await page.locator('#payee_pick option').allTextContents()).join('|').includes('קייטרינג של רחל') && (await page.locator('#payee_pick option').allTextContents()).join('|').includes('ספק אחר'), 'בקשת תשלום: רשימת ספקים נפתחת עם "ספק אחר"');
  await page.selectOption('#payee_pick', 'other');
  check((await page.locator('input#payee').count()) === 1, '"ספק אחר" פותח שדה חופשי');


  // 12. שלב 1ב: מדריך ציבורי, עמוד ספק, ליד, סגירה עם עמלה, הצטרפות עצמית, עמוד הכרטיס
  console.log('מדריך ספקים ולידים');
  const cardPub = await fetch(`${SITE}/card`).then((r) => r.text());
  check(cardPub.includes('כרטיס המשפחה') && cardPub.includes('קייטרינג של רחל'), 'עמוד הכרטיס הציבורי: מציג הטבה של ספק אמיתי');
  await page.goto(`${SITE}/suppliers`);
  const dirText = await page.textContent('body');
  check(dirText.includes('קייטרינג של רחל') && dirText.includes('10% הנחה') && !dirText.includes('noindex'), 'המדריך הציבורי מציג את הספק עם ההטבה');
  const supHref = await page.locator('a.sup').first().getAttribute('href');
  check(/^\/suppliers\/[^/?]+$/.test(supHref), `קישור לעמוד הספק: ${supHref}`);
  await page.goto(`${SITE}${supHref}?f=${publicUrl.split('/f/')[1]}`);
  const supPub = await page.textContent('body');
  check(supPub.includes('לקבל הצעה מקייטרינג של רחל') && supPub.includes('שם המשפחה: משפחת לוי'), 'עמוד הספק: טופס הצעה עם שם המשפחה מהקופה');
  await page.fill('#lead-name', 'רונית לוי');
  await page.fill('#lead-phone', '0501234567');
  await page.fill('#lead-msg', 'ארוחות ל-20 איש, 3 ימים');
  await page.click('form:has(#lead-name) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("הפנייה נרשמה")');
  const waHref = await page.locator('.notice-ok a.btn').getAttribute('href');
  check(waHref.startsWith('https://wa.me/972529876543?text=') && decodeURIComponent(waHref).includes('משפחת לוי') === false && decodeURIComponent(waHref).includes('יעקב'), 'כפתור וואטסאפ לספק עם פרטי הפנייה ושם הקופה');
  await page.goto(supplierAdminUrl);
  let adminSup = await page.textContent('body');
  check(adminSup.includes('ארוחות ל-20 איש') && adminSup.includes('1 חדשות'), 'ניהול הספק: הפנייה מופיעה כחדשה');
  await page.click('button:has-text("דיברנו")');
  await page.waitForSelector('.pill:has-text("בטיפול")');
  await page.fill('input[name=order_amount]', '5000');
  await page.click('button:has-text("נסגר")');
  await page.waitForSelector('.pill:has-text("נסגר")');
  adminSup = await page.textContent('body');
  check(adminSup.includes('₪5,000') && adminSup.includes('₪500'), 'סגירת הפנייה ב-₪5,000: עמלה ₪500 (10%)');
  await page.goto(`${SITE}/admin/suppliers`);
  check((await page.textContent('body')).includes('₪700'), 'רשימת הספקים: עמלות לפלטפורמה ₪700 (200 ממימוש + 500 מפנייה)');
  // הצטרפות עצמית
  await page.goto(`${SITE}/suppliers/join`);
  await page.fill('#j-name', 'אוהלים של משה');
  await page.fill('#j-cat', 'אוהלים וציוד');
  await page.fill('#j-legal', 'משה אוהלים בע״מ');
  await page.fill('#j-bid', '515123456');
  await page.selectOption('#j-btype', 'company');
  await page.fill('#j-year', '2009');
  await page.fill('#j-address', 'הרצל 10, אשדוד');
  await page.fill('#j-areas', 'דרום ומרכז');
  await page.fill('#j-hours', 'א׳–ה׳ 8:00–18:00');
  await page.fill('#j-phone', '0537654321');
  await page.fill('#j-web', 'ohalim.co.il');
  await page.fill('#j-services', 'אוהל לשבעה\nכיסאות ושולחנות');
  await page.fill('#j-bt', 'הנחה על אוהל לשבעה');
  await page.fill('#j-bv', '15');
  await page.click('form:has(#j-name) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("נרשמתם")');
  check(true, 'ספק נרשם בעצמו');
  const dir2 = await fetch(`${SITE}/suppliers`).then((r) => r.text());
  check(!dir2.includes('אוהלים של משה'), 'ספק ממתין לא מופיע במדריך לפני אישור');
  await page.goto(`${SITE}/admin/suppliers`);
  check((await page.textContent('body')).includes('אוהלים של משה'), 'הניהול רואה את הספק החדש כממתין');
  await page.click('tr:has-text("אוהלים של משה") button:has-text("לאשר")');
  await page.waitForSelector('tr:has-text("אוהלים של משה") .pill:has-text("פעיל")');
  const dir3 = await fetch(`${SITE}/suppliers`).then((r) => r.text());
  check(dir3.includes('אוהלים של משה') && dir3.includes('15% הנחה'), 'אחרי האישור הספק מופיע במדריך עם ההטבה');
  await page.goto(`${SITE}/suppliers`);
  const moshHref = await page.locator('a.sup:has-text("אוהלים של משה")').getAttribute('href');
  const moshPage = await fetch(`${SITE}${moshHref}`).then((r) => r.text());
  check(moshPage.includes('515123456') && moshPage.includes('הרצל 10') && moshPage.includes('חברה בע״מ') && moshPage.includes('ohalim.co.il') && moshPage.includes('אוהל לשבעה') && moshPage.includes('מאז 2009'), 'עמוד הספק: ח.פ, כתובת, סוג עסק, אתר, שירותים, שנת הקמה');
  check(moshPage.includes('לא מאומת') === false && moshPage.includes('הפרטים נמסרו על ידי העסק'), 'ספק חדש מסומן כלא מאומת');
  await page.goto(`${SITE}/admin/suppliers`); await page.click('a:has-text("אוהלים של משה")'); await page.waitForSelector('button:has-text("לסמן כמאומת")');
  await page.click('button:has-text("לסמן כמאומת")');
  await page.waitForSelector('.pill:has-text("מאומת")');
  const dir4 = await fetch(`${SITE}/suppliers`).then((r) => r.text());
  check(dir4.includes('✓ מאומת'), 'אחרי אימות: תג "מאומת" במדריך');
  // דירוג: המשפחה (קופה של יעקב לוי) סגרה עבודה עם קייטרינג של רחל, ולכן יכולה לדרג
  await page.goto(manageUrl + '/suppliers');
  check((await page.locator('#rv-sup option').allTextContents()).join('|').includes('קייטרינג של רחל') && !(await page.locator('#rv-sup option').allTextContents()).join('|').includes('אוהלים'), 'דירוג: רק הספק שעבדו איתו ברשימה');
  await page.click('.rate label:nth-child(4)');
  await page.fill('#rv-text', 'הגיעו בזמן, האוכל טוב, ההטבה כובדה.');
  await page.click('form:has(#rv-sup) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("הדירוג נשמר")');
  const dir5 = await fetch(`${SITE}/suppliers`).then((r) => r.text());
  check(dir5.includes('4.0') && dir5.includes('(1)'), 'המדריך מציג דירוג 4.0 (1)');
  const rachelPage = await fetch(`${SITE}${supHref}`).then((r) => r.text());
  check(rachelPage.includes('הגיעו בזמן') && rachelPage.includes('משפחת לוי'), 'עמוד הספק מציג את הדירוג עם שם המשפחה');
  await page.goto(manageUrl + '/suppliers');
  check((await page.locator('a:has-text("לקבל הצעה עם ההטבה")').first().getAttribute('href')).includes('?f='), 'אזור המשפחה: "לקבל הצעה" מוביל לעמוד הספק עם הקופה');


  // 13. "לצידכם": מדריכים, חיפוש, תזכורות, חתימות, עזרה מהקרובים, מעסיקים
  console.log('לצידכם');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(manageUrl);
  const shell = await page.textContent('body');
  check(shell.includes('לצידכם') && shell.includes('מדריכים וזכויות') && shell.includes('מסמכים וחתימות') && shell.includes('משימות ותזכורות') && shell.includes('הרכזת האישית שלכם') && shell.includes('מדריכים למשפחה') && shell.includes('שירותים והטבות'), 'הבית לפי ההמחשה: ניווט, רכזת, מדריכים, שירותים');
  check((await page.locator('.fam-search input').count()) === 1 && (await page.locator('.fam-bell').count()) === 1, 'שורת חיפוש ופעמון');
  check((await page.locator('.gtile').count()) === 8, '4 מדריכים + 4 קטגוריות שירות');
  await page.click('.gtile:has-text("ימי השבעה")');
  await page.waitForSelector('.guide-head h1:has-text("ימי השבעה")');
  check((await page.textContent('body')).includes('הוצאות השבעה'), 'מדריך השבעה נפתח עם התוכן');
  await page.goto(manageUrl + '/guides');
  check((await page.locator('.gtile').count()) === 4 && (await page.textContent('body')).includes('הר הכסף'), 'מסך המדריכים: 4 מדריכים וזכויות');
  // חיפוש
  await page.fill('.fam-search input', 'צו ירושה');
  await page.press('.fam-search input', 'Enter');
  await page.waitForURL(/\/search\?q=/);
  const sr = await page.textContent('body');
  check(sr.includes('זכויות וביורוקרטיה') && sr.includes('רשם הירושה') && sr.includes('לשאול את העוזר'), 'חיפוש: מדריך, זכות, והפניה לעוזר');
  // תזכורות: אוטומטיות מהאירועים + ידנית
  await page.goto(manageUrl + '/now');
  const nowTxt = await page.textContent('body');
  check(nowTxt.includes('תזכורות') && nowTxt.includes('אזכרת השנה'), 'תזכורת אוטומטית לשנה מההלוויה');
  await page.fill('#rm-title', 'להתקשר לביטוח לאומי');
  await page.fill('#rm-due', '2030-01-15');
  await page.click('form:has(#rm-title) button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("התזכורת נוספה")');
  check((await page.textContent('.rems')).includes('להתקשר לביטוח לאומי'), 'תזכורת ידנית נוספה');
  await page.click('.rems li:has-text("להתקשר לביטוח לאומי") .task-toggle');
  await page.waitForSelector('details:has-text("בוצעו (1)")');
  check(true, 'תזכורת סומנה כבוצעה');
  // טפסים וחתימות
  await page.goto(manageUrl + '/file');
  const ff = await page.textContent('#forms');
  check(ff.includes('טופס בקשת זכויות') && ff.includes('הסכמה לשירות הליווי') && ff.includes('אישור מהמעסיק') && ff.includes('לחתימה'), 'שלושה טפסים, כולם לחתימה');
  await page.click('#forms li:has-text("טופס בקשת זכויות") button:has-text("לקרוא ולחתום")');
  await page.fill('#sn-rights', 'יעקב');
  await page.fill('#si-rights', '1234');
  await page.check('#forms li:has-text("טופס בקשת זכויות") input[name=agree]');
  await page.click('#forms li:has-text("טופס בקשת זכויות") button:has-text("לחתום")');
  await page.waitForSelector('.fd-err:has-text("שם מלא")');
  check(true, 'חתימה בלי שם מלא נדחית והטופס נשאר');
  await page.fill('#sn-rights', 'יעקב לוי');
  check((await page.inputValue('#si-rights')) === '1234' && (await page.isChecked('#forms li:has-text("טופס בקשת זכויות") input[name=agree]')), 'אחרי שגיאה השדות נשמרים');
  await page.click('#forms li:has-text("טופס בקשת זכויות") button:has-text("לחתום")');
  await page.waitForSelector('#forms li:has-text("טופס בקשת זכויות") .pill:has-text("נחתם")');
  check((await page.textContent('#forms')).includes('על ידי יעקב לוי'), 'הטופס נחתם ומוצג שם החותם');
  await page.goto(manageUrl);
  check((await page.textContent('.forms-list')).includes('נחתם'), 'הבית מציג "נחתם" על טופס הזכויות');
  // עזרה מהקרובים: בקשה -> העמוד הציבורי -> קרוב לוקח -> המשפחה רואה
  await page.goto(manageUrl + '/help?ask=meals');
  await page.fill('#hr-text', 'ארוחת ערב ליום שלישי, 8 אנשים');
  await page.fill('#hr-when', 'יום שלישי בערב');
  await page.click('form#ask button[type=submit]');
  await page.waitForSelector('.notice-ok:has-text("הבקשה פורסמה")');
  await page.goto(publicUrl);
  const pb = await page.textContent('body');
  check(pb.includes('איך אפשר לעזור') && pb.includes('ארוחת ערב ליום שלישי') && pb.includes('1 בקשות פתוחות'), 'העמוד הציבורי מציג את הבקשה');
  await page.click('#help button:has-text("אני אעזור")');
  await page.fill('#help input[name=name]', 'רותי');
  await page.fill('#help input[name=phone]', '0501112222');
  await page.click('#help button:has-text("לוקח/ת את זה")');
  await page.waitForSelector('#help :text("רותי כבר לוקח/ת את זה")');
  await page.goto(manageUrl + '/help');
  const ht = await page.textContent('body');
  check(ht.includes('מישהו לקח') && ht.includes('רותי') && ht.includes('0501112222'), 'המשפחה רואה מי לקח ואת הטלפון');
  await page.goto(manageUrl + '/updates');
  check((await page.textContent('body')).includes('רותי לוקח/ת'), 'העדכונים מציגים את העזרה שנלקחה');
  check((await page.locator('.fam-bell b').count()) === 1, 'הפעמון מציג מונה');
  // פורטל מעסיקים
  await page.goto(`${SITE}/e`);
  await page.fill('#e-company', 'חברת אלפא בע״מ');
  await page.fill('#e-contact', 'נועה כהן');
  await page.fill('#e-phone', '0541234567');
  await page.fill('#c-emp', 'דנה לוי');
  await page.fill('#c-rel', 'אב');
  await page.fill('#c-dec', 'יעקב לוי');
  await page.fill('#c-fp', '0501234567');
  await page.click('button:has-text("לרשום את המשפחה")');
  await page.waitForURL(/\/e\/[A-Za-z0-9_-]{32}\?new=1/);
  const empUrl = page.url().replace('?new=1', '');
  const et = await page.textContent('body');
  check(et.includes('חברת אלפא') && et.includes('דנה לוי') && et.includes('התקבל'), 'פורטל המעסיק: המשפחה רשומה בסטטוס התקבל');
  await page.fill('.cases input[name=signer_name]', 'נועה כהן');
  await page.check('.cases input[name=agree]');
  await page.click('.cases button:has-text("לאשר את החבילה")');
  await page.waitForSelector('.cases :text("אישור המעסיק נרשם")');
  // אדמין: לקשר לקופה ולעדכן סטטוס -> הטופס "אישור מהמעסיק" נחתם אצל המשפחה
  await page.goto(`${SITE}/admin/employers`);
  await page.waitForSelector('.tbl');
  check((await page.textContent('.tbl')).includes('אושר'), 'האדמין רואה שהמעסיק אישר');
  await page.selectOption('.tbl select[name=status]', 'active');
  await page.selectOption('.tbl select[name=fund_id]', { label: 'יעקב (קובי) לוי ז״ל' });
  await page.click('.tbl button:has-text("לעדכן")');
  await page.waitForTimeout(800);
  await page.goto(empUrl);
  check((await page.textContent('body')).includes('בליווי'), 'המעסיק רואה סטטוס "בליווי"');
  await page.goto(manageUrl + '/file');
  check((await page.textContent('#forms li:has-text("אישור מהמעסיק")')).includes('נחתם'), 'אצל המשפחה: אישור מהמעסיק נחתם');
  // נייד: הבית כמו אפליקציה
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(manageUrl);
  check(await page.locator('.app-home').isVisible() && (await page.locator('.app-home a:has-text("הצגת הכרטיס")').count()) === 1, 'נייד: כרטיס + "הצגת הכרטיס"');
  await page.screenshot({ path: OUT + '13-home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(manageUrl);
  await page.screenshot({ path: OUT + '13-home-desktop.png', fullPage: true });


  // 14. כניסה בטלפון + קוד: משפחה, ספק, מעסיק
  console.log('כניסה');
  await page.goto(empUrl);
  const empPin = (await page.locator('#emp-pin').textContent()).trim();
  const lp = await browser.newPage();
  await lp.goto(`${SITE}/login`);
  check((await lp.locator('button[role=tab]').count()) === 3 && (await lp.locator('button:has-text("כניסה")').count()) === 1, 'מסך הכניסה: 3 לשוניות וכפתור כניסה');
  await lp.fill('#family-phone', '050-1234567');
  await lp.fill('#family-pin', '000000');
  await lp.click('button:has-text("כניסה")');
  await lp.waitForSelector('.fd-err:has-text("לא נכונים")');
  check(true, 'קוד שגוי נדחה בלי לחשוף אם הטלפון קיים');
  await lp.fill('#family-pin', familyPin);
  await lp.click('button:has-text("כניסה")');
  await lp.waitForURL((u) => u.toString() === manageUrl);
  check((await lp.textContent('body')).includes('אנחנו כאן בשבילכם'), 'משפחה נכנסה בטלפון + קוד למרכז המשפחה');
  await lp.goto(`${SITE}/login?as=supplier`);
  await lp.fill('#supplier-phone', '+972529876543');
  await lp.fill('#supplier-pin', supplierPin);
  await lp.click('button:has-text("כניסה")');
  await lp.waitForURL(/\/p$/);
  check((await lp.textContent('body')).includes('קייטרינג של רחל'), 'ספק נכנס בטלפון (בפורמט בינלאומי) + קוד הספק');
  await lp.goto(`${SITE}/login?as=employer`);
  await lp.fill('#employer-phone', '0541234567');
  await lp.fill('#employer-pin', empPin);
  await lp.click('button:has-text("כניסה")');
  await lp.waitForURL((u) => u.toString() === empUrl);
  check((await lp.textContent('body')).includes('חברת אלפא'), 'מעסיק נכנס בטלפון + קוד');
  // נעילה אחרי 5 ניסיונות
  await lp.goto(`${SITE}/login`);
  for (let i = 0; i < 5; i++) { await lp.fill('#family-phone', '0501234567'); await lp.fill('#family-pin', '111111'); await lp.click('button:has-text("כניסה")'); await lp.waitForSelector('.fd-err'); }
  await lp.fill('#family-pin', familyPin);
  await lp.click('button:has-text("כניסה")');
  await lp.waitForSelector('.fd-err:has-text("יותר מדי ניסיונות")');
  check(true, 'אחרי 5 ניסיונות כושלים: נעילה גם עם הקוד הנכון');
  await lp.close();


  // 15. מעסיק: רשימת עובדים, ייבוא, ורישום משפחה מתוך הרשימה
  console.log('עובדים');
  await page.goto(empUrl);
  await page.fill('#w-name', 'רון ברק');
  await page.fill('#w-phone', '0533334444');
  await page.fill('#w-dept', 'כספים');
  await page.click('button:has-text("להוסיף עובד/ת")');
  await page.waitForSelector('.notice-ok:has-text("רון ברק נוסף")');
  await page.fill('#w-rows', 'שם, טלפון, מחלקה\nמיכל שרון\t052-1112222\tמכירות\nאבי גל, 054-5556666, לוגיסטיקה');
  await page.click('button:has-text("לייבא את הרשימה")');
  await page.waitForSelector('.notice-ok:has-text("נוספו 2 עובדים")');
  check((await page.locator('#employees tbody tr').count()) === 3, 'רשימת העובדים: 3 (אחד ידני, שניים מייבוא, כותרת דולגה)');
  await page.click('#employees tr:has-text("מיכל שרון") button:has-text("לרשום את המשפחה לליווי")');
  await page.fill('#employees tr:has-text("מיכל שרון") input[name=relation]', 'אם');
  await page.click('#employees tr:has-text("מיכל שרון") button:has-text("לרשום לליווי")');
  await page.waitForSelector('#employees tr:has-text("מיכל שרון") .pill:has-text("התקבל")');
  check((await page.textContent('.cases')).includes('מיכל שרון') && (await page.textContent('.cases')).includes('אם'), 'המשפחה של העובדת נרשמה מהרשימה, עם הקרבה');
  await page.goto(`${SITE}/admin`);
  const adminHome = await page.textContent('body');
  check(adminHome.includes('משפחות דרך מעסיקים') && adminHome.includes('ספקים פעילים'), 'ניהול: אריחי סקירה למשפחות, ספקים ומעסיקים');

  // 9. קופה לזכרה
  console.log('לזכרה');
  await page.setViewportSize({ width: 420, height: 860 });
  await page.goto(`${SITE}/new`);
  await page.fill('#display_name', 'שרה כהן ז״ל');
  await page.check('input[name=gender][value=f]');
  await page.click('button:has-text("לדלג, להשלים אחר כך")');
  await page.fill('#manager_name', 'דוד כהן');
  await page.fill('#manager_phone', '0521234567');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/m\/[A-Za-z0-9_-]+\?welcome=1/);
  const pub2 = (await page.locator('.linkbox').first().textContent()).trim();
  await page.goto(pub2);
  check((await page.textContent('.fd-eyebrow')).trim() === 'לזכרה של', 'עמוד לזכרה: "לזכרה של"');
  check((await page.title()).startsWith('לזכרה של שרה'), 'כותרת הדפדפן לזכרה');
  await page.goto(pub2 + '/give');
  check((await page.getAttribute('#fdMsg', 'placeholder')).includes('הייתה'), 'placeholder בנקבה');
  await page.goto(`${SITE}/`);
  await page.screenshot({ path: OUT + '00-landing.png', fullPage: true });
} catch (e) {
  fails++;
  console.error('שגיאה בבדיקה:', e);
} finally {
  await browser.close();
  try { process.kill(-app.pid, 'SIGTERM'); } catch { app.kill('SIGTERM'); }
  mock.close(); ai.close();
}
console.log(fails ? `\n${fails} בדיקות נכשלו` : '\nכל הבדיקות עברו');
process.exit(fails ? 1 : 0);
