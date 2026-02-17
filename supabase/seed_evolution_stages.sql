-- 7 test accounts, one per Cloud Evolution stage (for countdown page UI testing)
-- Run in Supabase SQL Editor
--
-- After running: Use "Know your cloud" with each email to see that stage on the countdown page.
--
-- Stage 1 Dormant (0–2):   evolution_stage_1@test.local  referral_count 0
-- Stage 2 Stirring (3–5):  evolution_stage_2@test.local  referral_count 4
-- Stage 3 Awakening (6–9): evolution_stage_3@test.local  referral_count 7
-- Stage 4 Forming (10–15): evolution_stage_4@test.local  referral_count 12
-- Stage 5 Ascending (16–25): evolution_stage_5@test.local referral_count 20
-- Stage 6 Sky Guardian (26–49): evolution_stage_6@test.local referral_count 35
-- Stage 7 Founding (50+):  evolution_stage_7@test.local  referral_count 55

INSERT INTO waitlist (name, email, phone, cloud_type, referral_code, referral_count)
VALUES
  ('Evolution Stage 1 - Dormant',   'evolution_stage_1@test.local', '+84910000001', 'may_nhe',  'evol1' || substr(md5(random()::text), 1, 8), 0),
  ('Evolution Stage 2 - Stirring',  'evolution_stage_2@test.local', '+84910000002', 'may_nhe',  'evol2' || substr(md5(random()::text), 1, 8), 4),
  ('Evolution Stage 3 - Awakening', 'evolution_stage_3@test.local', '+84910000003', 'suong_mu', 'evol3' || substr(md5(random()::text), 1, 8), 7),
  ('Evolution Stage 4 - Forming',   'evolution_stage_4@test.local', '+84910000004', 'suong_mu', 'evol4' || substr(md5(random()::text), 1, 8), 12),
  ('Evolution Stage 5 - Ascending', 'evolution_stage_5@test.local', '+84910000005', 'giong',    'evol5' || substr(md5(random()::text), 1, 8), 20),
  ('Evolution Stage 6 - Sky Guardian', 'evolution_stage_6@test.local', '+84910000006', 'giong',   'evol6' || substr(md5(random()::text), 1, 8), 35),
  ('Evolution Stage 7 - Founding',  'evolution_stage_7@test.local', '+84910000007', 'may_nhe',  'evol7' || substr(md5(random()::text), 1, 8), 55);

-- If you need to update existing rows by email instead of inserting:
-- UPDATE waitlist SET referral_count = 0  WHERE LOWER(TRIM(email)) = 'evolution_stage_1@test.local';
-- UPDATE waitlist SET referral_count = 4  WHERE LOWER(TRIM(email)) = 'evolution_stage_2@test.local';
-- UPDATE waitlist SET referral_count = 7  WHERE LOWER(TRIM(email)) = 'evolution_stage_3@test.local';
-- UPDATE waitlist SET referral_count = 12 WHERE LOWER(TRIM(email)) = 'evolution_stage_4@test.local';
-- UPDATE waitlist SET referral_count = 20 WHERE LOWER(TRIM(email)) = 'evolution_stage_5@test.local';
-- UPDATE waitlist SET referral_count = 35 WHERE LOWER(TRIM(email)) = 'evolution_stage_6@test.local';
-- UPDATE waitlist SET referral_count = 55 WHERE LOWER(TRIM(email)) = 'evolution_stage_7@test.local';
