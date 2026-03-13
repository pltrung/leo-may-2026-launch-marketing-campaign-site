-- New members are inactive until they purchase a pass.
-- Change default and fix existing members without valid membership.
ALTER TABLE member_profiles
  ALTER COLUMN membership_status SET DEFAULT 'inactive';

UPDATE member_profiles
SET membership_status = 'inactive'
WHERE membership_status = 'active'
  AND (membership_expires_at IS NULL OR membership_expires_at < now());
