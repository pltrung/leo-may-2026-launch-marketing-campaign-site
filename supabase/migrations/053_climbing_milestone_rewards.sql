-- Climbing level-up rewards: guest pass codes (10 & 25 visits) + merch (50/100/250) fulfilled at front desk

CREATE TABLE IF NOT EXISTS milestone_guest_pass_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  milestone_visits int NOT NULL CHECK (milestone_visits IN (10, 25)),
  redeemed_by_member_id uuid REFERENCES member_profiles(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestone_guest_codes_owner ON milestone_guest_pass_codes(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_milestone_guest_codes_code ON milestone_guest_pass_codes(code);

COMMENT ON TABLE milestone_guest_pass_codes IS 'Friend redeems code for 1 free visit; owner earned at 10 visits (1 code) or 25 visits (5 codes).';

CREATE TABLE IF NOT EXISTS member_climbing_merch_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  milestone_visits int NOT NULL CHECK (milestone_visits IN (50, 100, 250)),
  item text NOT NULL CHECK (item IN ('cap', 'shirt', 'shoes')),
  fulfilled_at timestamptz,
  fulfilled_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, milestone_visits)
);

CREATE INDEX IF NOT EXISTS idx_climbing_merch_member ON member_climbing_merch_rewards(member_id);
CREATE INDEX IF NOT EXISTS idx_climbing_merch_pending ON member_climbing_merch_rewards(fulfilled_at) WHERE fulfilled_at IS NULL;

COMMENT ON TABLE member_climbing_merch_rewards IS 'Cap (50 visits), shirt (100), shoes (250); staff marks fulfilled at front desk.';
