-- Create a user with 10 referrals to see the "awaken true form" / trait unlocked UI
-- Run in Supabase SQL Editor
--
-- After running: Use "Know your cloud" with email: trueform@test.local
-- You'll see the countdown page with:
--   - "Your cloud reveals its true form" (or cloud-specific trait message)
--   - Progress bar at 100%
--   - Trait unlocked styling

-- Insert new user with referral_count = 10
-- (If email already exists, run the UPDATE below instead)
INSERT INTO waitlist (name, email, phone, cloud_type, referral_code, referral_count)
VALUES (
  'True Form Tester',
  'trueform@test.local',
  '+84900100001',
  'giong',
  'trueformref01',
  10
);

-- If trueform@test.local already exists, run this instead:
-- UPDATE waitlist
-- SET referral_count = 10
-- WHERE LOWER(TRIM(email)) = 'trueform@test.local';
