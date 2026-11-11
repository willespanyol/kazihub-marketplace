-- Adds the service_offer_views table backing seller-facing service view analytics.
--
-- Root cause: src/App.jsx (SellerDashboardPage -> fetchServiceAnalytics) already queries this
-- table for a per-offer view count:
--   supabase.from("service_offer_views")
--     .select("id", { count: "exact", head: true })
--     .eq("service_offer_id", offer.id)
-- but the table has never existed in this database, so the query silently errors and the
-- frontend falls back to displaying "0 views". Views are now actually recorded: ServiceDetailsPage
-- (fetchOffer, src/App.jsx) inserts one row here right after a valid, existing service offer
-- successfully loads on the public /services/:id page.
--
-- Verified against the live database (read-only, anon key): querying service_offers with no
-- filter currently returns exactly 2 rows, and both have status = 'approved'. This confirms
-- 'approved' is the correct, live status value for a publicly visible listing (it also matches
-- every listing query already in the frontend: ServicesPage, CategoryPage, HomePage all filter
-- .eq("status", "approved")), and confirms anon already has RLS SELECT access to service_offers
-- scoped to that status -- so the EXISTS check in the INSERT policy below is satisfiable by anon.
--
-- Limitation, by design: view counting here is a simple page-load counter, not a fraud-resistant
-- analytics system. Any visitor (anonymous or authenticated, including the seller viewing their
-- own listing) can inflate the count by reloading the page repeatedly; there is no deduplication
-- by session, cookie, or IP. This is intentional -- no existing code in this application does any
-- session/visitor tracking to build on, and adding IP capture or fingerprinting to solve it would
-- collect personal data this feature does not need. If accurate, abuse-resistant analytics are
-- required later, that is a deliberate follow-up feature, not a fix folded into this migration.

create table if not exists public.service_offer_views (
  id uuid primary key default gen_random_uuid(),
  service_offer_id uuid not null references public.service_offers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists service_offer_views_service_offer_id_idx
  on public.service_offer_views (service_offer_id);

alter table public.service_offer_views enable row level security;

-- Server-generated timestamp: never trust a client-supplied created_at.
create or replace function public.service_offer_views_set_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists service_offer_views_set_created_at on public.service_offer_views;
create trigger service_offer_views_set_created_at
  before insert on public.service_offer_views
  for each row
  execute function public.service_offer_views_set_created_at();

-- Anonymous or authenticated visitors may record a view, but only against a real, currently
-- approved service offer. This is the only write path: no UPDATE/DELETE policy is defined below,
-- so RLS default-denies both (views are append-only history).
drop policy if exists service_offer_views_insert_public on public.service_offer_views;
create policy service_offer_views_insert_public
  on public.service_offer_views
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.service_offers so
      where so.id = service_offer_views.service_offer_id
        and so.status = 'approved'
    )
  );

-- A seller may read (count) view rows only for their own service offers -- never another
-- seller's analytics. The existing frontend query uses `head: true` (count only, no row bodies
-- returned to the client), so this SELECT grant never leaks raw row data in practice, but RLS
-- still restricts which rows may even be counted.
drop policy if exists service_offer_views_select_own_seller on public.service_offer_views;
create policy service_offer_views_select_own_seller
  on public.service_offer_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.service_offers so
      where so.id = service_offer_views.service_offer_id
        and so.seller_id = auth.uid()
    )
  );

-- Admins may read all analytics rows, using this application's existing admin authorization
-- pattern (profiles.role = 'admin'), consistent with how every other admin-only capability in
-- this schema is expected to be enforced.
drop policy if exists service_offer_views_select_admin on public.service_offer_views;
create policy service_offer_views_select_admin
  on public.service_offer_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Anonymous visitors may insert but never read raw rows back.
grant insert on public.service_offer_views to anon;
-- Authenticated users may insert (record their own view) and select (subject to the two SELECT
-- policies above, which restrict actual visibility to the owning seller or an admin).
grant select, insert on public.service_offer_views to authenticated;
revoke update, delete on public.service_offer_views from anon, authenticated;

comment on table public.service_offer_views is
  'Append-only record of service offer page views. INSERT is open to any visitor for approved offers; SELECT is restricted by RLS to the owning seller or an admin. No viewer identity is stored. Counts are approximate (no dedup) by design -- see migration header comment.';
