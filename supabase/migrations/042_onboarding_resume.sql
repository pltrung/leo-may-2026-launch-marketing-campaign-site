-- Add current_step to onboarding_day_completion for resume-from-where-left-off
-- Step 0 = first lesson, step N = section within day (lessons, scenarios, quiz, reflection)
ALTER TABLE onboarding_day_completion
  ADD COLUMN IF NOT EXISTS current_step int NOT NULL DEFAULT 0;

COMMENT ON COLUMN onboarding_day_completion.current_step IS 'Resume position: 0=first lesson, then scenarios, quiz, reflection';
