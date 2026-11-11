-- Match the fields already collected by the KaziHub profile setup form.
-- Additive migration: does not remove or modify existing profile data.
alter table public.profiles
  add column if not exists professional_title text,
  add column if not exists categories text,
  add column if not exists seller_description text,
  add column if not exists common_project_type text,
  add column if not exists location text;
