-- Preserve buyer/seller roles through signup while preventing signup as admin.
-- Require admin approval for gig publication.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),
             nullif(new.raw_user_meta_data ->> 'name',''), new.email),
    case when new.raw_user_meta_data ->> 'role' = 'seller'
         then 'seller'::public.user_role
         else 'buyer'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
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
  if new.role is distinct from old.role then
     if not (old.role = 'buyer' and new.role = 'seller'
       and old.profile_completed is not true
       and not exists (select 1 from public.orders where buyer_id = old.id or seller_id = old.id)
       and not exists (select 1 from public.project_requests where buyer_id = old.id)
       and not exists (select 1 from public.service_offers where seller_id = old.id))
     then raise exception 'Account role changes are restricted'; end if;
  end if;
  if new.id is distinct from old.id
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

CREATE OR REPLACE FUNCTION public.kazihub_guard_service_offer_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'Seller ownership cannot be changed';
    end if;
    if new.status = 'approved' and old.status <> 'approved' then
      raise exception 'Only administrators may approve service offers';
    end if;
  end if;
  return new;
end; $function$
;


drop trigger if exists kazihub_guard_service_offer_approval on public.service_offers;
create trigger kazihub_guard_service_offer_approval before update on public.service_offers for each row execute function public.kazihub_guard_service_offer_approval();
