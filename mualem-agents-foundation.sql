-- Six agent roles and source-attributed knowledge in the new MUALEM area.
-- No legacy customers, cases, transactions or raw secret values.
create table public.mualem_agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  slug text not null check (slug in ('manager','finance','automations','crm','websites','marketing')),
  display_name text not null,
  mandate text not null,
  state text not null default 'configured' check (state in ('configured','connected','paused')),
  created_at timestamptz not null default now(),
  unique(workspace_id,slug)
);
create index mualem_agents_workspace_idx on public.mualem_agents(workspace_id);

create table public.mualem_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  agent_slug text not null check (agent_slug in ('manager','finance','automations','crm','websites','marketing')),
  statement text not null check (length(trim(statement)) > 0),
  source_type text not null check (source_type in ('user_confirmed','system_verified','external_verified')),
  source_label text not null,
  observed_on date not null,
  review_state text not null default 'current' check (review_state in ('current','needs_review','retired')),
  created_at timestamptz not null default now(),
  unique(workspace_id,agent_slug,statement)
);
create index mualem_facts_workspace_agent_idx on public.mualem_facts(workspace_id,agent_slug,review_state);

alter table public.mualem_agents enable row level security;
alter table public.mualem_facts enable row level security;
create policy mualem_agents_owner_read on public.mualem_agents for select to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy mualem_facts_owner_read on public.mualem_facts for select to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
-- Changes require a reviewed, server-side workflow. No browser write policy.
