create table public.mualem_change_requests (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.mualem_workspaces(id),
 project_id uuid not null references public.mualem_projects(id),
 created_by uuid not null references auth.users(id),
 title text not null check (length(trim(title)) between 3 and 160),
 details text not null default '' check (length(details)<=5000),
 area text not null check (area in ('website','marketing','finance','crm','automation','other')),
 status text not null default 'draft' check (status in ('draft','queued','in_progress','review','done','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index mualem_changes_workspace_project_idx on public.mualem_change_requests(workspace_id,project_id,created_at desc);
alter table public.mualem_change_requests enable row level security;
create policy mualem_changes_owner_select on public.mualem_change_requests for select to authenticated using (
 exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy mualem_changes_owner_insert on public.mualem_change_requests for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.mualem_projects p join public.mualem_workspaces w on w.id=p.workspace_id where p.id=project_id and p.workspace_id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy mualem_changes_owner_update on public.mualem_change_requests for update to authenticated using (
 created_by=(select auth.uid()) and exists(select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())))
 with check (created_by=(select auth.uid()) and exists(select 1 from public.mualem_projects p join public.mualem_workspaces w on w.id=p.workspace_id where p.id=project_id and p.workspace_id=workspace_id and w.owner_user_id=(select auth.uid())));
