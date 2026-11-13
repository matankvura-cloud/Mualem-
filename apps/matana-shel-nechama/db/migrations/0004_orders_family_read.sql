-- בני המשפחה רואים את פרטי ההזמנה (שם הנותן, הקדשה) של שוברים שבארנק שלהם
create policy orders_family_read on orders for select using (
  exists (select 1 from vouchers v where v.order_id = orders.id and v.wallet_id is not null and app.is_wallet_member(v.wallet_id))
);
