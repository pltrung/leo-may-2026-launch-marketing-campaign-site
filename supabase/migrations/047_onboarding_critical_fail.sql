-- Add critical_fail to onboarding_progress for Day 7 certification
ALTER TABLE onboarding_progress
  ADD COLUMN IF NOT EXISTS critical_fail boolean;

COMMENT ON COLUMN onboarding_progress.critical_fail IS 'Day 7: true if any critical fail (safety, dismiss fear, skip onboarding, aggressive sales, buy shoes first-time, abandon user)';
