-- Add explicit membership status and expiry to member_profiles

ALTER TABLE member_profiles
ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'active';

ALTER TABLE member_profiles
ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

