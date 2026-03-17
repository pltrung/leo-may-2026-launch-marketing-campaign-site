-- Campaign logs for email campaigns sent from Analytics Action Panel
CREATE TABLE IF NOT EXISTS campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment text NOT NULL,
  subject text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_campaign_logs_sent_at ON campaign_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_segment ON campaign_logs (segment);

COMMENT ON TABLE campaign_logs IS 'Log of email campaigns sent via admin Analytics Action Panel (Gmail API).';
