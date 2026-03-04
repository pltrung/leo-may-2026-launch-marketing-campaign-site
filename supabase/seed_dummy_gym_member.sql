-- Dummy gym member: run in Supabase SQL Editor to create a user you can log in with.
-- Login: dummy@gym.local / password123 (via /gym → Trở thành thành viên → Login).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_encrypted_pw text := crypt('password123', gen_salt('bf'));
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dummy@gym.local',
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"dummy@gym.local"}', v_user_id)::jsonb,
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  INSERT INTO public.member_profiles (auth_id, email, full_name, tier)
  VALUES (v_user_id, 'dummy@gym.local', 'Dummy Member', 'Explorer');
END
$$;

-- If login still fails (auth schema may differ): create user in Supabase Dashboard
-- (Authentication → Add user: dummy@gym.local / password123), then run:
-- INSERT INTO public.member_profiles (auth_id, email, full_name, tier)
-- VALUES ('<paste-new-user-uuid>', 'dummy@gym.local', 'Dummy Member', 'Explorer');
