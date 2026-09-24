-- New empty MUALEM area inside the existing tlm-family-crm project.
-- No legacy data is copied; existing tables and policies are untouched.

create table public.mualem_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id),
  legal_name text not null check (length(trim(legal_name)) > 0),
  created_at timestamptz not null default now()
);
create table public.mualem_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index mualem_brands_workspace_idx on public.mualem_brands(workspace_id);

create table public.mualem_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  kind text not null check (kind in ('morning','grow','bank','card','internal')),
  label text not null,
  state text not null default 'planned' check (state in ('planned','verification','connected','stale','disabled')),
  last_success_at timestamptz,
  created_at timestamptz not null default now()
);
create index mualem_connections_workspace_idx on public.mualem_connections(workspace_id);

alter table public.mualem_workspaces enable row level security;
alter table public.mualem_brands enable row level security;
alter table public.mualem_connections enable row level security;

create policy mualem_workspace_owner_select on public.mualem_workspaces
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy mualem_workspace_owner_insert on public.mualem_workspaces
  for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy mualem_workspace_owner_update on public.mualem_workspaces
  for update to authenticated using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy mualem_brand_owner_select on public.mualem_brands
  for select to authenticated using (exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
create policy mualem_brand_owner_insert on public.mualem_brands
  for insert to authenticated with check (exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
create policy mualem_brand_owner_update on public.mualem_brands
  for update to authenticated using (exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  ));

create policy mualem_connection_owner_select on public.mualem_connections
  for select to authenticated using (exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
-- Connection status is written by the future server integration only.
-- No browser INSERT/UPDATE/DELETE policy for mualem_connections.
