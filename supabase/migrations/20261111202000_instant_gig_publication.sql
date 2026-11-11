-- Seller gigs stay in draft while mandatory attachments and tiers are saved.
-- Complete gigs publish automatically; no administrator approval is required.

CREATE OR REPLACE FUNCTION public.kazihub_guard_service_offer_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare package_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'Seller ownership cannot be changed';
    end if;
  end if;
  if new.status = 'approved' then
    if nullif(btrim(new.title),'') is null
       or nullif(btrim(new.category),'') is null
       or nullif(btrim(new.description),'') is null
       or nullif(btrim(coalesce(new.image_url,'')),'') is null
       or new.basic_price is null or new.basic_price < 5
       or new.delivery_days is null or new.delivery_days < 1 then
      raise exception 'Complete the gig title, category, description, cover photo, price and delivery time before publishing';
    end if;
    select count(distinct tier) into package_count
      from public.service_offer_packages
      where service_offer_id=new.id
        and tier in ('basic','standard','premium')
        and nullif(btrim(title),'') is not null
        and nullif(btrim(description),'') is not null
        and price >= 5 and delivery_days >= 1
        and revisions >= 0;
    if package_count <> 3 then
      raise exception 'All three complete service packages are required before publishing';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_service_offer_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare seller_offer_count integer; account_role public.user_role;
begin
  if auth.uid() is not null and new.seller_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Cannot create a gig for another seller';
  end if;
  select role into account_role from public.profiles where id=new.seller_id;
  if account_role is distinct from 'seller' then
    raise exception 'Only seller accounts can create service offers';
  end if;
  select count(*) into seller_offer_count from public.service_offers where seller_id=new.seller_id;
  if seller_offer_count >= 10 then
    raise exception 'Sellers can create a maximum of 10 service offers';
  end if;
  -- Temporary unpublished state while mandatory package/media rows are saved.
  -- No administrator approval is required.
  new.status := 'draft';
  new.updated_at := now();
  return new;
end; $function$
;

