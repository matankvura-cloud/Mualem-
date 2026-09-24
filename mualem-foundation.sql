-- MUALEM foundation, draft for a new, empty Supabase project only.
-- Do not run against tlm-family-crm, tlm-ops-eu, or any legacy project.
-- No customers, families, cases, orders or financial balances are seeded.

create extension if not exists pgcrypto with schema extensions;

create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  display_name text not null check (length(trim(display_name)) > 0),
  registration_number text,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  legal_entity_id uuid not null references public.legal_entities(id),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  created_at timestamptz not null default now()
);
create index brands_entity_idx on public.brands(legal_entity_id);

create table public.business_members (
  legal_entity_id uuid not null references public.legal_entities(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','operations','accountant','staff')),
  created_at timestamptz not null default now(),
  primary key (legal_entity_id,user_id)
);
create index business_members_user_idx on public.business_members(user_id,legal_entity_id);

create table public.source_connections (
  id uuid primary key default gen_random_uuid(),
  legal_entity_id uuid not null references public.legal_entities(id),
  brand_id uuid references public.brands(id),
  source_type text not null check (source_type in ('morning','grow','bank','card','internal')),
  label text not null,
  state text not null default 'planned' check (state in ('planned','verification','connected','stale','disabled')),
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  constraint source_connection_success_requires_connection check (last_success_at is null or state <> 'planned')
);
create index source_connections_entity_idx on public.source_connections(legal_entity_id);

create table public.source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_connection_id uuid not null references public.source_connections(id),
  status text not null check (status in ('started','succeeded','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  record_count integer not null default 0 check (record_count >= 0),
  error_code text
);
create index source_sync_runs_connection_started_idx on public.source_sync_runs(source_connection_id,started_at desc);

-- Internal, business-only audit events. No raw API payloads or secrets.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  legal_entity_id uuid not null references public.legal_entities(id),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  occurred_at timestamptz not null default now()
);
create index audit_events_entity_time_idx on public.audit_events(legal_entity_id,occurred_at desc);

alter table public.legal_entities enable row level security;
alter table public.brands enable row level security;
alter table public.business_members enable row level security;
alter table public.source_connections enable row level security;
alter table public.source_sync_runs enable row level security;
alter table public.audit_events enable row level security;

-- Start with owner-only read access. Invite and role workflows are a separate,
-- reviewed migration; authenticated users do not gain access merely by signing in.
create policy legal_entities_owner_read on public.legal_entities for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy brands_owner_read on public.brands for select to authenticated
  using (exists (select 1 from public.legal_entities e where e.id = legal_entity_id and e.owner_user_id = (select auth.uid())));
create policy members_owner_read on public.business_members for select to authenticated
  using (exists (select 1 from public.legal_entities e where e.id = legal_entity_id and e.owner_user_id = (select auth.uid())));
create policy connections_owner_read on public.source_connections for select to authenticated
  using (exists (select 1 from public.legal_entities e where e.id = legal_entity_id and e.owner_user_id = (select auth.uid())));
create policy runs_owner_read on public.source_sync_runs for select to authenticated
  using (exists (select 1 from public.source_connections c join public.legal_entities e on e.id = c.legal_entity_id where c.id = source_connection_id and e.owner_user_id = (select auth.uid())));
create policy audit_owner_read on public.audit_events for select to authenticated
  using (exists (select 1 from public.legal_entities e where e.id = legal_entity_id and e.owner_user_id = (select auth.uid())));

-- No INSERT/UPDATE/DELETE policy for browser clients. Administrative writes
-- require a separately implemented, authenticated server endpoint and audit.
-- Household data is intentionally absent and will live in its own boundary.
