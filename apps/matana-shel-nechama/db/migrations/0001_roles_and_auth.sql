-- 0001 — תפקידי חיבור, סכמת auth תואמת-Supabase, פונקציות auth.uid()/auth.role()
-- רץ פעם אחת ע"י בעל המסד (postgres). האפליקציה מתחברת כ-matana_app בלבד.

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'matana_app') then
    create role matana_app login nobypassrls noinherit password 'matana_app_local_dev';
  end if;
end $$;

grant anon, authenticated, service_role to matana_app;

-- ---------- auth schema (תואם לשמות של Supabase, מצומצם) ----------
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              citext unique,
  phone              text unique,                    -- E.164
  email_verified_at  timestamptz,
  phone_verified_at  timestamptz,
  last_sign_in_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint users_has_identifier check (email is not null or phone is not null)
);

create table if not exists auth.otp_codes (
  id            uuid primary key default gen_random_uuid(),
  identifier    text not null,                       -- אימייל (lowercase) או טלפון E.164
  channel       text not null check (channel in ('email','sms')),
  code_hash     text not null,                       -- 6 ספרות, sha256
  link_hash     text,                                -- טוקן קישור קסם, sha256 (אימייל בלבד)
  purpose       text not null default 'login',
  next_path     text,
  expires_at    timestamptz not null,
  attempts      int not null default 0,
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists otp_codes_identifier_idx on auth.otp_codes (identifier, created_at desc);

create table if not exists auth.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists sessions_user_idx on auth.sessions (user_id);

alter table auth.users enable row level security;
alter table auth.otp_codes enable row level security;
alter table auth.sessions enable row level security;
-- אין מדיניות: רק service_role (bypassrls) ניגש לטבלאות אלו, דרך שכבת האימות בשרת.
grant select, insert, update, delete on all tables in schema auth to service_role;

-- ---------- פונקציות זהות (אותה חתימה כמו Supabase) ----------
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  ), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- סכמת public: הרשאות בסיס
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
