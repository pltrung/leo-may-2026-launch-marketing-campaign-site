-- Guest passes: members can earn these from campaign codes (e.g. active members get guest pass to bring a friend)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS guest_passes_remaining int NOT NULL DEFAULT 0;

COMMENT ON COLUMN member_profiles.guest_passes_remaining IS 'Free guest visit passes (e.g. from campaign redemption). Staff can decrement when member brings a guest.';
