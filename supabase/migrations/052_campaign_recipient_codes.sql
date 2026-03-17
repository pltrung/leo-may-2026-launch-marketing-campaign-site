-- One unique promo code per recipient for guest-pass campaigns (so each recipient can give one code to one friend).
CREATE TABLE IF NOT EXISTS campaign_recipient_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_log_id uuid NOT NULL REFERENCES campaign_logs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  promo_code text NOT NULL,
  UNIQUE(promo_code),
  UNIQUE(campaign_log_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipient_codes_log ON campaign_recipient_codes (campaign_log_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipient_codes_code ON campaign_recipient_codes (promo_code);

COMMENT ON TABLE campaign_recipient_codes IS 'One code per recipient for guest-pass campaigns; each code is single-use (one redemption).';

-- Tie redemptions to a specific recipient code so each code can only be used once (guest pass).
ALTER TABLE campaign_code_redemptions ADD COLUMN IF NOT EXISTS campaign_recipient_code_id uuid REFERENCES campaign_recipient_codes(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_redemptions_recipient_code ON campaign_code_redemptions (campaign_recipient_code_id) WHERE campaign_recipient_code_id IS NOT NULL;
