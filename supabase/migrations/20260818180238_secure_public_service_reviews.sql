-- Fixes public review visibility without exposing the private `orders` table.
--
-- Root cause: reviews are linked to a service offer only indirectly, through
-- orders.service_offer_id (reviews itself has no service_offer_id column -- confirmed by
-- inspecting the live schema: reviews columns are id, order_id, buyer_id, seller_id, rating,
-- comment, created_at, updated_at). The service detail page previously queried
--   reviews.select("*, orders!inner(service_offer_id)").eq("orders.service_offer_id", id)
-- which requires the *viewer* to have RLS SELECT access to the joined `orders` row. Anonymous
-- and unrelated visitors do not (and must not) have that access, so the inner join silently
-- dropped every review for anyone who isn't that specific order's buyer/seller/admin -- even
-- though `public.reviews` SELECT is already publicly open (verified read-only: an anonymous
-- request against `/rest/v1/reviews` already returns rows with no auth at all).
--
-- This migration denormalizes service_offer_id directly onto reviews so the public page can
-- filter on reviews.service_offer_id with zero dependency on orders visibility. It does not add,
-- remove, or alter any policy on public.orders, and does not touch the existing INSERT policy /
-- trigger on public.reviews that already enforces order-and-buyer legitimacy (confirmed
-- read-only, by probing with data guaranteed to fail either way: an insert against a
-- non-existent order is rejected with a custom "Order not found" error, and an insert against a
-- real order with a mismatched buyer_id is rejected with "Only the buyer can review this order"
-- -- i.e. this is already enforced in the database, not merely by frontend button visibility).
--
-- Foreign key behavior: checked the frontend for any code path that deletes a service_offers row
-- (hard delete) or moves it to a soft-deleted/archived status -- there is none. No status value
-- other than "approved"/"pending_review"/"rejected" is ever assigned to a listing anywhere in
-- this application, and "pending_review" itself is never actually written by any current code
-- path. Since a review is a durable record of a completed, paid transaction (not disposable data),
-- service_offer_id uses ON DELETE RESTRICT rather than CASCADE: if a listing with reviews is ever
-- hard-deleted in the future, that delete will fail loudly instead of silently destroying review
-- history. (This is deliberately different from service_offer_views in the companion migration,
-- which is ephemeral analytics data, not a durable record, and stays ON DELETE CASCADE.)
--
-- Update tamper-resistance: the anon role has no UPDATE/DELETE grant on reviews at all (verified:
-- its OPTIONS Allow header lists only GET, HEAD, POST, OPTIONS). Whether the authenticated role
-- currently has an UPDATE grant could not be verified without a live authenticated session, which
-- was not available and was not fabricated for this check; the frontend itself never calls
-- .update() or .delete() on reviews anywhere. Regardless of what is or isn't currently grantable,
-- the trigger below now also fires BEFORE UPDATE and unconditionally pins order_id and
-- service_offer_id back to their existing values, so a review can never be moved to a different
-- order or service offer by any update, present or future.

alter table public.reviews
  add column if not exists service_offer_id uuid references public.service_offers(id) on delete restrict;

-- Backfill diagnostic (run manually before this migration was authored, read-only, against
-- production): exactly 1 existing review row total, referencing exactly 1 existing order, which
-- has a service offer. No duplicate, ambiguous, or orphaned order/review relationships exist at
-- migration-authoring time. If new rows were written between the diagnostic and this running,
-- the WHERE clause below still maps every row deterministically through the existing order_id
-- foreign key -- there is no case where this mapping is ambiguous, only "mapped" or "order
-- missing" (which cannot happen: reviews.order_id already requires an existing order).
update public.reviews r
set service_offer_id = o.service_offer_id
from public.orders o
where o.id = r.order_id
  and r.service_offer_id is null;

-- Enforce going forward. If any row was left null by the backfill above (which the diagnostic
-- indicates should not happen), this statement fails loudly and the migration stops here rather
-- than silently allowing an unmapped review to exist.
alter table public.reviews
  alter column service_offer_id set not null;

create index if not exists reviews_service_offer_id_idx
  on public.reviews (service_offer_id);

-- Keep service_offer_id correct for all future reviews server-side, and make both order_id and
-- service_offer_id immutable after creation. The existing frontend insert never sends
-- service_offer_id, and neither value must ever be trusted from the client on insert or update.
--
-- Deliberately NOT security definer: on INSERT this runs with the inserting user's own
-- privileges, so the lookup below is itself still subject to RLS on public.orders -- meaning a
-- review can only be written for an order the inserting user can actually see (their own order),
-- which is an extra, independent safety net on top of the existing buyer-identity trigger, not a
-- replacement for it. A legitimate buyer already has RLS SELECT access to their own order --
-- OrderDetailsPage's fetchOrder() must succeed with that same access before the review form is
-- ever reachable, so this is not a new requirement being introduced by this trigger.
create or replace function public.reviews_set_service_offer_id()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    select o.service_offer_id into new.service_offer_id
    from public.orders o
    where o.id = new.order_id;
  elsif tg_op = 'UPDATE' then
    -- Which order and which service offer a review belongs to are permanent facts set at
    -- creation. Never let an UPDATE move a review to a different order or service, regardless of
    -- what a client sends.
    new.order_id := old.order_id;
    new.service_offer_id := old.service_offer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_set_service_offer_id on public.reviews;
create trigger reviews_set_service_offer_id
  before insert or update on public.reviews
  for each row
  execute function public.reviews_set_service_offer_id();

-- No changes are made to any existing SELECT/INSERT/UPDATE/DELETE policy on public.reviews, and
-- no policy is added or changed on public.orders. RLS is row-level, not column-level: the
-- existing public SELECT policy on public.reviews automatically covers the new column with no
-- policy change required.

comment on column public.reviews.service_offer_id is
  'Denormalized from orders.service_offer_id at write time (see reviews_set_service_offer_id trigger) so public review queries never need SELECT access to the private orders table. Immutable after insert; ON DELETE RESTRICT so a hard-deleted listing cannot silently take its reviews with it.';
