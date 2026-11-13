# מתנה של נחמה

> דרך לתת, גם כשאין מילים. · מופעל על ידי אבלות ישראל

פלטפורמת שוברים דיגיטליים והטבות למשפחות בתקופת האבל. נותן המתנה רוכש שובר, המשפחה שומרת אותו בארנק משפחתי בנייד ומממשת אותו, חלקית ובכמה פעמים, אצל ספקים מאושרים.

**מצב: MVP בסביבת בדיקה.** אין חיובים אמיתיים, השוברים ללא ערך כספי, הספקים המסומנים „לדוגמה” אינם עסקים אמיתיים. אין פריסה מסחרית.

## טכנולוגיה

- Next.js 15 (App Router, Server Actions), TypeScript, Tailwind v4. עברית מלאה, RTL, נייד תחילה, PWA.
- PostgreSQL 16 עם Row Level Security. תואם Supabase: הפונקציות `auth.uid()` / `auth.role()`, התפקידים `anon` / `authenticated` / `service_role` ומדיניות ה-RLS זהים, כך שהמיגרציות רצות כפי שהן על פרויקט Supabase.
- כל הפעולות הכספיות הן פונקציות SQL אטומיות ואידמפוטנטיות (`create_gift_order`, `sandbox_pay`, `claim_voucher`, `redeem_voucher`, `reverse_redemption`, `redeem_benefit`). הלקוח לעולם לא כותב ישירות ל-`payments`, `vouchers`, `voucher_ledger`, `audit_log`.
- אימות ללא סיסמאות: קוד חד-פעמי לנייד (SMS) או לאימייל, וקישור אימייל שדורש לחיצה. בסביבת בדיקה ההודעות נכתבות ל-`/dev/outbox`.

## הרצה מקומית

דרישות: Node 22, PostgreSQL 16.

```bash
cp .env.example .env.local        # ועדכנו DATABASE_URL / DATABASE_ADMIN_URL
createdb matana
psql -d matana -c "create role matana_app login password '...'"   # או השאירו למיגרציה 0001
npm install
npm run db:seed                   # מיגרציות + נתוני הדגמה
npm run dev
```

חשבונות בדיקה (הקוד מופיע ב-`/dev/outbox`): `admin@matana.test` (ניהול), `provider@matana.test` ו-`provider2@matana.test` (ספקי הדגמה). משפחה: כל מספר נייד או אימייל אחר.

## בדיקות

```bash
npm run test:db     # שכבת הנתונים: רכישה → תשלום → קבלה → מימוש חלקי אצל שני ספקים → כפילות → RLS → ביטול
npm run build && npm start &
npm run test:e2e    # Playwright: מסלולי נותן, משפחה, ספק ומנהל מקצה לקצה
```

## מבנה

```
db/migrations/   מיגרציות SQL (סכמה, פונקציות, RLS)
db/seed/         קטגוריות, ספקי הדגמה, משתמשי בדיקה
db/tests/        בדיקות שכבת הנתונים
src/app/         נתיבים: ציבורי, /gift, /v/[token], /wallet, /provider, /admin, /dev
src/lib/db.ts    גישה למסד עם תפקיד מפורש בכל טרנזקציה (anon / authenticated / service_role)
src/lib/auth/    סשנים, OTP, קישור אימייל, הגנות נתיבים
messages/he.ts   מחרוזות משותפות (מוכן לריבוי שפות)
tests/e2e/       Playwright
```

## מה לא נעשה בכוונה (עד להחלטות עסקיות ומשפטיות)

- אין סליקה אמיתית. `payments.provider` מקבל רק `sandbox`, ו-`app_settings.payments_mode` נעול ל-`sandbox`.
- אין גביית עמלה. העמלה (ברירת מחדל 10%, ניתנת לשינוי לפי ספק וקטגוריה) מחושבת ונרשמת בלבד.
- אין תוקף לשוברים (`voucher_validity_months` ריק) עד לבחינת הדין הישראלי ותנאי ספק התשלומים.
- אין שליחת SMS או אימייל אמיתיים. ממשק השליחה קיים (`src/lib/messaging.ts`) ומסרב לפעול בפרודקשן ללא ספק.
- פורטל מעסיקים ומתנה קבוצתית מרובת משלמים: טבלאות קיימות, מסכים בשלב ד'.

## מעבר ל-Supabase בענן

1. יצירת פרויקט Supabase ייעודי (`matana-shel-nechama`).
2. הרצת `db/migrations/*.sql` בסדר (דרך SQL editor או `supabase db push`). מיגרציה 0001 יוצרת את טבלאות `auth.*` של האפליקציה; ב-Supabase היא מתווספת לצד GoTrue ואינה מתנגשת (שמות שונים: `otp_codes`, `sessions` של האפליקציה).
3. `DATABASE_URL` = מחרוזת החיבור של ה-pooler בתפקיד `matana_app`; `DATABASE_ADMIN_URL` = `postgres`.
4. אופציונלי: החלפת שכבת האימות ב-Supabase Auth. הממשק ב-`src/lib/auth/` מבודד לשם כך.
