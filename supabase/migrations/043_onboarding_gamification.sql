-- Gamification: skill tracking, 24h unlock uses existing completed_at on day_completion

-- Skill scores (0-100) per user: communication, safety, sales, teamwork
ALTER TABLE onboarding_progress
  ADD COLUMN IF NOT EXISTS skill_scores jsonb NOT NULL DEFAULT '{"communication":50,"safety":50,"sales":50,"teamwork":50}'::jsonb;

COMMENT ON COLUMN onboarding_progress.skill_scores IS 'Per-skill scores 0-100: communication, safety, sales, teamwork. Updated from quiz/scenarios.';
