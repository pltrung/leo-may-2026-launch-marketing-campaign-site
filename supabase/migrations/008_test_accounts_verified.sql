-- Mark test accounts (evN-*@l) as verified so dev bypass can reach countdown without OTP.
-- Use only when NEXT_PUBLIC_DEV_BYPASS_OTP=true. Safe to run; only affects rows matching pattern.

UPDATE waitlist
SET
  is_verified = true,
  verified_at = COALESCE(verified_at, now()),
  updated_at = now(),
  identifier = LOWER(TRIM(email)),
  identifier_type = 'email'
WHERE LOWER(TRIM(email)) ~ '^ev[0-9]+-.+@l$';
