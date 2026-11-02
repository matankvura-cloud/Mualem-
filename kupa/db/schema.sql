-- קופת לזכרו · במקום פרחים — סכמה. אידמפוטנטית: אפשר להריץ שוב ושוב.
-- מורץ אוטומטית ב-build (scripts/migrate.mjs) כשיש DATABASE_URL.

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- קופה אחת לנפטר. המשפחה פותחת בעצמה; אין חשבון.
-- token: הקישור הציבורי. manage_token: הקישור הסודי לניהול.
CREATE TABLE IF NOT EXISTS funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  manage_token text NOT NULL UNIQUE,
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
ALTER TABLE funds ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'm';
CREATE INDEX IF NOT EXISTS funds_token_idx ON funds(token);
CREATE INDEX IF NOT EXISTS funds_manage_idx ON funds(manage_token);

-- הפקדה = קישור תשלום אחד של מורנינג. custom בקישור = id ההפקדה.
-- amount: מה שנכנס לקופה. fee_amount: תוספת התפעול (הכנסה שלנו). charged: מה שנגבה.
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS deposits_fund_idx ON deposits(fund_id, status, created_at DESC);

-- תשלומים מהקופה לספקים (רישום ידני של מתן במסך הניהול).
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  payee text NOT NULL,
  purpose text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ILS',
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payouts_fund_idx ON payouts(fund_id, paid_on DESC);
