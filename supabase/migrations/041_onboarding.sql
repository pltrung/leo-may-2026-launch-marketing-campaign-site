-- Onboarding module: 5-day training for staff/frontdesk
-- Tracks progress, XP, streaks, hearts, badges, day completion, and AI scenario sessions

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE,
  staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  xp_total int NOT NULL DEFAULT 0,
  streak_days int NOT NULL DEFAULT 0,
  hearts_remaining int NOT NULL DEFAULT 5,
  last_activity_date date,
  badges jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_day_completion (
  progress_id uuid NOT NULL REFERENCES onboarding_progress(id) ON DELETE CASCADE,
  day int NOT NULL CHECK (day >= 1 AND day <= 5),
  completed boolean NOT NULL DEFAULT false,
  xp_earned int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  lesson_index int NOT NULL DEFAULT 0,
  PRIMARY KEY (progress_id, day)
);

CREATE TABLE IF NOT EXISTS onboarding_ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id uuid NOT NULL REFERENCES onboarding_progress(id) ON DELETE CASCADE,
  day int NOT NULL CHECK (day >= 1 AND day <= 5),
  scenario_key text NOT NULL,
  user_response text NOT NULL,
  score int NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback text,
  improved_answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_auth_id ON onboarding_progress(auth_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_ai_sessions_progress_day ON onboarding_ai_sessions(progress_id, day);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_day_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_progress_select
  ON onboarding_progress FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY onboarding_progress_insert
  ON onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY onboarding_progress_update
  ON onboarding_progress FOR UPDATE TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY onboarding_day_select
  ON onboarding_day_completion FOR SELECT TO authenticated
  USING (progress_id IN (SELECT id FROM onboarding_progress WHERE auth_id = auth.uid()));

CREATE POLICY onboarding_day_insert
  ON onboarding_day_completion FOR INSERT TO authenticated
  WITH CHECK (progress_id IN (SELECT id FROM onboarding_progress WHERE auth_id = auth.uid()));

CREATE POLICY onboarding_day_update
  ON onboarding_day_completion FOR UPDATE TO authenticated
  USING (progress_id IN (SELECT id FROM onboarding_progress WHERE auth_id = auth.uid()));

CREATE POLICY onboarding_ai_select
  ON onboarding_ai_sessions FOR SELECT TO authenticated
  USING (progress_id IN (SELECT id FROM onboarding_progress WHERE auth_id = auth.uid()));

CREATE POLICY onboarding_ai_insert
  ON onboarding_ai_sessions FOR INSERT TO authenticated
  WITH CHECK (progress_id IN (SELECT id FROM onboarding_progress WHERE auth_id = auth.uid()));
