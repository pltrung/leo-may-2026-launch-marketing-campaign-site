-- Membership plans for VietQR payments
CREATE TABLE IF NOT EXISTS membership_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  duration_days int NOT NULL,
  price_vnd int NOT NULL
);

INSERT INTO membership_plans (id, name, duration_days, price_vnd)
VALUES
  ('day_pass', 'Day Pass', 1, 300000),
  ('explorer_month', 'Explorer Monthly', 30, 900000),
  ('explorer_year', 'Explorer Yearly', 365, 9000000)
ON CONFLICT (id) DO NOTHING;

-- Ensure member_profiles has member_code for payment memo
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS member_code text;

-- Payments linked to member_profiles
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES membership_plans(id),
  amount int NOT NULL,
  method text NOT NULL DEFAULT 'vietqr',
  status text NOT NULL DEFAULT 'success',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments (member_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (API) reads/writes payments
