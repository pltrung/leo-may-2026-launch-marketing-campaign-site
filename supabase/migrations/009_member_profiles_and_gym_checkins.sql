-- Member profiles for gym membership (post-launch).
-- Links to Supabase auth; can be created from waitlist on first login.

CREATE TABLE IF NOT EXISTS member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  full_name text NOT NULL,
  tier text NOT NULL DEFAULT 'Explorer',
  waiver_signed boolean NOT NULL DEFAULT false,
  waiver_signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_auth_id ON member_profiles (auth_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_email ON member_profiles (email);
CREATE INDEX IF NOT EXISTS idx_member_profiles_phone ON member_profiles (phone);

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: users can read/update own row only
CREATE POLICY member_profiles_select_own ON member_profiles
  FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY member_profiles_update_own ON member_profiles
  FOR UPDATE USING (auth.uid() = auth_id);
-- Insert only via service role (API creates after signup or waitlist migration)

COMMENT ON COLUMN member_profiles.tier IS 'e.g. Explorer, Cloud Shaper, Sky Influencer, Founding Cloud, Origin Marker';

-- Gym check-ins (staff scans QR; API inserts)
CREATE TABLE IF NOT EXISTS gym_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  location text
);

CREATE INDEX IF NOT EXISTS idx_gym_checkins_member_id ON gym_checkins (member_id);
CREATE INDEX IF NOT EXISTS idx_gym_checkins_timestamp ON gym_checkins ("timestamp" DESC);

ALTER TABLE gym_checkins ENABLE ROW LEVEL SECURITY;
-- No policies: only server (service role) inserts/reads check-ins
