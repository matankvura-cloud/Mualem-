-- Manual cashflow follow-up only. Not a tax ledger or an invoice.
create table public.mualem_finance_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mualem_workspaces(id),
  created_by uuid not null references auth.users(id),
  direction text not null check (direction in ('payable','receivable')),
  title text not null check (length(trim(title)) between 2 and 180),
  amount_ils numeric(14,2) not null check (amount_ils > 0),
  due_on date,
  state text not null default 'expected' check (state in ('expected','settled')),
  source_type text not null default 'manual' check (source_type in ('manual')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint settlement_consistency check ((state = 'expected' and settled_at is null) or (state = 'settled' and settled_at is not null))
);
create index mualem_finance_workspace_due_idx on public.mualem_finance_items(workspace_id,state,due_on);
alter table public.mualem_finance_items enable row level security;
create policy mualem_finance_owner_read on public.mualem_finance_items for select to authenticated
  using (exists (select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy mualem_finance_owner_insert on public.mualem_finance_items for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.mualem_workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())
  ));
-- Settlement/editing requires a later audited workflow; browser has no update/delete policy.
