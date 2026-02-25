-- Add 10 validated (verified) referred accounts for ev5-sm@l to test progress bar visual.
-- Run in Supabase SQL Editor (service role or project owner).
-- After running: log in as ev5-sm@l; referral_count will be 20 + 10 = 30 (or current + 10 if already different).

DO $$
DECLARE
  referrer_id uuid;
  i int;
BEGIN
  SELECT id INTO referrer_id
  FROM waitlist
  WHERE LOWER(TRIM(email)) = 'ev5-sm@l'
  LIMIT 1;

  IF referrer_id IS NULL THEN
    RAISE EXCEPTION 'ev5-sm@l not found in waitlist. Run seed_evolution_stages.sql first.';
  END IF;

  -- Insert 10 verified referred users (referred_by = ev5-sm@l)
  FOR i IN 1..10 LOOP
    INSERT INTO waitlist (
      name,
      email,
      phone,
      cloud_type,
      referral_code,
      referral_count,
      referred_by,
      is_verified,
      verified_at,
      identifier,
      identifier_type,
      tier_level,
      total_contribution_usd
    ) VALUES (
      'Evo5-SM Ref ' || i,
      'ev5-sm-ref' || i || '@l',
      '+84940000' || LPAD(i::text, 3, '0'),
      'suong_mu',
      'ev5-sm-ref' || i,
      0,
      referrer_id,
      true,
      now(),
      'ev5-sm-ref' || i || '@l',
      'email',
      1,
      0
    )
    ;
  END LOOP;

  -- Bump referrer's referral_count by 10
  UPDATE waitlist
  SET
    referral_count = referral_count + 10,
    updated_at = now()
  WHERE id = referrer_id;
END $$;
