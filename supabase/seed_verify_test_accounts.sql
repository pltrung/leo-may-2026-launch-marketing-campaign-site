-- Mark test/dummy waitlist accounts as verified (for local/testing only).
-- Run in Supabase SQL Editor. No auth_id is set; use dev bypass in app to "log in" as these.
-- Matches: dummy2XX@test.local (51-100) and evX-XX@l (evolution test accounts).

UPDATE waitlist
SET
  is_verified = true,
  verified_at = now(),
  updated_at = now()
WHERE
  (email LIKE 'dummy2%' AND email LIKE '%@test.local')
  OR (email LIKE 'ev%-%@l');
