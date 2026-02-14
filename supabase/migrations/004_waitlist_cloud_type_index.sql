-- Index for leaderboard/team-count queries on cloud_type
CREATE INDEX IF NOT EXISTS idx_waitlist_cloud_type ON waitlist (cloud_type);
