-- Permit the narrowly scoped nested seller-verification update after a first order.
CREATE OR REPLACE FUNCTION public.kazihub_guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  -- An order-insert trigger flags the seller for verification after their first
  -- order. Allow only this exact nested system transition, never user edits.
  if pg_trigger_depth() > 1
     and old.verification_required is distinct from true
     and new.verification_required is true
     and row(new.id,new.role,new.is_verified,new.account_status,new.suspended_reason,new.suspended_at,new.suspended_by)
       is not distinct from
       row(old.id,old.role,old.is_verified,old.account_status,old.suspended_reason,old.suspended_at,old.suspended_by)
  then return new; end if;
  if auth.uid() <> old.id then raise exception 'Not permitted to update another profile'; end if;
  if new.role is distinct from old.role then
    if not (old.role='buyer' and new.role='seller'
        and old.profile_completed is not true
        and not exists (select 1 from public.orders where buyer_id=old.id or seller_id=old.id)
        and not exists (select 1 from public.project_requests where buyer_id=old.id)
        and not exists (select 1 from public.service_offers where seller_id=old.id))
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
