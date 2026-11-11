-- Transactional custom offers, matured payouts, and private media ownership.
create unique index if not exists orders_one_per_custom_offer_idx on public.orders(custom_offer_id) where custom_offer_id is not null;

CREATE OR REPLACE FUNCTION public.accept_custom_offer_order(p_offer_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_offer public.custom_offers%rowtype;
  v_request public.project_requests%rowtype;
  v_order uuid;
  v_fee numeric;
begin
  if v_user is null then raise exception 'Login required'; end if;

  select * into v_offer from public.custom_offers where id=p_offer_id for update;
  if not found then raise exception 'Offer not found'; end if;
  if v_offer.buyer_id <> v_user then raise exception 'Only the buyer can accept the offer'; end if;
  if v_offer.status <> 'submitted' then raise exception 'Offer is no longer available'; end if;

  select * into v_request from public.project_requests where id=v_offer.project_request_id for update;
  if not found or v_request.buyer_id <> v_user or v_request.status <> 'open' then
    raise exception 'Project request is not open';
  end if;
  if v_offer.seller_id = v_user or v_offer.price <= 0 or v_offer.delivery_days < 1 then
    raise exception 'Invalid seller or offer terms';
  end if;
  if not exists (select 1 from public.profiles where id=v_user and role='buyer' and account_status='active') then
    raise exception 'Only active buyer accounts may accept offers';
  end if;
  if not exists (select 1 from public.profiles where id=v_offer.seller_id and role='seller' and account_status='active') then
    raise exception 'Seller account is not active';
  end if;
  v_fee := round(v_offer.price * 0.20,2);
  insert into public.orders (
    buyer_id,seller_id,source,custom_offer_id,project_request_id,
    title,description,price,currency,platform_fee,seller_payout,
    delivery_days,revisions,status,payment_status,payment_method,payout_status
  ) values (
    v_user,v_offer.seller_id,'custom_offer',v_offer.id,v_request.id,
    v_request.title,v_offer.message,v_offer.price,v_offer.currency,v_fee,v_offer.price-v_fee,
    v_offer.delivery_days,v_offer.revisions,'payment_pending','unpaid','Remitly to M-Pesa','not_available'
  ) returning id into v_order;
  update public.custom_offers set status='accepted',updated_at=now() where id=v_offer.id;
  update public.project_requests set status='assigned',updated_at=now() where id=v_request.id;
  update public.custom_offers set status='rejected',updated_at=now()
    where project_request_id=v_request.id and id<>v_offer.id and status='submitted';
  return v_order;
end; $function$
;

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

revoke all on function public.accept_custom_offer_order(uuid) from public, anon;
grant execute on function public.accept_custom_offer_order(uuid) to authenticated;

drop policy if exists "Authenticated users can upload profile images" on storage.objects;
drop policy if exists "Authenticated users can update profile images" on storage.objects;
drop policy if exists "Authenticated users can upload service media" on storage.objects;
drop policy if exists "Authenticated users can update service media" on storage.objects;
drop policy if exists "Authenticated users can delete service media" on storage.objects;
create policy "Owners can upload service media" on storage.objects for insert to authenticated with check (bucket_id='service-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners can update service media" on storage.objects for update to authenticated using (bucket_id='service-media' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='service-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners can delete service media" on storage.objects for delete to authenticated using (bucket_id='service-media' and (storage.foldername(name))[1]=auth.uid()::text);
