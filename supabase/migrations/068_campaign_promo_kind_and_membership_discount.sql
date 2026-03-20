-- Campaign email promo type (overrides segment-default rewards when set).
ALTER TABLE campaign_logs ADD COLUMN IF NOT EXISTS promo_kind text;

COMMENT ON COLUMN campaign_logs.promo_kind IS 'free_visit | guest_pass_friend | membership_50pct; null = legacy segment-based reward only.';

-- Applied when member redeems membership_50pct campaign code; cleared after tier membership purchase.
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS campaign_membership_discount_percent numeric(5, 2);
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS campaign_membership_discount_until timestamptz;

COMMENT ON COLUMN member_profiles.campaign_membership_discount_percent IS 'Percent off day/month/half-year/year passes until campaign_membership_discount_until.';
COMMENT ON COLUMN member_profiles.campaign_membership_discount_until IS 'Campaign membership discount expiry (ISO).';
