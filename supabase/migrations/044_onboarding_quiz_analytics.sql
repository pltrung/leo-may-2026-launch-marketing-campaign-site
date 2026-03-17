-- Store quiz accuracy per day for onboarding analytics (avg AI score, quiz accuracy, etc.)

ALTER TABLE onboarding_day_completion
  ADD COLUMN IF NOT EXISTS quiz_correct_count int,
  ADD COLUMN IF NOT EXISTS quiz_total int;

COMMENT ON COLUMN onboarding_day_completion.quiz_correct_count IS 'Number of correct quiz answers when day was completed (for analytics).';
COMMENT ON COLUMN onboarding_day_completion.quiz_total IS 'Total quiz questions when day was completed (for analytics).';
