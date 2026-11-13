-- חידוש קישור קבלה ע"י נותן המתנה (רק כל עוד השובר לא נתבע). הטוקן הקודם מתבטל.
create or replace function regenerate_claim_token(p_order uuid, p_access_token text) returns jsonb
language plpgsql security definer set search_path = public, app as $$
declare v_o orders%rowtype; v_v vouchers%rowtype; v_claim text;
begin
  select * into v_o from orders where id = p_order and access_token_hash = app.hash(coalesce(p_access_token,'')) for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_v from vouchers where order_id = p_order for update;
  if not found then raise exception 'voucher_not_found'; end if;
  if v_v.status <> 'pending' or v_v.wallet_id is not null then raise exception 'voucher_not_claimable'; end if;
  v_claim := app.gen_token();
  update vouchers set claim_token_hash = app.hash(v_claim) where id = v_v.id;
  perform app.audit('voucher.claim_token_regenerated', 'voucher', v_v.id, null, null);
  return jsonb_build_object('claim_token', v_claim);
end $$;
grant execute on function regenerate_claim_token(uuid, text) to anon, authenticated;
