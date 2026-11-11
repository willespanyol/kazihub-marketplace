-- Database-side authorization for profiles and manual payments.
drop trigger if exists kazihub_guard_profile_update on public.profiles;
create trigger kazihub_guard_profile_update before update on public.profiles for each row execute function public.kazihub_guard_profile_update();

drop trigger if exists kazihub_guard_order_payment on public.orders;
create trigger kazihub_guard_order_payment before insert or update on public.orders for each row execute function public.kazihub_guard_order_payment();
