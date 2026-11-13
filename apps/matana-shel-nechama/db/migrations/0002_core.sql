-- 0002 — סכמת הליבה של "מתנה של נחמה": קטלוג, ארנק, שוברים, מימושים, ניהול.
-- כל הסכומים באגורות. כתיבה כספית רק דרך פונקציות security definer.

create schema if not exists app;            -- פונקציות עזר פנימיות
grant usage on schema app to anon, authenticated, service_role;

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

-- ---------- הגדרות מערכת ----------
create table app_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);
insert into app_settings (key, value, description) values
  ('payments_mode', 'sandbox', 'sandbox = הדמיה בלבד. אין ערך אחר נתמך עד חיבור סולק מורשה.'),
  ('default_commission_pct', '10', 'עמלת ברירת מחדל מהספק במימוש, באחוזים. נרשמת בלבד; לא נגבית עד הסדרת הסכמים.'),
  ('min_custom_amount_agorot', '5000', 'סכום מותאם מינימלי'),
  ('max_custom_amount_agorot', '500000', 'סכום מותאם מקסימלי'),
  ('voucher_validity_months', '', 'ריק = ללא תוקף עד להחלטה משפטית');

-- ---------- משתמשים ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  locale      text not null default 'he',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table user_roles (
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
  business_id     text,
  contact_name    text,
  contact_email   citext,
  phone_e164      text,
  whatsapp_e164   text,
  website         text,
  city            text,
  service_area    text,
  description_he  text,
  logo_url        text,
  kosher_note     text,
  status          provider_status not null default 'applied',
  commission_pct  numeric(5,2),                     -- null = ברירת מחדל מערכת
  is_demo         boolean not null default false,
  applied_message text,
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
  created_at  timestamptz not null default now(),
  primary key (provider_id, user_id)
);

create table commission_rules (                 -- עמלה לפי ספק ו/או קטגוריה
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid references providers(id) on delete cascade,
  category_id  uuid references categories(id) on delete cascade,
  pct          numeric(5,2) not null check (pct >= 0 and pct <= 100),
  note         text,
  created_at   timestamptz not null default now(),
  unique nulls not distinct (provider_id, category_id)
);

create table provider_services (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references providers(id) on delete cascade,
  category_id     uuid not null references categories(id),
  title_he        text not null,
  description_he  text,
  price_agorot    int check (price_agorot is null or price_agorot >= 0),
  price_note_he   text,
  status          offer_status not null default 'pending_review',
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table benefits (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references providers(id) on delete cascade,
  title_he        text not null,
  terms_he        text not null,
  kind            text not null check (kind in ('percent','fixed','gift')),
  value           numeric(10,2),
  max_per_card    int,
  valid_from      date,
  valid_until     date,
  status          offer_status not null default 'pending_review',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- ארנק משפחתי ----------
create table wallets (
  id          uuid primary key default gen_random_uuid(),
  name_he     text not null,
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
  label        text,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references profiles(id),
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table benefit_cards (
  id          uuid primary key default gen_random_uuid(),
  wallet_id   uuid not null unique references wallets(id) on delete cascade,
  card_code   text not null unique,
  status      text not null default 'active' check (status in ('active','blocked')),
  issued_at   timestamptz not null default now(),
  valid_until date
);

-- ---------- הזמנות, תשלומים, שוברים ----------
create sequence order_no_seq;

create table orders (
  id                   uuid primary key default gen_random_uuid(),
  order_no             text not null unique,
  kind                 order_kind not null default 'personal',
  buyer_user_id        uuid references profiles(id),
  buyer_name           text not null,
  buyer_phone_e164     text,
  buyer_email          citext,
  access_token_hash    text not null unique,
  amount_agorot        int not null check (amount_agorot >= 5000),
  fee_agorot           int not null default 0 check (fee_agorot = 0),   -- אין דמי שירות לנותן
  total_agorot         int generated always as (amount_agorot + fee_agorot) stored,
  currency             text not null default 'ILS',
  scope_category_id    uuid references categories(id),
  recipient_name       text not null,
  recipient_phone_e164 text,
  dedication_he        text check (dedication_he is null or char_length(dedication_he) <= 250),
  deliver_at           timestamptz,
  delivery_channel     delivery_channel not null default 'link',
  status               order_status not null default 'pending_payment',
  idempotency_key      text not null unique,
  is_test              boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id),
  provider      text not null check (provider in ('sandbox')),
  provider_ref  text,
  status        payment_status not null default 'initiated',
  amount_agorot int not null,
  is_test       boolean not null default true,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payments_order_idx on payments(order_id);

create table vouchers (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  order_id           uuid not null unique references orders(id),
  wallet_id          uuid references wallets(id),
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
create index vouchers_wallet_idx on vouchers(wallet_id);

create table redemptions (
  id                  uuid primary key default gen_random_uuid(),
  voucher_id          uuid not null references vouchers(id),
  provider_id         uuid not null references providers(id),
  amount_agorot       int not null check (amount_agorot > 0),
  commission_pct      numeric(5,2) not null,
  commission_agorot   int not null default 0,
  idempotency_key     text not null unique,
  redeemed_by_user_id uuid references profiles(id),
  note                text,
  status              text not null default 'approved' check (status in ('approved','reversed')),
  reversed_at         timestamptz,
  reversal_reason     text,
  created_at          timestamptz not null default now()
);
create index redemptions_voucher_idx on redemptions(voucher_id);
create index redemptions_provider_idx on redemptions(provider_id, created_at desc);

create table voucher_ledger (
  id                   bigserial primary key,
  voucher_id           uuid not null references vouchers(id),
  entry                ledger_entry not null,
  amount_agorot        int not null,
  balance_after_agorot int not null,
  redemption_id        uuid references redemptions(id),
  actor_user_id        uuid,
  note                 text,
  created_at           timestamptz not null default now()
);
create index voucher_ledger_voucher_idx on voucher_ledger(voucher_id, id);

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

create table refunds (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  payment_id     uuid references payments(id),
  amount_agorot  int not null check (amount_agorot > 0),
  reason         text not null,
  status         text not null default 'done' check (status in ('requested','approved','rejected','done')),
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

create table employers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_id   text,
  contact_name  text,
  contact_email citext,
  status        text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at    timestamptz not null default now()
);

create table employer_members (
  employer_id uuid references employers(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        text not null default 'buyer' check (role in ('admin','buyer')),
  primary key (employer_id, user_id)
);

create table issues (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id),
  kind         text not null check (kind in ('bug','redemption','refund','provider','contact','other')),
  entity_type  text,
  entity_id    uuid,
  contact      text,
  text         text not null,
  status       text not null default 'open' check (status in ('open','in_progress','closed')),
  created_at   timestamptz not null default now()
);

create table audit_log (
  id            bigserial primary key,
  actor_user_id uuid,
  actor_role    text,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);

create table dev_outbox (                      -- הודעות יוצאות בסביבת פיתוח/בדיקה בלבד
  id          bigserial primary key,
  channel     text not null check (channel in ('email','sms')),
  recipient   text not null,
  subject     text,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- append-only ----------
create or replace function app.block_mutation() returns trigger language plpgsql as $$
begin raise exception 'table % is append-only', tg_table_name; end $$;
create trigger voucher_ledger_append_only before update or delete on voucher_ledger for each row execute function app.block_mutation();
create trigger audit_log_append_only     before update or delete on audit_log     for each row execute function app.block_mutation();

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger providers_touch before update on providers for each row execute function app.touch_updated_at();
create trigger provider_services_touch before update on provider_services for each row execute function app.touch_updated_at();
create trigger benefits_touch before update on benefits for each row execute function app.touch_updated_at();
create trigger orders_touch before update on orders for each row execute function app.touch_updated_at();
create trigger payments_touch before update on payments for each row execute function app.touch_updated_at();

-- ספק שעורך הצעה מאושרת מחזיר אותה לבדיקה
create or replace function app.offer_reset_review() returns trigger language plpgsql as $$
begin
  if not app.is_admin() and (old.title_he, old.description_he, old.price_agorot, old.price_note_he, old.category_id)
     is distinct from (new.title_he, new.description_he, new.price_agorot, new.price_note_he, new.category_id) then
    new.status := 'pending_review';
  end if;
  if not app.is_admin() and new.status = 'approved' and old.status <> 'approved' then
    raise exception 'only admin can approve';
  end if;
  return new;
end $$;
create or replace function app.benefit_reset_review() returns trigger language plpgsql as $$
begin
  if not app.is_admin() and (old.title_he, old.terms_he, old.kind, old.value, old.max_per_card, old.valid_from, old.valid_until)
     is distinct from (new.title_he, new.terms_he, new.kind, new.value, new.max_per_card, new.valid_from, new.valid_until) then
    new.status := 'pending_review';
  end if;
  if not app.is_admin() and new.status = 'approved' and old.status <> 'approved' then
    raise exception 'only admin can approve';
  end if;
  return new;
end $$;

-- ---------- עזרים ----------
create or replace function app.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
$$;
create or replace function app.is_wallet_member(w uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from wallet_members where wallet_id = w and user_id = auth.uid())
$$;
create or replace function app.is_provider_member(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from provider_members where provider_id = p and user_id = auth.uid())
$$;
create or replace function app.my_provider_id() returns uuid language sql stable security definer set search_path = public as $$
  select provider_id from provider_members where user_id = auth.uid() order by created_at limit 1
$$;
create or replace function app.setting(k text) returns text language sql stable security definer set search_path = public as $$
  select value from app_settings where key = k
$$;
create or replace function app.hash(t text) returns text language sql immutable as $$
  select encode(digest(t, 'sha256'), 'hex')
$$;
create or replace function app.gen_token() returns text language sql volatile as $$
  select translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_')
$$;
create or replace function app.gen_code(n int) returns text language plpgsql volatile as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := ''; b bytea := gen_random_bytes(n); i int;
begin
  for i in 0..n-1 loop out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
  return out;
end $$;
create or replace function app.gen_voucher_code() returns text language plpgsql volatile as $$
declare c text; begin
  loop
    c := app.gen_code(4) || '-' || app.gen_code(4) || '-' || app.gen_code(4);
    exit when not exists (select 1 from vouchers where code = c);
  end loop; return c; end $$;
create or replace function app.audit(p_action text, p_entity text, p_id uuid, p_before jsonb, p_after jsonb) returns void
language sql security definer set search_path = public as $$
  insert into audit_log (actor_user_id, actor_role, action, entity_type, entity_id, before, after)
  values (auth.uid(), coalesce(auth.role(), 'anon'), p_action, p_entity, p_id, p_before, p_after)
$$;
create or replace function app.effective_commission_pct(p_provider uuid, p_category uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select pct from commission_rules where provider_id = p_provider and category_id = p_category and p_category is not null),
    (select pct from commission_rules where provider_id = p_provider and category_id is null),
    (select commission_pct from providers where id = p_provider),
    (select pct from commission_rules where provider_id is null and category_id = p_category and p_category is not null),
    (select pct from commission_rules where provider_id is null and category_id is null),
    app.setting('default_commission_pct')::numeric, 10)
$$;
create or replace function app.normalize_phone(p text) returns text language plpgsql immutable as $$
declare d text; begin
  if p is null or btrim(p) = '' then return null; end if;
  d := regexp_replace(p, '[^0-9+]', '', 'g');
  if d like '+%' then return d; end if;
  if d like '0%' then return '+972' || substr(d, 2); end if;
  if d like '972%' then return '+' || d; end if;
  return '+' || d;
end $$;

create trigger provider_services_review before update on provider_services for each row execute function app.offer_reset_review();
create trigger benefits_review before update on benefits for each row execute function app.benefit_reset_review();

-- ---------- פונקציות עסקיות ----------

-- יצירת הזמנה (אורח או משתמש). מחזירה order_id, order_no, access_token (פעם אחת).
create or replace function create_gift_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare
  v_amount int := (p->>'amount_agorot')::int;
  v_idem   text := p->>'idempotency_key';
  v_scope  uuid := nullif(p->>'scope_category_id','')::uuid;
  v_token  text := app.gen_token();
  v_order  orders%rowtype;
  v_pay_id uuid;
  v_min int := app.setting('min_custom_amount_agorot')::int;
  v_max int := app.setting('max_custom_amount_agorot')::int;
begin
  if app.setting('payments_mode') <> 'sandbox' then raise exception 'payments_mode_not_supported'; end if;
  if v_idem is null or length(v_idem) < 8 then raise exception 'idempotency_key_required'; end if;
  select * into v_order from orders where idempotency_key = v_idem;
  if found then
    return jsonb_build_object('order_id', v_order.id, 'order_no', v_order.order_no, 'access_token', null, 'existing', true);
  end if;
  if v_amount is null or v_amount < v_min or v_amount > v_max or v_amount % 100 <> 0 then raise exception 'invalid_amount'; end if;
  if coalesce(btrim(p->>'recipient_name'),'') = '' then raise exception 'recipient_name_required'; end if;
  if coalesce(btrim(p->>'buyer_name'),'') = '' then raise exception 'buyer_name_required'; end if;
  if v_scope is not null and not exists (select 1 from categories where id = v_scope and is_active) then raise exception 'invalid_scope'; end if;
  if char_length(coalesce(p->>'dedication_he','')) > 250 then raise exception 'dedication_too_long'; end if;

  insert into orders (order_no, kind, buyer_user_id, buyer_name, buyer_phone_e164, buyer_email, access_token_hash,
                      amount_agorot, scope_category_id, recipient_name, recipient_phone_e164, dedication_he,
                      deliver_at, delivery_channel, status, idempotency_key, is_test)
  values ('MN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_no_seq')::text, 6, '0'),
          coalesce((p->>'kind')::order_kind, 'personal'), auth.uid(), btrim(p->>'buyer_name'),
          app.normalize_phone(p->>'buyer_phone'), nullif(lower(btrim(p->>'buyer_email')),''), app.hash(v_token),
          v_amount, v_scope, btrim(p->>'recipient_name'), app.normalize_phone(p->>'recipient_phone'),
          nullif(btrim(p->>'dedication_he'),''), nullif(p->>'deliver_at','')::timestamptz,
          coalesce((p->>'delivery_channel')::delivery_channel, 'link'), 'pending_payment', v_idem, true)
  returning * into v_order;

  insert into payments (order_id, provider, status, amount_agorot, is_test)
  values (v_order.id, 'sandbox', 'initiated', v_order.total_agorot, true) returning id into v_pay_id;

  perform app.audit('order.created', 'order', v_order.id, null, to_jsonb(v_order) - 'access_token_hash');
  return jsonb_build_object('order_id', v_order.id, 'order_no', v_order.order_no, 'access_token', v_token, 'payment_id', v_pay_id, 'existing', false);
end $$;

-- הנפקת שובר להזמנה ששולמה. פנימי. אידמפוטנטי (unique order_id).
create or replace function app.issue_voucher(p_order uuid) returns uuid
language plpgsql security definer set search_path = public, app as $$
declare v_order orders%rowtype; v_id uuid; v_months text := app.setting('voucher_validity_months');
begin
  select * into v_order from orders where id = p_order for update;
  if v_order.status <> 'paid' then raise exception 'order_not_paid'; end if;
  select id into v_id from vouchers where order_id = p_order;
  if v_id is not null then return v_id; end if;
  insert into vouchers (code, order_id, initial_agorot, balance_agorot, scope_category_id, status, is_test, issued_at, expires_at)
  values (app.gen_voucher_code(), p_order, v_order.amount_agorot, v_order.amount_agorot, v_order.scope_category_id, 'pending',
          v_order.is_test, now(), case when v_months ~ '^[0-9]+$' then now() + (v_months || ' months')::interval end)
  returning id into v_id;
  insert into voucher_ledger (voucher_id, entry, amount_agorot, balance_after_agorot, actor_user_id, note)
  values (v_id, 'issue', v_order.amount_agorot, v_order.amount_agorot, auth.uid(), 'issued for ' || v_order.order_no);
  perform app.audit('voucher.issued', 'voucher', v_id, null, jsonb_build_object('order_id', p_order, 'amount_agorot', v_order.amount_agorot));
  return v_id;
end $$;

-- סולק הדמיה. outcome: approve | decline. מחזיר מצב וטוקן קבלה (פעם אחת, באישור ראשון).
create or replace function sandbox_pay(p_order uuid, p_access_token text, p_outcome text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_order orders%rowtype; v_pay payments%rowtype; v_voucher uuid; v_claim text;
begin
  if app.setting('payments_mode') <> 'sandbox' then raise exception 'payments_mode_not_supported'; end if;
  select * into v_order from orders where id = p_order for update;
  if not found or v_order.access_token_hash <> app.hash(coalesce(p_access_token,'')) then raise exception 'order_not_found'; end if;
  select * into v_pay from payments where order_id = p_order order by created_at desc limit 1 for update;

  if v_order.status = 'paid' then
    select id into v_voucher from vouchers where order_id = p_order;
    return jsonb_build_object('status', 'paid', 'order_no', v_order.order_no, 'claim_token', null, 'already', true);
  end if;
  if v_order.status <> 'pending_payment' then
    return jsonb_build_object('status', v_order.status::text, 'order_no', v_order.order_no, 'claim_token', null, 'already', true);
  end if;

  if p_outcome = 'approve' then
    update payments set status = 'captured', provider_ref = 'SBX-' || upper(substr(md5(random()::text),1,10)),
      raw = jsonb_build_object('sandbox', true, 'captured_at', now()) where id = v_pay.id;
    update orders set status = 'paid' where id = p_order;
    perform app.audit('payment.captured', 'payment', v_pay.id, jsonb_build_object('status', v_pay.status), jsonb_build_object('status','captured','sandbox',true));
    v_voucher := app.issue_voucher(p_order);
    v_claim := app.gen_token();
    update vouchers set claim_token_hash = app.hash(v_claim) where id = v_voucher;
    return jsonb_build_object('status', 'paid', 'order_no', v_order.order_no, 'claim_token', v_claim, 'already', false);
  elsif p_outcome = 'decline' then
    update payments set status = 'failed', raw = jsonb_build_object('sandbox', true, 'declined_at', now()) where id = v_pay.id;
    update orders set status = 'failed' where id = p_order;
    perform app.audit('payment.failed', 'payment', v_pay.id, null, jsonb_build_object('sandbox', true));
    return jsonb_build_object('status', 'failed', 'order_no', v_order.order_no, 'claim_token', null, 'already', false);
  else
    raise exception 'invalid_outcome';
  end if;
end $$;

-- פרטי הזמנה לנותן המתנה (לפי טוקן גישה). ללא קוד השובר.
create or replace function get_buyer_order(p_order uuid, p_access_token text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', o.id, 'order_no', o.order_no, 'status', o.status, 'amount_agorot', o.amount_agorot, 'total_agorot', o.total_agorot,
    'recipient_name', o.recipient_name, 'recipient_phone', o.recipient_phone_e164, 'buyer_name', o.buyer_name,
    'dedication_he', o.dedication_he, 'delivery_channel', o.delivery_channel, 'deliver_at', o.deliver_at,
    'scope_category', (select name_he from categories c where c.id = o.scope_category_id),
    'is_test', o.is_test, 'created_at', o.created_at,
    'voucher', (select jsonb_build_object('status', v.status, 'claimed_at', v.claimed_at, 'balance_agorot', v.balance_agorot) from vouchers v where v.order_id = o.id))
  into v from orders o where o.id = p_order and o.access_token_hash = app.hash(coalesce(p_access_token,''));
  return v;
end $$;

-- קישור קבלה: תצוגה מקדימה של המתנה לפני התחברות
create or replace function peek_claim(p_token text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'voucher_id', v.id, 'status', v.status, 'initial_agorot', v.initial_agorot, 'balance_agorot', v.balance_agorot,
    'recipient_name', o.recipient_name, 'buyer_name', o.buyer_name, 'dedication_he', o.dedication_he,
    'scope_category', (select name_he from categories c where c.id = v.scope_category_id), 'is_test', v.is_test,
    'claimed', v.wallet_id is not null, 'mine', (v.wallet_id is not null and app.is_wallet_member(v.wallet_id)))
  into v from vouchers v join orders o on o.id = v.order_id where v.claim_token_hash = app.hash(coalesce(p_token,''));
  return v;
end $$;

-- קבלת שובר לארנק של המשתמש המחובר (נוצר ארנק אם אין)
create or replace function claim_voucher(p_token text, p_wallet_name text default null) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_v vouchers%rowtype; v_wallet uuid; v_uid uuid := auth.uid(); v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_v from vouchers where claim_token_hash = app.hash(coalesce(p_token,'')) for update;
  if not found then raise exception 'claim_not_found'; end if;
  select wallet_id into v_wallet from wallet_members where user_id = v_uid order by created_at limit 1;
  if v_wallet is null then
    select recipient_name into v_name from orders where id = v_v.order_id;
    insert into wallets (name_he, created_by) values (coalesce(nullif(btrim(p_wallet_name),''), v_name, 'הארנק שלי'), v_uid) returning id into v_wallet;
    insert into wallet_members (wallet_id, user_id, role) values (v_wallet, v_uid, 'owner');
    insert into benefit_cards (wallet_id, card_code) values (v_wallet, 'MC-' || app.gen_code(6));
    insert into user_roles (user_id, role) values (v_uid, 'family') on conflict do nothing;
    perform app.audit('wallet.created', 'wallet', v_wallet, null, jsonb_build_object('by', v_uid));
  end if;
  if v_v.wallet_id is not null then
    if v_v.wallet_id = v_wallet then
      return jsonb_build_object('voucher_id', v_v.id, 'wallet_id', v_wallet, 'already', true);
    end if;
    raise exception 'claimed_by_other_wallet';
  end if;
  if v_v.status <> 'pending' then raise exception 'voucher_not_claimable'; end if;
  update vouchers set wallet_id = v_wallet, status = 'active', claimed_at = now() where id = v_v.id;
  perform app.audit('voucher.claimed', 'voucher', v_v.id, jsonb_build_object('status', v_v.status), jsonb_build_object('status','active','wallet_id', v_wallet));
  return jsonb_build_object('voucher_id', v_v.id, 'wallet_id', v_wallet, 'already', false);
end $$;

-- הזמנת בן משפחה לארנק
create or replace function create_wallet_invite(p_wallet uuid, p_label text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_token text := app.gen_token(); v_id uuid;
begin
  if not app.is_wallet_member(p_wallet) then raise exception 'forbidden'; end if;
  insert into wallet_invites (wallet_id, label, token_hash, expires_at, created_by)
  values (p_wallet, nullif(btrim(p_label),''), app.hash(v_token), now() + interval '7 days', auth.uid()) returning id into v_id;
  perform app.audit('wallet.invite_created', 'wallet', p_wallet, null, jsonb_build_object('invite_id', v_id));
  return jsonb_build_object('invite_id', v_id, 'token', v_token);
end $$;

create or replace function accept_wallet_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_inv wallet_invites%rowtype; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_inv from wallet_invites where token_hash = app.hash(coalesce(p_token,'')) for update;
  if not found or v_inv.expires_at < now() then raise exception 'invite_invalid'; end if;
  if v_inv.accepted_at is not null and v_inv.accepted_by <> v_uid then raise exception 'invite_used'; end if;
  insert into wallet_members (wallet_id, user_id, role, invited_by) values (v_inv.wallet_id, v_uid, 'member', v_inv.created_by) on conflict do nothing;
  insert into user_roles (user_id, role) values (v_uid, 'family') on conflict do nothing;
  update wallet_invites set accepted_at = coalesce(accepted_at, now()), accepted_by = coalesce(accepted_by, v_uid) where id = v_inv.id;
  perform app.audit('wallet.member_joined', 'wallet', v_inv.wallet_id, null, jsonb_build_object('user_id', v_uid));
  return jsonb_build_object('wallet_id', v_inv.wallet_id);
end $$;

create or replace function remove_wallet_member(p_wallet uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not exists (select 1 from wallet_members where wallet_id = p_wallet and user_id = auth.uid() and role = 'owner') then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot_remove_self'; end if;
  delete from wallet_members where wallet_id = p_wallet and user_id = p_user;
  perform app.audit('wallet.member_removed', 'wallet', p_wallet, null, jsonb_build_object('user_id', p_user));
end $$;

-- ספק: בדיקת שובר לפני מימוש
create or replace function lookup_voucher(p_code text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_p uuid := app.my_provider_id(); v jsonb; v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_p is null then raise exception 'not_a_provider'; end if;
  if length(v_code) = 12 then v_code := substr(v_code,1,4) || '-' || substr(v_code,5,4) || '-' || substr(v_code,9,4); end if;
  select jsonb_build_object(
    'voucher_id', v.id, 'code', v.code, 'status', v.status, 'balance_agorot', v.balance_agorot, 'initial_agorot', v.initial_agorot,
    'scope_category_id', v.scope_category_id, 'scope_category', (select name_he from categories c where c.id = v.scope_category_id),
    'recipient_masked', left(o.recipient_name, 1) || '***', 'is_test', v.is_test,
    'eligible', (v.status = 'active' and v.balance_agorot > 0
                 and exists (select 1 from providers p where p.id = v_p and p.status = 'approved')
                 and (v.scope_category_id is null or exists (select 1 from provider_categories pc where pc.provider_id = v_p and pc.category_id = v.scope_category_id))),
    'commission_pct', app.effective_commission_pct(v_p, v.scope_category_id))
  into v from vouchers v join orders o on o.id = v.order_id where v.code = v_code;
  return v;
end $$;

-- מימוש שובר (חלקי או מלא). אטומי ואידמפוטנטי.
create or replace function redeem_voucher(p_code text, p_amount int, p_idem text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_p uuid := app.my_provider_id(); v_v vouchers%rowtype; v_r redemptions%rowtype; v_pct numeric; v_comm int; v_new int;
        v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_p is null then raise exception 'not_a_provider'; end if;
  if p_idem is null or length(p_idem) < 8 then raise exception 'idempotency_key_required'; end if;
  select * into v_r from redemptions where idempotency_key = p_idem;
  if found then
    if v_r.provider_id <> v_p then raise exception 'forbidden'; end if;
    select * into v_v from vouchers where id = v_r.voucher_id;
    return jsonb_build_object('redemption_id', v_r.id, 'amount_agorot', v_r.amount_agorot, 'balance_agorot', v_v.balance_agorot, 'already', true);
  end if;
  if length(v_code) = 12 then v_code := substr(v_code,1,4) || '-' || substr(v_code,5,4) || '-' || substr(v_code,9,4); end if;
  select * into v_v from vouchers where code = v_code for update;
  if not found then raise exception 'voucher_not_found'; end if;
  if not exists (select 1 from providers where id = v_p and status = 'approved') then raise exception 'provider_not_approved'; end if;
  if v_v.status <> 'active' then raise exception 'voucher_not_active'; end if;
  if v_v.expires_at is not null and v_v.expires_at < now() then raise exception 'voucher_expired'; end if;
  if v_v.scope_category_id is not null and not exists (select 1 from provider_categories where provider_id = v_p and category_id = v_v.scope_category_id) then
    raise exception 'voucher_scope_mismatch';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if p_amount > v_v.balance_agorot then raise exception 'insufficient_balance'; end if;

  v_pct := app.effective_commission_pct(v_p, v_v.scope_category_id);
  v_comm := round(p_amount * v_pct / 100.0);
  v_new := v_v.balance_agorot - p_amount;

  insert into redemptions (voucher_id, provider_id, amount_agorot, commission_pct, commission_agorot, idempotency_key, redeemed_by_user_id, note)
  values (v_v.id, v_p, p_amount, v_pct, v_comm, p_idem, auth.uid(), nullif(btrim(p_note),'')) returning * into v_r;
  update vouchers set balance_agorot = v_new, status = (case when v_new = 0 then 'redeemed' else 'active' end)::voucher_status where id = v_v.id;
  insert into voucher_ledger (voucher_id, entry, amount_agorot, balance_after_agorot, redemption_id, actor_user_id)
  values (v_v.id, 'redeem', -p_amount, v_new, v_r.id, auth.uid());
  perform app.audit('voucher.redeemed', 'voucher', v_v.id,
    jsonb_build_object('balance_agorot', v_v.balance_agorot),
    jsonb_build_object('balance_agorot', v_new, 'redemption_id', v_r.id, 'provider_id', v_p, 'amount_agorot', p_amount, 'commission_agorot', v_comm));
  return jsonb_build_object('redemption_id', v_r.id, 'amount_agorot', p_amount, 'balance_agorot', v_new, 'commission_agorot', v_comm, 'already', false);
end $$;

-- ביטול מימוש (מנהל בלבד)
create or replace function reverse_redemption(p_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_r redemptions%rowtype; v_v vouchers%rowtype; v_new int;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select * into v_r from redemptions where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_r.status = 'reversed' then return jsonb_build_object('already', true); end if;
  select * into v_v from vouchers where id = v_r.voucher_id for update;
  if v_v.status = 'cancelled' then raise exception 'voucher_cancelled'; end if;
  v_new := v_v.balance_agorot + v_r.amount_agorot;
  update redemptions set status = 'reversed', reversed_at = now(), reversal_reason = coalesce(nullif(btrim(p_reason),''), 'reversed by admin') where id = p_id;
  update vouchers set balance_agorot = v_new, status = 'active' where id = v_v.id;
  insert into voucher_ledger (voucher_id, entry, amount_agorot, balance_after_agorot, redemption_id, actor_user_id, note)
  values (v_v.id, 'reverse', v_r.amount_agorot, v_new, p_id, auth.uid(), p_reason);
  perform app.audit('redemption.reversed', 'redemption', p_id, to_jsonb(v_r), jsonb_build_object('reason', p_reason, 'balance_after', v_new));
  return jsonb_build_object('already', false, 'balance_agorot', v_new);
end $$;

-- מימוש הטבה בכרטיס (ספק)
create or replace function lookup_card(p_code text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_p uuid := app.my_provider_id(); v jsonb; v_code text := upper(btrim(coalesce(p_code,'')));
begin
  if v_p is null then raise exception 'not_a_provider'; end if;
  if v_code !~ '^MC-' then v_code := 'MC-' || v_code; end if;
  select jsonb_build_object('card_id', c.id, 'status', c.status, 'wallet_name', w.name_he,
    'benefits', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'title_he', b.title_he, 'terms_he', b.terms_he,
                   'used', (select count(*) from benefit_redemptions br where br.card_id = c.id and br.benefit_id = b.id),
                   'max_per_card', b.max_per_card) order by b.created_at), '[]'::jsonb)
                 from benefits b where b.provider_id = v_p and b.status = 'approved'
                   and (b.valid_from is null or b.valid_from <= current_date) and (b.valid_until is null or b.valid_until >= current_date)))
  into v from benefit_cards c join wallets w on w.id = c.wallet_id where c.card_code = v_code;
  return v;
end $$;

create or replace function redeem_benefit(p_code text, p_benefit uuid, p_idem text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_p uuid := app.my_provider_id(); v_c benefit_cards%rowtype; v_b benefits%rowtype; v_used int; v_id uuid;
        v_code text := upper(btrim(coalesce(p_code,'')));
begin
  if v_p is null then raise exception 'not_a_provider'; end if;
  if p_idem is null or length(p_idem) < 8 then raise exception 'idempotency_key_required'; end if;
  select id into v_id from benefit_redemptions where idempotency_key = p_idem;
  if v_id is not null then return jsonb_build_object('id', v_id, 'already', true); end if;
  if v_code !~ '^MC-' then v_code := 'MC-' || v_code; end if;
  select * into v_c from benefit_cards where card_code = v_code for update;
  if not found or v_c.status <> 'active' then raise exception 'card_not_active'; end if;
  select * into v_b from benefits where id = p_benefit and provider_id = v_p and status = 'approved';
  if not found then raise exception 'benefit_not_available'; end if;
  select count(*) into v_used from benefit_redemptions where card_id = v_c.id and benefit_id = v_b.id;
  if v_b.max_per_card is not null and v_used >= v_b.max_per_card then raise exception 'benefit_limit_reached'; end if;
  insert into benefit_redemptions (card_id, benefit_id, provider_id, redeemed_by_user_id, idempotency_key, note)
  values (v_c.id, v_b.id, v_p, auth.uid(), p_idem, nullif(btrim(p_note),'')) returning id into v_id;
  perform app.audit('benefit.redeemed', 'benefit_card', v_c.id, null, jsonb_build_object('benefit_id', v_b.id, 'provider_id', v_p));
  return jsonb_build_object('id', v_id, 'already', false);
end $$;

-- בקשת הצטרפות ספק (ציבורי)
create or replace function apply_as_provider(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_id uuid; v_cat uuid;
begin
  if coalesce(btrim(p->>'display_name'),'') = '' or coalesce(btrim(p->>'contact_email'),'') = '' or coalesce(btrim(p->>'phone'),'') = '' then
    raise exception 'missing_fields';
  end if;
  insert into providers (display_name, legal_name, business_id, contact_name, contact_email, phone_e164, city, service_area, description_he, applied_message, status)
  values (btrim(p->>'display_name'), nullif(btrim(p->>'legal_name'),''), nullif(btrim(p->>'business_id'),''), nullif(btrim(p->>'contact_name'),''),
          lower(btrim(p->>'contact_email')), app.normalize_phone(p->>'phone'), nullif(btrim(p->>'city'),''), nullif(btrim(p->>'service_area'),''),
          nullif(btrim(p->>'description_he'),''), nullif(btrim(p->>'message'),''), 'applied')
  returning id into v_id;
  for v_cat in select (value)::uuid from jsonb_array_elements_text(coalesce(p->'category_ids','[]'::jsonb)) loop
    insert into provider_categories (provider_id, category_id) values (v_id, v_cat) on conflict do nothing;
  end loop;
  perform app.audit('provider.applied', 'provider', v_id, null, jsonb_build_object('display_name', p->>'display_name'));
  return jsonb_build_object('provider_id', v_id);
end $$;

-- מנהל: סטטוס ספק + שיוך משתמש לפי אימייל
create or replace function admin_review_provider(p_id uuid, p_status provider_status, p_commission numeric default null, p_member_email text default null) returns jsonb
language plpgsql security definer set search_path = public, app, auth as $$
declare v_before providers%rowtype; v_uid uuid; v_email citext := nullif(lower(btrim(p_member_email)),'');
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select * into v_before from providers where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  update providers set status = p_status, commission_pct = coalesce(p_commission, commission_pct),
    approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
    approved_by = case when p_status = 'approved' then coalesce(approved_by, auth.uid()) else approved_by end,
    slug = coalesce(slug, lower(regexp_replace(display_name, '[^a-zA-Z0-9֐-׿]+', '-', 'g')) || '-' || substr(id::text, 1, 6))
  where id = p_id;
  if v_email is not null then
    select id into v_uid from auth.users where email = v_email;
    if v_uid is null then
      insert into auth.users (email) values (v_email) returning id into v_uid;
    end if;
    insert into profiles (id, full_name) values (v_uid, v_before.contact_name) on conflict do nothing;
    insert into provider_members (provider_id, user_id, role) values (p_id, v_uid, 'owner') on conflict do nothing;
    insert into user_roles (user_id, role) values (v_uid, 'provider') on conflict do nothing;
  end if;
  perform app.audit('provider.reviewed', 'provider', p_id, jsonb_build_object('status', v_before.status), jsonb_build_object('status', p_status, 'member_email', v_email));
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_review_service(p_id uuid, p_status offer_status) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_old offer_status;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select status into v_old from provider_services where id = p_id;
  update provider_services set status = p_status where id = p_id;
  perform app.audit('service.reviewed', 'provider_service', p_id, jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));
end $$;

create or replace function admin_review_benefit(p_id uuid, p_status offer_status) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_old offer_status;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select status into v_old from benefits where id = p_id;
  update benefits set status = p_status where id = p_id;
  perform app.audit('benefit.reviewed', 'benefit', p_id, jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));
end $$;

-- מנהל: ביטול שובר (יתרה מתאפסת, נרשם ב-ledger)
create or replace function admin_cancel_voucher(p_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_v vouchers%rowtype;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select * into v_v from vouchers where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_v.status = 'cancelled' then return jsonb_build_object('already', true); end if;
  update vouchers set status = 'cancelled', balance_agorot = 0 where id = p_id;
  insert into voucher_ledger (voucher_id, entry, amount_agorot, balance_after_agorot, actor_user_id, note)
  values (p_id, 'adjust', -v_v.balance_agorot, 0, auth.uid(), 'cancelled: ' || coalesce(p_reason,''));
  perform app.audit('voucher.cancelled', 'voucher', p_id, jsonb_build_object('status', v_v.status, 'balance_agorot', v_v.balance_agorot), jsonb_build_object('reason', p_reason));
  return jsonb_build_object('already', false);
end $$;

-- מנהל: החזר הזמנה (סביבת בדיקה: רישום בלבד) + ביטול השובר
create or replace function admin_refund_order(p_order uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_o orders%rowtype; v_pay payments%rowtype; v_vid uuid; v_balance int;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if v_o.status <> 'paid' then raise exception 'order_not_refundable'; end if;
  select * into v_pay from payments where order_id = p_order and status = 'captured' order by created_at desc limit 1;
  select id, balance_agorot into v_vid, v_balance from vouchers where order_id = p_order;
  if v_vid is not null and v_balance < v_o.amount_agorot then raise exception 'voucher_partially_used'; end if;
  if v_vid is not null then perform admin_cancel_voucher(v_vid, 'refund: ' || coalesce(p_reason,'')); end if;
  update payments set status = 'refunded' where id = v_pay.id;
  update orders set status = 'refunded' where id = p_order;
  insert into refunds (order_id, payment_id, amount_agorot, reason, status, requested_by, approved_by)
  values (p_order, v_pay.id, v_o.total_agorot, coalesce(nullif(btrim(p_reason),''), 'refund'), 'done', auth.uid(), auth.uid());
  perform app.audit('order.refunded', 'order', p_order, jsonb_build_object('status', 'paid'), jsonb_build_object('status', 'refunded', 'reason', p_reason, 'sandbox', true));
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_set_setting(p_key text, p_value text) returns void
language plpgsql security definer set search_path = public, app as $$
declare v_old text;
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  if p_key = 'payments_mode' and p_value <> 'sandbox' then raise exception 'payments_mode_locked'; end if;
  select value into v_old from app_settings where key = p_key;
  update app_settings set value = p_value, updated_at = now() where key = p_key;
  perform app.audit('setting.changed', 'setting', null, jsonb_build_object('key', p_key, 'value', v_old), jsonb_build_object('key', p_key, 'value', p_value));
end $$;

create or replace function admin_upsert_commission_rule(p_provider uuid, p_category uuid, p_pct numeric, p_note text default null) returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if not app.is_admin() then raise exception 'forbidden'; end if;
  insert into commission_rules (provider_id, category_id, pct, note) values (p_provider, p_category, p_pct, p_note)
  on conflict (provider_id, category_id) do update set pct = excluded.pct, note = excluded.note;
  perform app.audit('commission_rule.upserted', 'commission_rule', null, null, jsonb_build_object('provider_id', p_provider, 'category_id', p_category, 'pct', p_pct));
end $$;

create or replace function report_issue(p_kind text, p_text text, p_contact text default null, p_entity_type text default null, p_entity uuid default null) returns uuid
language plpgsql security definer set search_path = public, app as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_text),'') = '' then raise exception 'text_required'; end if;
  insert into issues (reporter_id, kind, text, contact, entity_type, entity_id) values (auth.uid(), p_kind, btrim(p_text), nullif(btrim(p_contact),''), p_entity_type, p_entity) returning id into v_id;
  return v_id;
end $$;

-- ---------- RLS ----------
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table categories enable row level security;
alter table providers enable row level security;
alter table provider_categories enable row level security;
alter table provider_members enable row level security;
alter table commission_rules enable row level security;
alter table provider_services enable row level security;
alter table benefits enable row level security;
alter table wallets enable row level security;
alter table wallet_members enable row level security;
alter table wallet_invites enable row level security;
alter table benefit_cards enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table vouchers enable row level security;
alter table redemptions enable row level security;
alter table voucher_ledger enable row level security;
alter table benefit_redemptions enable row level security;
alter table refunds enable row level security;
alter table settlements enable row level security;
alter table settlement_items enable row level security;
alter table employers enable row level security;
alter table employer_members enable row level security;
alter table issues enable row level security;
alter table audit_log enable row level security;
alter table dev_outbox enable row level security;

-- ציבורי לקריאה
create policy categories_read on categories for select using (true);
create policy providers_public_read on providers for select using (status = 'approved' or app.is_provider_member(id) or app.is_admin());
create policy provider_categories_read on provider_categories for select using (true);
create policy services_read on provider_services for select using (status = 'approved' or app.is_provider_member(provider_id) or app.is_admin());
create policy benefits_read on benefits for select using (status = 'approved' or app.is_provider_member(provider_id) or app.is_admin());
create policy settings_read on app_settings for select using (true);

-- פרופילים ותפקידים
create policy profiles_self on profiles for select using (id = auth.uid() or app.is_admin()
  or exists (select 1 from wallet_members a join wallet_members b on a.wallet_id = b.wallet_id where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy user_roles_self on user_roles for select using (user_id = auth.uid() or app.is_admin());

-- ספק: עריכה עצמית
create policy provider_members_read on provider_members for select using (user_id = auth.uid() or app.is_provider_member(provider_id) or app.is_admin());
create policy providers_self_update on providers for update using (app.is_provider_member(id)) with check (app.is_provider_member(id) and status = (select status from providers p2 where p2.id = providers.id));
create policy services_self_write on provider_services for insert with check (app.is_provider_member(provider_id) and status in ('draft','pending_review'));
create policy services_self_update on provider_services for update using (app.is_provider_member(provider_id)) with check (app.is_provider_member(provider_id));
create policy services_self_delete on provider_services for delete using (app.is_provider_member(provider_id));
create policy benefits_self_write on benefits for insert with check (app.is_provider_member(provider_id) and status in ('draft','pending_review'));
create policy benefits_self_update on benefits for update using (app.is_provider_member(provider_id)) with check (app.is_provider_member(provider_id));
create policy benefits_self_delete on benefits for delete using (app.is_provider_member(provider_id));
create policy provider_categories_self on provider_categories for all using (app.is_provider_member(provider_id)) with check (app.is_provider_member(provider_id));
create policy commission_rules_read on commission_rules for select using (app.is_admin() or (provider_id is not null and app.is_provider_member(provider_id)));

-- ארנק
create policy wallets_member_read on wallets for select using (app.is_wallet_member(id) or app.is_admin());
create policy wallet_members_read on wallet_members for select using (app.is_wallet_member(wallet_id) or app.is_admin());
create policy wallet_invites_read on wallet_invites for select using (app.is_wallet_member(wallet_id) or app.is_admin());
create policy benefit_cards_read on benefit_cards for select using (app.is_wallet_member(wallet_id) or app.is_admin());
create policy vouchers_read on vouchers for select using ((wallet_id is not null and app.is_wallet_member(wallet_id)) or app.is_admin());
create policy ledger_read on voucher_ledger for select using (app.is_admin() or exists (select 1 from vouchers v where v.id = voucher_ledger.voucher_id and v.wallet_id is not null and app.is_wallet_member(v.wallet_id)));
create policy redemptions_read on redemptions for select using (app.is_admin() or app.is_provider_member(provider_id)
  or exists (select 1 from vouchers v where v.id = redemptions.voucher_id and v.wallet_id is not null and app.is_wallet_member(v.wallet_id)));
create policy benefit_redemptions_read on benefit_redemptions for select using (app.is_admin() or app.is_provider_member(provider_id)
  or exists (select 1 from benefit_cards c where c.id = benefit_redemptions.card_id and app.is_wallet_member(c.wallet_id)));

-- הזמנות ותשלומים: קונה מחובר או מנהל (אורח רק דרך get_buyer_order)
create policy orders_read on orders for select using ((buyer_user_id is not null and buyer_user_id = auth.uid()) or app.is_admin());
create policy payments_read on payments for select using (app.is_admin());
create policy refunds_read on refunds for select using (app.is_admin());
create policy settlements_read on settlements for select using (app.is_admin() or app.is_provider_member(provider_id));
create policy settlement_items_read on settlement_items for select using (app.is_admin() or exists (select 1 from settlements s where s.id = settlement_items.settlement_id and app.is_provider_member(s.provider_id)));
create policy employers_admin on employers for select using (app.is_admin());
create policy employer_members_admin on employer_members for select using (app.is_admin());
create policy issues_read on issues for select using (app.is_admin() or reporter_id = auth.uid());
create policy issues_admin_update on issues for update using (app.is_admin()) with check (app.is_admin());
create policy audit_admin on audit_log for select using (app.is_admin());
-- dev_outbox: אין מדיניות — service_role בלבד (שכבת השרת בסביבת בדיקה)

-- ---------- הרשאות ----------
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on provider_services, benefits, provider_categories to authenticated;
grant update on providers, profiles, issues to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke all on function app.issue_voucher(uuid) from public;
grant execute on function create_gift_order(jsonb), sandbox_pay(uuid, text, text), get_buyer_order(uuid, text), peek_claim(text), apply_as_provider(jsonb), report_issue(text, text, text, text, uuid) to anon, authenticated;
grant execute on function claim_voucher(text, text), create_wallet_invite(uuid, text), accept_wallet_invite(text), remove_wallet_member(uuid, uuid),
  lookup_voucher(text), redeem_voucher(text, int, text, text), lookup_card(text), redeem_benefit(text, uuid, text, text),
  reverse_redemption(uuid, text), admin_review_provider(uuid, provider_status, numeric, text), admin_review_service(uuid, offer_status),
  admin_review_benefit(uuid, offer_status), admin_cancel_voucher(uuid, text), admin_refund_order(uuid, text), admin_set_setting(text, text),
  admin_upsert_commission_rule(uuid, uuid, numeric, text) to authenticated;
grant execute on all functions in schema app to anon, authenticated, service_role;
revoke execute on function app.issue_voucher(uuid) from anon, authenticated;
