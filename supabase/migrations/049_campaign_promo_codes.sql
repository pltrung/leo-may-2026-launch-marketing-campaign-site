-- Add promo code to campaign_logs (one code per send; all recipients can use it)
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS promo_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_campaign_logs_promo_code ON campaign_logs (promo_code) WHERE promo_code IS NOT NULL;

-- Redemptions: which member used which campaign code
CREATE TABLE IF NOT EXISTS campaign_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_log_id uuid NOT NULL REFERENCES campaign_logs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_log_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_member ON campaign_code_redemptions (member_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_log ON campaign_code_redemptions (campaign_log_id);

COMMENT ON TABLE campaign_code_redemptions IS 'Member redemptions of campaign promo codes (from email campaigns).';
