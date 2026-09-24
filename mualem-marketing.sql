create table public.mualem_marketing_plans (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.mualem_workspaces(id),
 project_id uuid references public.mualem_projects(id),
 created_by uuid not null references auth.users(id),
 channel text not null check (channel in ('google_ads','facebook_instagram','seo','other')),
 title text not null check (length(trim(title)) between 3 and 160),
 objective text not null default '',
 budget_ils numeric(12,2) check (budget_ils is null or budget_ils >= 0),
 stage text not null default 'draft' check (stage in ('draft','review','ready','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index mualem_marketing_workspace_idx on public.mualem_marketing_plans(workspace_id,created_at desc);
alter table public.mualem_marketing_plans enable row level security;
create policy mualem_marketing_owner_select on public.mualem_marketing_plans for select to authenticated using (
 exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy mualem_marketing_owner_insert on public.mualem_marketing_plans for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid()))
 and (project_id is null or exists(select 1 from public.mualem_projects p where p.id=project_id and p.workspace_id=workspace_id)));
create policy mualem_marketing_owner_update on public.mualem_marketing_plans for update to authenticated using (
 created_by=(select auth.uid()) and exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())))
 with check (created_by=(select auth.uid()) and exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid()))
 and (project_id is null or exists(select 1 from public.mualem_projects p where p.id=project_id and p.workspace_id=workspace_id)));
