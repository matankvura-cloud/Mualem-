-- לזכרם · במקום פרחים — סכמה. אידמפוטנטית: אפשר להריץ שוב ושוב.
-- מורץ אוטומטית ב-build (scripts/migrate.mjs) כשיש DATABASE_URL.
-- כל הטבלאות עם קידומת kupa_ כדי לחיות לצד הטבלאות הקיימות בפרויקט ה-Supabase של אבלות ישראל.
-- RLS מופעל; מדיניות kupa_app_all רק לתפקיד kupa_app (בעל הטבלאות). ה-API הציבורי של Supabase (anon) לא רואה אותן.

CREATE TABLE IF NOT EXISTS kupa_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- קופה אחת לנפטר. המשפחה פותחת בעצמה; אין חשבון.
-- token: הקישור הציבורי. manage_token: הקישור הסודי לניהול.
CREATE TABLE IF NOT EXISTS kupa_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  manage_token text NOT NULL UNIQUE,
  -- כרטיס המשפחה (סגור): הספק סורק QR ומגיע ל-/s/<card_token> לבקשת חיוב
  card_token text UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  display_name text NOT NULL,
  -- m = לזכרו, f = לזכרה
  gender text NOT NULL DEFAULT 'm' CHECK (gender IN ('m','f')),
  years text,
  city text,
  quote text,
  quote_by text,
  photo_initial text,
  purpose text,
  target_ils numeric(12,2),
  surplus_to text,
  -- אירועים: [{id,kind,label,date,time,place,address,note,maps_url}]
  events jsonb NOT NULL DEFAULT '[]',
  manager_name text,
  manager_phone text,
  manager_email text,
  show_amounts boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  -- תוספת התפעול שהוצעה למפקידים בקופה הזו (נקבעת בפתיחה, כדי שלא תשתנה מתחת לרגליים)
  fee_pct numeric(5,2) NOT NULL DEFAULT 6,
  view_count integer NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'm';
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS card_token text UNIQUE;
-- המצב שהמשפחה בחרה ב"מה עושים עכשיו" (home/hospital/abroad/shiva)
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS situation text;
CREATE INDEX IF NOT EXISTS kupa_funds_card_idx ON kupa_funds(card_token);
CREATE INDEX IF NOT EXISTS kupa_funds_token_idx ON kupa_funds(token);
CREATE INDEX IF NOT EXISTS kupa_funds_manage_idx ON kupa_funds(manage_token);

-- הפקדה = קישור תשלום אחד של מורנינג. custom בקישור = id ההפקדה.
-- amount: מה שנכנס לקופה. fee_amount: תוספת התפעול (הכנסה שלנו). charged: מה שנגבה.
CREATE TABLE IF NOT EXISTS kupa_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  donor_email text,
  message text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  charged_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ILS',
  hide_amount boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  link_url text,
  link_expires_at timestamptz,
  paid_at timestamptz,
  doc_number text,
  doc_url text,
  raw jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_deposits_fund_idx ON kupa_deposits(fund_id, status, created_at DESC);

-- תשלומים מהקופה לספקים (רישום ידני של מתן במסך הניהול).
CREATE TABLE IF NOT EXISTS kupa_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  payee text NOT NULL,
  purpose text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ILS',
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_payouts_fund_idx ON kupa_payouts(fund_id, paid_on DESC);

-- בקשת תשלום לספק מצד המשפחה. מתן מאשר (ואז נרשם payout) או דוחה עם הסבר.
CREATE TABLE IF NOT EXISTS kupa_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  payee text NOT NULL,
  purpose text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  contact text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  -- family: המשפחה ביקשה. supplier: הספק ביקש חיוב דרך הכרטיס
  source text NOT NULL DEFAULT 'family' CHECK (source IN ('family','supplier')),
  admin_note text,
  payout_id uuid REFERENCES kupa_payouts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE kupa_payout_requests ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'family';
CREATE INDEX IF NOT EXISTS kupa_payout_requests_fund_idx ON kupa_payout_requests(fund_id, status, created_at DESC);

-- "מה עושים עכשיו": צעדים שסומנו כבוצעו.
CREATE TABLE IF NOT EXISTS kupa_tasks_done (
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_id, task_key)
);

-- התיק: מסמכים שהמשפחה שומרת. הקובץ עצמו במסד (עד 4MB); בהמשך אחסון קבצים.
CREATE TABLE IF NOT EXISTS kupa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  mime text NOT NULL,
  size integer NOT NULL,
  data bytea NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_documents_fund_idx ON kupa_documents(fund_id, created_at DESC);

-- ---------- שלב 1: כרטיס ההטבות ----------
-- הכרטיס של המשפחה: תוקף, מצב (פעיל/חסום) וסיבת חסימה.
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS card_status text NOT NULL DEFAULT 'active';
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS card_valid_until date;
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS card_block_reason text;
UPDATE kupa_funds SET card_valid_until = (created_at + interval '12 months')::date WHERE card_valid_until IS NULL;

-- ספקים משתתפים. status: pending = נרשם ולא אושר, active = מוצג למשפחות, inactive = הוסר.
CREATE TABLE IF NOT EXISTS kupa_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  icon text NOT NULL DEFAULT 'meal',
  description text,
  city text,
  phone text,
  email text,
  website text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- קוד ספק (6 ספרות) לאישור מימוש בלי כניסה, ועמלת הפלטפורמה מעסקאות הספק.
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS pin text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2) NOT NULL DEFAULT 10;
UPDATE kupa_suppliers SET pin = lpad((floor(random() * 1000000))::int::text, 6, '0') WHERE pin IS NULL;

-- פרופיל עסק מלא (כמו מדרג): פרטים משפטיים, כתובת, שעות, שירותים, לוגו, אימות.
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS business_id text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS areas text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS hours text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS services text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS kosher text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS payment_methods text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS delivery text;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS founded_year integer;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS logo bytea;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS logo_mime text;

-- דירוג של משפחה לספק, אחרי עבודה שנסגרה (פנייה או מימוש). דירוג אחד לקופה לספק.
CREATE TABLE IF NOT EXISTS kupa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES kupa_suppliers(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, fund_id)
);
CREATE INDEX IF NOT EXISTS kupa_reviews_supplier_idx ON kupa_reviews(supplier_id, created_at DESC);

-- הטבה של ספק. kind: percent (אחוז הנחה), fixed (סכום קבוע), gift (מתנה/שירות).
CREATE TABLE IF NOT EXISTS kupa_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES kupa_suppliers(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','fixed','gift')),
  value numeric(10,2),
  terms text,
  max_per_family integer NOT NULL DEFAULT 1,
  valid_from date,
  valid_until date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_benefits_supplier_idx ON kupa_benefits(supplier_id, active);

-- מימוש הטבה: נרשם רק אחרי שהשרת אימת כרטיס חתום וטרי. nonce מונע שימוש חוזר באותה סריקה.
CREATE TABLE IF NOT EXISTS kupa_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES kupa_suppliers(id) ON DELETE SET NULL,
  benefit_id uuid REFERENCES kupa_benefits(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  benefit_title text NOT NULL,
  amount_saved numeric(12,2),
  note text,
  redeemed_by text,
  nonce text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- סכום העסקה והעמלה שמגיעה לפלטפורמה מהספק על המימוש.
ALTER TABLE kupa_redemptions ADD COLUMN IF NOT EXISTS order_amount numeric(12,2);
ALTER TABLE kupa_redemptions ADD COLUMN IF NOT EXISTS commission numeric(12,2);
CREATE INDEX IF NOT EXISTS kupa_redemptions_fund_idx ON kupa_redemptions(fund_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kupa_redemptions_supplier_idx ON kupa_redemptions(supplier_id, created_at DESC);

-- ליד: משפחה (או כל גולש) ביקשה הצעה מספק. הספק מטפל בפורטל; סגירה עם סכום רושמת עמלה.
CREATE TABLE IF NOT EXISTS kupa_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES kupa_suppliers(id) ON DELETE CASCADE,
  fund_id uuid REFERENCES kupa_funds(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed','lost')),
  order_amount numeric(12,2),
  commission numeric(12,2),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_leads_supplier_idx ON kupa_leads(supplier_id, status, created_at DESC);

-- קישורי כניסה לספקים (הניהול מנפיק, הספק פותח פעם אחת בטלפון שלו).
CREATE TABLE IF NOT EXISTS kupa_supplier_logins (
  token_hash text PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES kupa_suppliers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: גישה רק דרך חיבור ישיר כ-kupa_app (DATABASE_URL), לא דרך PostgREST.
ALTER TABLE kupa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_tasks_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_supplier_logins ENABLE ROW LEVEL SECURITY;
-- הטבלאות נוצרות על ידי kupa_app (בעל הטבלאות), ולכן ה-RLS לא חוסם אותו; anon לא רואה אותן.
ALTER TABLE kupa_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_reviews ENABLE ROW LEVEL SECURITY;

-- ---------- שלב 2: "לצידכם", מרכז המשפחה לפי ההמחשה ----------
-- הרכז/ת האישי/ת של המשפחה (ברירת מחדל מהגדרות האתר).
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS coordinator_name text;
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS coordinator_phone text;

-- טפסים וחתימות: מצב כל טופס לקופה. status: todo / signing / signed.
CREATE TABLE IF NOT EXISTS kupa_forms (
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  form_key text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  signer_name text,
  signer_id4 text,
  signed_at timestamptz,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_id, form_key)
);

-- תזכורות של המשפחה (בנוסף לתזכורות שנגזרות מהאירועים).
CREATE TABLE IF NOT EXISTS kupa_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_on date,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_reminders_fund_idx ON kupa_reminders(fund_id, done, due_on);

-- בקשות עזרה מהקרובים (ארוחות, סידורים, הוצאות). status: open / taken / done.
CREATE TABLE IF NOT EXISTS kupa_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES kupa_funds(id) ON DELETE CASCADE,
  kind text NOT NULL,
  text text NOT NULL,
  when_text text,
  status text NOT NULL DEFAULT 'open',
  helper_name text,
  helper_phone text,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_help_requests_fund_idx ON kupa_help_requests(fund_id, status, created_at DESC);

-- פורטל מעסיקים: מעסיק רושם משפחה של עובד ומקבל קישור מעקב.
CREATE TABLE IF NOT EXISTS kupa_employers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  company text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kupa_employer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES kupa_employers(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  deceased_name text,
  relation text,
  family_contact text,
  family_phone text,
  package text NOT NULL DEFAULT 'escort',
  status text NOT NULL DEFAULT 'new',
  fund_id uuid REFERENCES kupa_funds(id) ON DELETE SET NULL,
  approved_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_employer_cases_emp_idx ON kupa_employer_cases(employer_id, created_at DESC);
ALTER TABLE kupa_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_employer_cases ENABLE ROW LEVEL SECURITY;

-- כניסה בטלפון + קוד (בלי SMS): למשפחות, לספקים ולמעסיקים. נעילה אחרי 5 ניסיונות.
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS login_pin text;
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS login_fails integer NOT NULL DEFAULT 0;
ALTER TABLE kupa_funds ADD COLUMN IF NOT EXISTS login_locked_until timestamptz;
UPDATE kupa_funds SET login_pin = lpad((floor(random() * 1000000))::int::text, 6, '0') WHERE login_pin IS NULL;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS login_fails integer NOT NULL DEFAULT 0;
ALTER TABLE kupa_suppliers ADD COLUMN IF NOT EXISTS login_locked_until timestamptz;
ALTER TABLE kupa_employers ADD COLUMN IF NOT EXISTS pin text;
ALTER TABLE kupa_employers ADD COLUMN IF NOT EXISTS login_fails integer NOT NULL DEFAULT 0;
ALTER TABLE kupa_employers ADD COLUMN IF NOT EXISTS login_locked_until timestamptz;
UPDATE kupa_employers SET pin = lpad((floor(random() * 1000000))::int::text, 6, '0') WHERE pin IS NULL;

-- פורטל מעסיקים: רשימת העובדים של המעסיק (כדי לרשום משפחה בלחיצה כשקורה משהו).
CREATE TABLE IF NOT EXISTS kupa_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES kupa_employers(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  department text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kupa_employees_emp_idx ON kupa_employees(employer_id, name);
ALTER TABLE kupa_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_employer_cases ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES kupa_employees(id) ON DELETE SET NULL;
