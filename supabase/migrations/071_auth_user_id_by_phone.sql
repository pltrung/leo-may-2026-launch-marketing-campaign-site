-- Helper for Twilio Verify flow: find auth user id by phone (E.164).
-- Used by /api/verify-otp when creating Supabase session after Twilio Verify.
create or replace function public.get_auth_user_id_by_phone(p_phone text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where phone = p_phone limit 1;
$$;

revoke all on function public.get_auth_user_id_by_phone(text) from public;
grant execute on function public.get_auth_user_id_by_phone(text) to service_role;
