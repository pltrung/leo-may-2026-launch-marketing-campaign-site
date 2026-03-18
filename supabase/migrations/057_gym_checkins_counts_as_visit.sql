-- Primary check-in of the gym day counts toward visits/stats; same-day re-entry rows
-- trigger Realtime for "welcome back" without consuming a visit or inflating totals.
ALTER TABLE gym_checkins
  ADD COLUMN IF NOT EXISTS counts_as_visit boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN gym_checkins.counts_as_visit IS 'false = same-day re-entry (door scan only); true = first check-in that day (visit/stats).';

CREATE INDEX IF NOT EXISTS idx_gym_checkins_member_counts_visit
  ON gym_checkins (member_id)
  WHERE counts_as_visit = true;
