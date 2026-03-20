-- One row per segment/audience key: latest completed send time (for admin rate-limit UI).
CREATE OR REPLACE VIEW campaign_last_sent_by_segment AS
SELECT
  segment AS campaign_key,
  max(sent_at) AS last_sent_at
FROM campaign_logs
WHERE status = 'completed'
  AND segment IS NOT NULL
  AND btrim(segment) != ''
GROUP BY segment;

COMMENT ON VIEW campaign_last_sent_by_segment IS 'Admin: last send time per campaign_logs.segment (segment id or marketing_audience id).';
