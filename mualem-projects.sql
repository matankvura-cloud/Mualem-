-- Project management for the three sites and two operational systems.
-- No historical client, case or order records are copied.
create table public.mualem_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  kind text not null check (kind in ('website','system')),
  name text not null,
  public_url text,
  stage text not null default 'mapping' check (stage in ('mapping','building','active','paused')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique(workspace_id,slug)
);
create index mualem_projects_workspace_idx on public.mualem_projects(workspace_id,kind);
create table public.mualem_project_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  project_id uuid not null references public.mualem_projects(id),
  created_by uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 3 and 200),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mualem_project_tasks_project_status_idx on public.mualem_project_tasks(project_id,status,created_at desc);
alter table public.mualem_projects enable row level security;
alter table public.mualem_project_tasks enable row level security;
create policy mualem_projects_owner_select on public.mualem_projects for select to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy mualem_projects_owner_update on public.mualem_projects for update to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))
  with check (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy mualem_tasks_owner_select on public.mualem_project_tasks for select to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy mualem_tasks_owner_insert on public.mualem_project_tasks for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.mualem_projects p join public.mualem_workspaces w on w.id = p.workspace_id
    where p.id = project_id and p.workspace_id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
create policy mualem_tasks_owner_update on public.mualem_project_tasks for update to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())))
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.mualem_projects p join public.mualem_workspaces w on w.id = p.workspace_id
    where p.id = project_id and p.workspace_id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
