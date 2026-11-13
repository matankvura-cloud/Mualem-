-- מתנה של נחמה — טיוטת סכמה (לא להרצה על מסד פעיל)
-- יעד: פרויקט Supabase ייעודי ונפרד. אין קשר ל-tlm-family-crm / tlm-ops-eu.
-- כל הסכומים באגורות (integer). כל פעולה כספית נרשמת ב-ledger וב-audit_log.
-- גרסה: 0.1 (13.11.2026) — טיוטה לאישור, תהפוך למיגרציה ראשונה לאחר האישור.

create extension if not exists pgcrypto;

-- ---------- טיפוסים ----------
create type app_role         as enum ('family','provider','employer','admin');
create type order_kind       as enum ('personal','group','employer');
create type order_status     as enum ('draft','pending_payment','paid','cancelled','refunded','failed');
create type payment_status   as enum ('initiated','authorized','captured','failed','refunded','voided');
create type voucher_status   as enum ('pending','active','redeemed','expired','cancelled');
create type offer_status     as enum ('draft','pending_review','approved','paused','archived');
create type provider_status  as enum ('applied','in_review','approved','suspended','rejected');
create type delivery_channel as enum ('link','sms','whatsapp','email');
create type ledger_entry     as enum ('issue','redeem','reverse','expire','adjust');

-- ---------- משתמשים והרשאות ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone_e164  text,
  email       text,
  locale      text not null default 'he',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table user_roles (                 -- admin נכתב רק ע"י service role
  user_id  uuid not null references profiles(id) on delete cascade,
  role     app_role not null,
  primary key (user_id, role)
);

-- ---------- קטלוג ----------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_he     text not null,
  blurb_he    text,
  icon        text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

create table providers (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique,
  display_name    text not null,
  legal_name      text,
  business_id     text,                  -- ח.פ / ע.מ
  contact_name    text,
  phone_e164      text,
  whatsapp_e164   text,
  email           text,
  website         text,
  city            text,
  service_area    text,
  description_he  text,
  logo_path       text,                  -- Supabase Storage
  kosher_note     text,
  status          provider_status not null default 'applied',
  commission_pct  numeric(5,2) not null default 0,   -- עמלת פלטפורמה על מימוש שובר
  is_demo         boolean not null default false,    -- ספק הדגמה — מוצג תמיד עם תווית "לדוגמה"
  approved_at     timestamptz,
  approved_by     uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table provider_categories (
  provider_id  uuid references providers(id) on delete cascade,
  category_id  uuid references categories(id) on delete cascade,
  primary key (provider_id, category_id)
);

create table provider_members (
  provider_id uuid references providers(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner','staff')),
  primary key (provider_id, user_id)
);

create table provider_services (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references providers(id) on delete cascade,
  category_id     uuid not null references categories(id),
  title_he        text not null,
  description_he  text,
  price_agorot    int check (price_agorot is null or price_agorot >= 0),
  price_note_he   text,                  -- "החל מ-", "לפי הצעת מחיר"
  image_path      text,
  status          offer_status not null default 'draft',
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table benefits (                   -- הטבות לכרטיס ההטבות (לא שוברים)
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references providers(id) on delete cascade,
  title_he        text not null,
  terms_he        text not null,
  kind            text not null check (kind in ('percent','fixed','gift')),
  value           numeric(10,2),
  max_per_card    int,
  valid_from      date,
  valid_until     date,
  status          offer_status not null default 'draft',
  created_at      timestamptz not null default now()
);

-- ---------- ארנק משפחתי ----------
create table wallets (
  id          uuid primary key default gen_random_uuid(),
  name_he     text not null,             -- "משפחת כהן"
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

create table wallet_members (
  wallet_id   uuid references wallets(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','member')),
  invited_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  primary key (wallet_id, user_id)
);

create table wallet_invites (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references wallets(id) on delete cascade,
  contact      text not null,            -- טלפון/אימייל של המוזמן
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table benefit_cards (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       uuid not null unique references wallets(id) on delete cascade,
  qr_token_hash   text not null unique,  -- הטוקן עצמו לא נשמר; רק hash
  status          text not null default 'active' check (status in ('active','blocked')),
  issued_at       timestamptz not null default now(),
  valid_until     date
);

-- ---------- הזמנות, תשלומים, שוברים ----------
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text not null unique,        -- MN-2026-000123
  kind                order_kind not null default 'personal',
  buyer_user_id       uuid references profiles(id),
  buyer_name          text not null,
  buyer_phone_e164    text,
  buyer_email         text,
  amount_agorot       int not null check (amount_agorot >= 5000),   -- מינימום 50 ₪
  fee_agorot          int not null default 0 check (fee_agorot >= 0),
  total_agorot        int generated always as (amount_agorot + fee_agorot) stored,
  currency            text not null default 'ILS',
  scope_category_id   uuid references categories(id),            -- null = לכל השירותים
  recipient_name      text not null,
  recipient_phone_e164 text,
  dedication_he       text check (char_length(dedication_he) <= 250),
  deliver_at          timestamptz,                                -- null = מיד
  delivery_channel    delivery_channel not null default 'link',
  status              order_status not null default 'draft',
  idempotency_key     text not null unique,
  is_test             boolean not null default true,              -- עד חיבור סליקה: תמיד true
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id),
  provider      text not null check (provider in ('sandbox')),   -- בעתיד: ספק סליקה מורשה
  provider_ref  text,
  status        payment_status not null default 'initiated',
  amount_agorot int not null,
  is_test       boolean not null default true,
  raw           jsonb,                                            -- ללא פרטי כרטיס לעולם
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table vouchers (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,       -- מוצג למשפחה; 12 תווים
  order_id           uuid not null unique references orders(id),  -- שובר אחד להזמנה
  wallet_id          uuid references wallets(id),                 -- null עד שנתבע
  claim_token_hash   text unique,
  initial_agorot     int not null check (initial_agorot > 0),
  balance_agorot     int not null check (balance_agorot >= 0),
  scope_category_id  uuid references categories(id),
  status             voucher_status not null default 'pending',
  is_test            boolean not null default true,
  issued_at          timestamptz,
  claimed_at         timestamptz,
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table redemptions (
  id                  uuid primary key default gen_random_uuid(),
  voucher_id          uuid not null references vouchers(id),
  provider_id         uuid not null references providers(id),
  amount_agorot       int not null check (amount_agorot > 0),
  commission_agorot   int not null default 0,
  idempotency_key     text not null unique,
  redeemed_by_user_id uuid references profiles(id),   -- משתמש הספק שאישר
  note                text,
  status              text not null default 'approved' check (status in ('approved','reversed')),
  reversed_at         timestamptz,
  reversal_reason     text,
  created_at          timestamptz not null default now()
);

create table voucher_ledger (             -- append-only; אין update/delete
  id                   bigserial primary key,
  voucher_id           uuid not null references vouchers(id),
  entry                ledger_entry not null,
  amount_agorot        int not null,      -- חתום: מימוש שלילי, הנפקה חיובית
  balance_after_agorot int not null,
  redemption_id        uuid references redemptions(id),
  actor_user_id        uuid,
  note                 text,
  created_at           timestamptz not null default now()
);

create table benefit_redemptions (
  id                  uuid primary key default gen_random_uuid(),
  card_id             uuid not null references benefit_cards(id),
  benefit_id          uuid not null references benefits(id),
  provider_id         uuid not null references providers(id),
  redeemed_by_user_id uuid references profiles(id),
  idempotency_key     text not null unique,
  note                text,
  created_at          timestamptz not null default now()
);

-- ---------- החזרים, התחשבנות, מעסיקים ----------
create table refunds (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  payment_id     uuid references payments(id),
  amount_agorot  int not null check (amount_agorot > 0),
  reason         text not null,
  status         text not null default 'requested' check (status in ('requested','approved','rejected','done')),
  requested_by   uuid references profiles(id),
  approved_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create table settlements (
  id                 uuid primary key default gen_random_uuid(),
  provider_id        uuid not null references providers(id),
  period_start       date not null,
  period_end         date not null,
  gross_agorot       int not null default 0,
  commission_agorot  int not null default 0,
  net_agorot         int not null default 0,
  status             text not null default 'open' check (status in ('open','approved','paid')),
  created_at         timestamptz not null default now(),
  paid_at            timestamptz,
  unique (provider_id, period_start, period_end)
);

create table settlement_items (
  settlement_id  uuid references settlements(id) on delete cascade,
  redemption_id  uuid unique references redemptions(id),
  primary key (settlement_id, redemption_id)
);

create table employers (                   -- שלב ד'; נוצר כעת רק כטבלה
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_id   text,
  contact_name  text,
  contact_email text,
  status        text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at    timestamptz not null default now()
);

create table employer_members (
  employer_id uuid references employers(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        text not null default 'buyer' check (role in ('admin','buyer')),
  primary key (employer_id, user_id)
);

-- ---------- תפעול ----------
create table issues (                      -- תקלות ופניות למנהל
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id),
  kind         text not null check (kind in ('bug','redemption','refund','provider','other')),
  entity_type  text,
  entity_id    uuid,
  text         text not null,
  status       text not null default 'open' check (status in ('open','in_progress','closed')),
  created_at   timestamptz not null default now()
);

create table audit_log (                   -- append-only
  id            bigserial primary key,
  actor_user_id uuid,
  actor_role    text,
  action        text not null,             -- order.paid, voucher.issued, voucher.redeemed ...
  entity_type   text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

-- ---------- פונקציות שרת (security definer, נקראות רק מה-API) ----------
-- issue_voucher(order_id)              : הנפקה אידמפוטנטית אחרי payment.captured בלבד
-- claim_voucher(claim_token, wallet_id): שיוך שובר לארנק משפחתי
-- redeem_voucher(code, provider_id, amount, idem_key, actor)
--     : select ... for update על השובר; בדיקת סטטוס/תחום/יתרה/ספק מאושר;
--       insert redemptions + voucher_ledger; update balance; audit_log — בטרנזקציה אחת
-- reverse_redemption(redemption_id, reason, actor)
-- redeem_benefit(qr_token, benefit_id, provider_id, idem_key, actor)
-- Trigger: block update/delete על voucher_ledger ו-audit_log

-- ---------- RLS (עקרונות) ----------
-- categories / providers(status=approved) / provider_services(approved) / benefits(approved): קריאה ציבורית
-- wallets, wallet_members, vouchers(wallet_id), benefit_cards, redemptions(דרך שובר): רק חברי הארנק
-- providers, provider_services, benefits, redemptions, settlements: רק provider_members של אותו ספק
-- orders: הקונה (buyer_user_id) או אדמין; קונה אורח ניגש רק דרך טוקן בצד שרת
-- admin: user_roles.role='admin' — גישה מלאה; כתיבה כספית רק דרך הפונקציות
-- payments, voucher_ledger, audit_log: אין גישת כתיבה מהלקוח כלל
