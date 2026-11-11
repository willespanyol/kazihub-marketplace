-- Database-side authorization for profiles and manual payments.
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
       and old.payment_status = 'paid' and old.payout_status = 'available'
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

CREATE OR REPLACE FUNCTION public.kazihub_guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if auth.uid() <> old.id then raise exception 'Not permitted to update another profile'; end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.is_verified is distinct from old.is_verified
     or new.verification_required is distinct from old.verification_required
     or new.account_status is distinct from old.account_status
     or new.suspended_reason is distinct from old.suspended_reason
     or new.suspended_at is distinct from old.suspended_at
     or new.suspended_by is distinct from old.suspended_by
  then raise exception 'Account role, verification and suspension fields are administrator-controlled'; end if;
  return new;
end; $function$
;

drop trigger if exists kazihub_guard_profile_update on public.profiles;
create trigger kazihub_guard_profile_update before update on public.profiles for each row execute function public.kazihub_guard_profile_update();
drop trigger if exists kazihub_guard_order_payment on public.orders;
create trigger kazihub_guard_order_payment before insert or update on public.orders for each row execute function public.kazihub_guard_order_payment();
