-- Owner-only project creation and reversible archival; no legacy case data touched.
alter table public.mualem_projects drop constraint if exists mualem_projects_stage_check;
alter table public.mualem_projects add constraint mualem_projects_stage_check check (stage in ('mapping','building','active','paused','archived'));
create policy mualem_projects_owner_insert on public.mualem_projects for insert to authenticated
 with check (exists (select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy mualem_tasks_owner_delete on public.mualem_project_tasks for delete to authenticated
 using (created_by=(select auth.uid()) and exists (select 1 from public.mualem_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
update public.mualem_projects set stage='paused',updated_at=now() where slug='avelut-system' and stage<>'paused';
