-- Extend onboarding from 5 to 7 days; add certification fields for Day 7

-- Allow days 1-7 in day completion and AI sessions
ALTER TABLE onboarding_day_completion
  DROP CONSTRAINT IF EXISTS onboarding_day_completion_day_check;
ALTER TABLE onboarding_day_completion
  ADD CONSTRAINT onboarding_day_completion_day_check CHECK (day >= 1 AND day <= 7);

ALTER TABLE onboarding_ai_sessions
  DROP CONSTRAINT IF EXISTS onboarding_ai_sessions_day_check;
ALTER TABLE onboarding_ai_sessions
  ADD CONSTRAINT onboarding_ai_sessions_day_check CHECK (day >= 1 AND day <= 7);

-- Certification result (Day 7): final score, pass/fail, date
ALTER TABLE onboarding_progress
  ADD COLUMN IF NOT EXISTS final_score int,
  ADD COLUMN IF NOT EXISTS passed boolean,
  ADD COLUMN IF NOT EXISTS certification_date timestamptz;

COMMENT ON COLUMN onboarding_progress.final_score IS 'Day 7 certification total score 0-100';
COMMENT ON COLUMN onboarding_progress.passed IS 'Day 7 certification passed (total_score >= 80, no critical_fail)';
COMMENT ON COLUMN onboarding_progress.certification_date IS 'When Day 7 certification was completed (pass or fail)';
