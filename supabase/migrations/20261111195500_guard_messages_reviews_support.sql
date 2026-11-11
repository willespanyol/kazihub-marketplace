-- Protect identity and admin-controlled fields on marketplace communication/reviews.
CREATE OR REPLACE FUNCTION public.kazihub_guard_conversation_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if row(new.id,new.buyer_id,new.seller_id,new.service_offer_id,new.subject,new.created_at)
     is distinct from
     row(old.id,old.buyer_id,old.seller_id,old.service_offer_id,old.subject,old.created_at)
  then raise exception 'Conversation participants and details cannot be changed'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.kazihub_guard_direct_message_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare recipient uuid;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if row(new.id,new.conversation_id,new.sender_id,new.message,new.created_at)
     is distinct from row(old.id,old.conversation_id,old.sender_id,old.message,old.created_at)
  then raise exception 'Message contents and sender cannot be changed'; end if;
  select case when buyer_id=old.sender_id then seller_id else buyer_id end
    into recipient from public.direct_conversations where id=old.conversation_id;
  if auth.uid() is distinct from recipient or new.is_read is distinct from true then
    raise exception 'Only the recipient can mark a message as read';
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.kazihub_guard_review_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if auth.uid() <> old.buyer_id or
    row(new.id,new.order_id,new.buyer_id,new.seller_id,new.service_offer_id,new.created_at)
    is distinct from
    row(old.id,old.order_id,old.buyer_id,old.seller_id,old.service_offer_id,old.created_at)
  then raise exception 'Review identity and linked order cannot be changed'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.kazihub_guard_support_ticket_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.user_id is distinct from old.user_id
     or new.status is distinct from old.status
     or new.admin_response is distinct from old.admin_response
     or new.resolved_by is distinct from old.resolved_by
     or new.resolved_at is distinct from old.resolved_at
  then raise exception 'Support status and administrator response are staff-controlled'; end if;
  return new;
end; $function$
;

drop trigger if exists kazihub_guard_conversation_update on public.direct_conversations;
create trigger kazihub_guard_conversation_update before update on public.direct_conversations for each row execute function public.kazihub_guard_conversation_update();
drop trigger if exists kazihub_guard_direct_message_update on public.direct_messages;
create trigger kazihub_guard_direct_message_update before update on public.direct_messages for each row execute function public.kazihub_guard_direct_message_update();
drop trigger if exists kazihub_guard_review_update on public.reviews;
create trigger kazihub_guard_review_update before update on public.reviews for each row execute function public.kazihub_guard_review_update();
drop trigger if exists kazihub_guard_support_ticket_update on public.support_tickets;
create trigger kazihub_guard_support_ticket_update before update on public.support_tickets for each row execute function public.kazihub_guard_support_ticket_update();
