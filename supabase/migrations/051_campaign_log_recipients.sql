-- Recipients per campaign send: only these members are allowed to redeem the promo code.
CREATE TABLE IF NOT EXISTS campaign_log_recipients (
  campaign_log_id uuid NOT NULL REFERENCES campaign_logs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_log_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_log_recipients_member ON campaign_log_recipients (member_id);

COMMENT ON TABLE campaign_log_recipients IS 'Members who were sent the campaign email; only they can redeem the promo code.';
