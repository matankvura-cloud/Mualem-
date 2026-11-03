# לזכרם

קופה דיגיטלית לכל נפטר. המשפחה פותחת בעצמה (בלי חשבון), מקבלת קישור ציבורי
להפקדות וקישור ניהול סודי. כל הפקדה היא קישור תשלום של מורנינג
(מסמך 320) עם הודעה-חזרה; "שולם" מסומן רק מההודעה-חזרה.

**הכנסה:** על כל הפקדה נוספת תוספת תפעול (`FEE_PCT`, ברירת מחדל 6%) שהמפקיד
רואה לפני התשלום. הקופה מקבלת את הסכום המלא, התוספת היא ההכנסה של השירות.
`FEE_MODE=optional` הופך אותה לתיבת סימון שהמפקיד יכול לבטל.

Next.js 16 + React 19, בלי Tailwind. מסד: Postgres (Neon דרך Vercel Storage).

## מסכים
| נתיב | מי | מה |
|---|---|---|
| `/` | כולם | נחיתה |
| `/new` | משפחה | פתיחת קופה → מפנה לקישור הניהול |
| `/f/<token>` | כולם | עמוד הקופה: מי, מתי ואיפה, כמה נאסף, ספר הניחומים. `?paid=1/0` אחרי התשלום |
| `/f/<token>/give` | כולם | הפקדה: 180/360/540/אחר, שם, מילה, מייל לקבלה, "בלי להציג סכום", תוספת תפעול |
| `/m/<manage_token>` | משפחה | הבית של המשפחה: כרטיס, יתרה, תשלומים, ספקים, קרובים, ליווי. תתי-מסכים: `/card`, `/file`, `/suppliers`, `/help`, `/support`, `/assistant` |
| `/m/<manage_token>/now` | משפחה | מה עושים עכשיו: רשימת צעדים כללית + לפי המצב, סימון בוצע והתקדמות |
| `/m/<manage_token>/file` | משפחה | התיק והמסמכים: רשימת המסמכים, העלאה (PDF/תמונה עד 4MB, נשמר במסד), זכויות, פרטי העמוד ואירועים |
| `/m/<manage_token>/assistant` | משפחה | העוזר: שיחה עם Claude שמכיר את הקופה (`ANTHROPIC_API_KEY`); מציע בקשות תשלום ככפתור |
| `/s/<card_token>` | ספק | כרטיס המשפחה הסגור: יתרה זמינה ובקשת חיוב (מתן מאשר) |
| `/admin` | מתן | סיסמה. כל הקופות, הפקדות, רישום תשלומים לספקים |
| `/api/f/<token>/deposits` | POST | יוצר הפקדה + קישור תשלום של מורנינג |
| `/api/morning/hook?k=…` | מורנינג | ההודעה-חזרה (notifyUrl). `custom` = מזהה ההפקדה |
| `/api/health` | | בדיקת חיים |

## הרצה מקומית
```bash
npm install
cp .env.example .env.local        # לפיתוח בלי מסד: KUPA_LOCAL_DB=memory
npm run dev
```
`KUPA_LOCAL_DB=memory` מריץ Postgres בזיכרון (pglite) עם אותה סכמה — נוח לפיתוח,
לא לפרודקשן. בלי מורנינג אמיתית, ההפקדה תחזיר "הסליקה לא מוגדרת".

## בדיקה מקצה לקצה
```bash
npm run build
PLAYWRIGHT_PATH=/path/to/node_modules/playwright npm run test:e2e   # או npm i -D playwright
```
מריץ מסד בזיכרון, שרת-דמה של מורנינג ואת האפליקציה הבנויה; פותח קופה, מפקיד
(עם ובלי תוספת, עם סכום מוסתר, ועם ביטול), בודק את ספר הניחומים, הניהול
המשפחתי, ההודעה-חזרה (אסימון שגוי → 401) ומסך admin. צילומי מסך ב-`tests/out/`.

## כרטיס ההטבות (שלב 1)
- **לכל קופה כרטיס** עם תוקף (12 חודשים מהפתיחה, ניתן לשינוי בניהול), מצב פעיל/חסום וסיבת חסימה.
- **QR חי**: דף הכרטיס של המשפחה מציג QR שמתחדש כל דקה (`/api/m/<manage>/qr`). הקוד הוא קישור
  `/s/<card>?t=<זמן>.<חתימה HMAC>`; החתימה תקפה 3 דקות (`CARD_SECRET`). צילום מסך ישן לא תקף.
- **ספקים** (`kupa_suppliers`) עם הטבות (`kupa_benefits`: אחוז / סכום / מתנה, תנאים, מכסה למשפחה, תוקף).
  הניהול מוסיף ספק ב-`/admin/suppliers`, מאשר אותו, ומנפיק לו **קישור כניסה** חד-פעמי (7 ימים) לפורטל `/p`
  (עוגייה ל-90 יום, בלי סיסמה ובלי מייל). בפורטל הספק מנהל הטבות, פרופיל ורואה מימושים.
- **מימוש** (`kupa_redemptions`): רק ספק מחובר, רק עם סריקה טרייה, רק בכרטיס פעיל, עד המכסה; `nonce` מונע שימוש
  חוזר באותה סריקה. המימוש מופיע למשפחה (`/m/.../card`), לספק (`/p`) ולניהול (`/admin/suppliers/<id>` ועמוד הקופה).
- **חסימה / תוקף**: בעמוד הקופה בניהול. כרטיס חסום או שפג תוקפו לא מאפשר מימוש ולא בקשת חיוב.

## הפריסה הקיימת
פרויקט Vercel: **family-avlut** (נפרס מהענף `ccr-343644c7-ob2tvp` של `matankvura-cloud/Mualem-`, Root Directory `kupa`).
- כתובות: https://my.avlut.org.il (קבועה) · https://family-avlut.vercel.app. `family.avlut.org.il` שייך להדגמה של ChatGPT ולא לכאן.
- **מסד נתונים אמיתי**: פרויקט ה-Supabase של אבלות ישראל `tlm-family-crm` (eu-central-1). הטבלאות `kupa_*`
  חיות לצד הטבלאות הקיימות שם, עם RLS; האפליקציה מתחברת דרך ה-pooler (פורט 6543) כתפקיד ייעודי
  `kupa_app` שהוא בעל הטבלאות. `DATABASE_URL` מוגדר ב-Vercel (production + preview). הסכמה רצה בנפרד מה-build (`npm run migrate`).
- בלי `DATABASE_URL` (פיתוח מקומי) האתר רץ על מסד בזיכרון (`KUPA_LOCAL_DB=memory`); עם `KUPA_DEMO_SEED=1`
  נזרעת קופה לדוגמה (`/m/demo-manage-yaakov-levi-2026-kupa`, `/f/demo-yaakov-levi-2026`, `/s/demo-card-yaakov-levi-2026`).
- פריסה מחדש: ב-Vercel → Deployments → Redeploy, או חיבור הריפו ב-Settings → Git כדי שכל דחיפה תיפרס.

## פריסה ב-Vercel (ידני, בידי מתן)
1. **ריפו**: להעביר את תיקיית `kupa/` לריפו `matankvura-cloud/kupa` (פרטי) — או
   ב-Vercel לבחור Root Directory = `kupa` בריפו הנוכחי.
2. **Vercel project** חדש מהריפו. Framework: Next.js. ה-build מריץ
   `next build` בלבד. הסכמה רצה בנפרד: `npm run migrate` עם `DATABASE_URL` (אידמפוטנטי), לא בזמן ה-build.
3. **מסד**: `DATABASE_URL` לכל Postgres (כבר מוגדר ל-Supabase `tlm-family-crm`, תפקיד `kupa_app`).
4. **משתני סביבה** (Settings → Environment Variables), לפי `.env.example`:
   `MORNING_ID`, `MORNING_SECRET` (מורנינג ← הגדרות ← חיבורים ← API),
   `MORNING_HOOK` (אקראי: `openssl rand -hex 24`), `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BRAND=לזכרם`, `NEXT_PUBLIC_FAMILY_BRAND=אבלות ישראל`, ולעוזר `ANTHROPIC_API_KEY`. `MORNING_PLUGIN_ID` לא חובה:
   נשלף פעם אחת מ-`/plugins` ונשמר בטבלת `settings`.
5. **דומיין**: Settings → Domains → `kupa.avlut.org.il`. הדומיין `avlut.org.il`
   כבר מאומת ב-Vercel אבל ה-DNS חיצוני, ולכן צריך להוסיף אצל ספק ה-DNS רשומת
   `CNAME kupa → cname.vercel-dns.com`.
6. לבדוק: `https://kupa.avlut.org.il/api/health` צריך להחזיר `{"ok":true,"morning":true}`,
   ואז לפתוח קופת ניסיון ולהפקיד ₪10 (המינימום) עד הקבלה.

אין סודות בריפו. אין דפלוי לפרודקשן בלי אישור.

## מבנה
- `db/schema.sql` — הסכמה (אידמפוטנטית). `scripts/migrate.mjs` מריץ אותה.
- `src/lib/db.ts` — Neon (HTTP) או pglite. `src/lib/morning.ts` — OAuth, מסוף, קישור תשלום, קריאת ההודעה-חזרה.
- `src/lib/funds.ts` — שאילתות; מה שהעמוד הציבורי מקבל מסונן כאן (בלי מיילים, בלי סכומים מוסתרים).
- `src/app/...` — המסכים. `src/components/FundPublic.tsx` — עמוד הקופה (פורט מ-tlm-ops `src/ui-fund.js`).
