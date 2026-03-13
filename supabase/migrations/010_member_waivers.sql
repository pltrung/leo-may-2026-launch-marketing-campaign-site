-- Detailed waiver records linked to member_profiles.

CREATE TABLE IF NOT EXISTS member_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  waiver_text text NOT NULL,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_waivers_member_id ON member_waivers (member_id);

ALTER TABLE member_waivers ENABLE ROW LEVEL SECURITY;

-- Members can read their own waiver records.
CREATE POLICY member_waivers_select_own ON member_waivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM member_profiles mp
      WHERE mp.id = member_waivers.member_id
        AND mp.auth_id = auth.uid()
    )
  );

