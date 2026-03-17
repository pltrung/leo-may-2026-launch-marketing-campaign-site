-- Optional display name for leaderboard and profile (if empty, use full_name / CCCD name).
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN member_profiles.display_name IS 'Name shown on leaderboard and in profile; null = use full_name (CCCD name).';
