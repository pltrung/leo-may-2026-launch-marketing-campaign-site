-- Retail discount tier (5% / 10% from 180d / 365d passes).
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS merchandise_discount_percent int NOT NULL DEFAULT 0;
ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS chk_merch_discount;
ALTER TABLE member_profiles ADD CONSTRAINT chk_merch_discount CHECK (merchandise_discount_percent IN (0, 5, 10));

CREATE TABLE IF NOT EXISTS member_guest_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  redeemed_by_member_id uuid REFERENCES member_profiles(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_invite_issuer ON member_guest_invite_codes (issuer_member_id);
CREATE INDEX IF NOT EXISTS idx_guest_invite_code ON member_guest_invite_codes (code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_invite_one_redemption_per_member
  ON member_guest_invite_codes (redeemed_by_member_id)
  WHERE redeemed_by_member_id IS NOT NULL;

ALTER TABLE member_guest_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guest_invite_select_issuer ON member_guest_invite_codes;
CREATE POLICY guest_invite_select_issuer ON member_guest_invite_codes
  FOR SELECT USING (
    issuer_member_id IN (SELECT id FROM member_profiles WHERE auth_id = auth.uid())
  );

ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS member_merch_discount_percent int,
  ADD COLUMN IF NOT EXISTS subtotal_before_discount_vnd int;

UPDATE membership_plans SET description = '30 minute coaching + 1 day access • Free rental shoes + chalk for your class' WHERE id = 'newbie_class';
UPDATE membership_plans SET description = 'Unlimited climbing for 30 days' WHERE id = 'month_pass';
UPDATE membership_plans SET description = 'Unlimited climbing for 180 days • 5% off merchandise & gear • 5 friend visit codes (each code = one new member, one bonus visit)' WHERE id = 'half_year_pass';
UPDATE membership_plans SET description = 'Unlimited climbing for 365 days • 10% off merchandise & gear • 15 friend visit codes (each code = one new member, one bonus visit)' WHERE id = 'year_pass';
