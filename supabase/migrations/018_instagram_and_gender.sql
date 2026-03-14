-- Instagram handle and gender for member profiles
ALTER TABLE member_profiles
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN member_profiles.instagram_handle IS 'Instagram username (without @) for profile link';
COMMENT ON COLUMN member_profiles.gender IS 'male or female - used for leaderboard filtering';
