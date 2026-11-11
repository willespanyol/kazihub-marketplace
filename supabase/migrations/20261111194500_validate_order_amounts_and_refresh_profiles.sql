-- Check service package/offer amount on buyer orders and lock verified payment references.
CREATE OR REPLACE FUNCTION public.kazihub_guard_order_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare actor uuid := auth.uid(); administrator boolean;
begin
  if actor is null then return new; end if;
  administrator := public.is_admin();
  if administrator then return new; end if;
  if tg_op = 'INSERT' then
    if new.buyer_id is distinct from actor
       or new.status::text <> 'payment_pending'
       or new.payment_status is distinct from 'unpaid'
       or new.paid_at is not null
       or new.payment_verified_at is not null
       or new.payout_paid_at is not null
       or new.price is null or new.price <= 0
       or new.platform_fee is distinct from round(new.price * 0.20, 2)
       or new.seller_payout is distinct from (new.price - round(new.price * 0.20, 2))
    then raise exception 'Invalid order creation or manual payment status'; end if;
    if new.source = 'service_offer' then
      if new.service_offer_id is null or not exists (
        select 1 from public.service_offers so
        join public.service_offer_packages pkg on pkg.service_offer_id=so.id
        where so.id=new.service_offer_id
          and so.seller_id=new.seller_id and so.status='approved'
          and pkg.price=new.price and pkg.currency=new.currency
          and pkg.delivery_days=new.delivery_days and pkg.revisions=new.revisions
      ) then raise exception 'Order package or price does not match an approved gig'; end if;
    elsif new.source = 'custom_offer' then
      if new.custom_offer_id is null or not exists (
        select 1 from public.custom_offers co
        where co.id=new.custom_offer_id
          and co.buyer_id=new.buyer_id and co.seller_id=new.seller_id
          and co.project_request_id=new.project_request_id
          and co.status='submitted' and co.price=new.price
          and co.currency=new.currency and co.delivery_days=new.delivery_days
          and co.revisions=new.revisions
      ) then raise exception 'Order does not match a submitted custom offer'; end if;
    else raise exception 'Unsupported order source';
    end if;
    return new;
  end if;
  if actor <> old.buyer_id and actor <> old.seller_id then
    raise exception 'Not an order participant';
  end if;
  if row(new.id, new.buyer_id, new.seller_id, new.source, new.service_offer_id,
         new.custom_offer_id, new.project_request_id, new.title, new.description,
         new.price, new.currency, new.platform_fee, new.seller_payout,
         new.delivery_days, new.revisions, new.created_at,
         new.stripe_checkout_session_id, new.stripe_payment_intent_id)
     is distinct from
     row(old.id, old.buyer_id, old.seller_id, old.source, old.service_offer_id,
         old.custom_offer_id, old.project_request_id, old.title, old.description,
         old.price, old.currency, old.platform_fee, old.seller_payout,
         old.delivery_days, old.revisions, old.created_at,
         old.stripe_checkout_session_id, old.stripe_payment_intent_id)
  then raise exception 'Order amounts, parties and financial terms cannot be modified'; end if;
  if old.payment_status='paid'
     and row(new.payment_method,new.manual_payment_reference,new.manual_payment_note)
     is distinct from row(old.payment_method,old.manual_payment_reference,old.manual_payment_note)
  then raise exception 'Verified payment references cannot be changed'; end if;
  if new.paid_at is distinct from old.paid_at
     or new.payment_verified_at is distinct from old.payment_verified_at
     or new.payout_paid_at is distinct from old.payout_paid_at
     or new.payout_reference is distinct from old.payout_reference
     or new.payout_rejection_reason is distinct from old.payout_rejection_reason
  then raise exception 'Only administrators can verify payments or mark payouts paid'; end if;
  if new.payment_status is distinct from old.payment_status then
    if actor <> old.buyer_id
       or old.status::text <> 'payment_pending'
       or old.payment_status not in ('unpaid','payment_rejected')
       or new.payment_status <> 'payment_submitted'
    then raise exception 'Only the buyer may submit a pending manual payment reference'; end if;
    if length(trim(coalesce(new.manual_payment_reference,''))) = 0 then
      raise exception 'A payment reference is required';
    end if;
  end if;
  if new.status::text <> 'payment_pending' and new.payment_status <> 'paid' then
     raise exception 'Work may not start before manual payment verification';
  end if;
  if new.payment_status <> 'paid' and new.payout_status in ('available','requested','paid') then
     raise exception 'Payout not permitted before payment verification';
  end if;
  if new.payout_status is distinct from old.payout_status then
    if actor = old.buyer_id and old.status::text = 'delivered'
       and new.status::text = 'completed' and old.payment_status = 'paid'
       and new.payout_status = 'waiting_period' then
      new.completed_at := now();
      new.payout_available_at := now() + interval '7 days';
    elsif actor = old.seller_id and old.status::text in ('active','in_progress','revision_requested')
       and new.status::text = 'delivered' and new.payout_status = 'not_available' then
      new.payout_available_at := null;
    elsif actor = old.seller_id and old.status::text = 'completed'
       and old.payment_status = 'paid' and old.payout_status in ('available','waiting_period')
       and old.payout_available_at <= now() and new.payout_status = 'requested' then
      new.payout_requested_at := now();
    else
      raise exception 'Payout status change not allowed for this order state';
    end if;
  elsif new.payout_available_at is distinct from old.payout_available_at then
    raise exception 'Payout release date is system-controlled';
  end if;
  return new;
end; $function$
;
