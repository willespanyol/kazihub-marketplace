-- Allow sellers to edit approved gigs only when the revised offer returns to moderation.
-- Keep related FAQs and media owned by the seller of the parent gig.
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
  if new.status = 'approved' then
    if old.status <> 'approved' then
      raise exception 'Only administrators may approve service offers';
    end if;
    -- An edit to an approved gig must be reviewed, even if an API client
    -- attempts to retain its approved status.
    new.status := 'pending_review';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
 end if;
 return new;
end; $function$
;

drop policy if exists "Sellers can update their own non-approved service offers" on public.service_offers;
create policy "Sellers can submit own gig edits for review" on public.service_offers
for update to authenticated using (seller_id=auth.uid()) with check (seller_id=auth.uid());

drop policy if exists "Sellers can manage own service media" on public.service_offer_media;
create policy "Sellers manage media on owned gigs" on public.service_offer_media
for all to authenticated
using (exists(select 1 from public.service_offers o where o.id=service_offer_media.service_offer_id and (o.seller_id=auth.uid() or public.is_admin())))
with check (exists(select 1 from public.service_offers o where o.id=service_offer_media.service_offer_id and (o.seller_id=auth.uid() or public.is_admin())));

drop policy if exists "Sellers can manage own service faqs" on public.service_offer_faqs;
create policy "Sellers manage faqs on owned gigs" on public.service_offer_faqs
for all to authenticated
using (exists(select 1 from public.service_offers o where o.id=service_offer_faqs.service_offer_id and (o.seller_id=auth.uid() or public.is_admin())))
with check (exists(select 1 from public.service_offers o where o.id=service_offer_faqs.service_offer_id and (o.seller_id=auth.uid() or public.is_admin())));
