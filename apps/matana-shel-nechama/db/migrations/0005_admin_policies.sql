-- מנהל: עריכה ישירה של קטלוג וספקים; הגנה על שדות ספק שרק מנהל משנה
create or replace function app.providers_guard() returns trigger language plpgsql as $$
begin
  if not app.is_admin() and (old.status, old.commission_pct, old.is_demo, old.slug, old.approved_at, old.approved_by)
     is distinct from (new.status, new.commission_pct, new.is_demo, new.slug, new.approved_at, new.approved_by) then
    raise exception 'forbidden';
  end if;
  return new;
end $$;
create trigger providers_guard before update on providers for each row execute function app.providers_guard();

drop policy providers_self_update on providers;
create policy providers_self_update on providers for update using (app.is_provider_member(id) or app.is_admin()) with check (app.is_provider_member(id) or app.is_admin());
create policy services_admin_all on provider_services for all using (app.is_admin()) with check (app.is_admin());
create policy benefits_admin_all on benefits for all using (app.is_admin()) with check (app.is_admin());
create policy provider_categories_admin_all on provider_categories for all using (app.is_admin()) with check (app.is_admin());
create policy categories_admin_write on categories for all using (app.is_admin()) with check (app.is_admin());
grant insert, update, delete on categories to authenticated;

-- סיכומי התחשבנות לספק (חודשי), דרך RLS של redemptions
create or replace view provider_monthly_settlement as
  select r.provider_id, date_trunc('month', r.created_at)::date as month,
         count(*) filter (where r.status = 'approved') as redemptions,
         coalesce(sum(r.amount_agorot) filter (where r.status = 'approved'), 0)::int as gross_agorot,
         coalesce(sum(r.commission_agorot) filter (where r.status = 'approved'), 0)::int as commission_agorot,
         (coalesce(sum(r.amount_agorot) filter (where r.status = 'approved'), 0) - coalesce(sum(r.commission_agorot) filter (where r.status = 'approved'), 0))::int as net_agorot
  from redemptions r group by r.provider_id, date_trunc('month', r.created_at);
alter view provider_monthly_settlement set (security_invoker = true);
grant select on provider_monthly_settlement to authenticated;
