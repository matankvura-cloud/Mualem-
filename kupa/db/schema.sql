-- לזכרם · במקום פרחים — סכמה. אידמפוטנטית: אפשר להריץ שוב ושוב.
-- מורץ אוטומטית ב-build (scripts/migrate.mjs) כשיש DATABASE_URL.
-- כל הטבלאות עם קידומת kupa_ כדי לחיות לצד הטבלאות הקיימות בפרויקט ה-Supabase של אבלות ישראל.
-- RLS מופעל בלי מדיניות: ה-API הציבורי של Supabase (anon) לא רואה אותן; האפליקציה מתחברת כ-postgres.

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

-- RLS בלי מדיניות: גישה רק דרך חיבור ישיר (postgres / service role), לא דרך PostgREST.
ALTER TABLE kupa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_tasks_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupa_documents ENABLE ROW LEVEL SECURITY;
