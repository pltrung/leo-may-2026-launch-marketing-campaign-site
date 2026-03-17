-- Staff/frontdesk verification: same profile fields as member (DOB, CCCD/eID, gender, verified)
-- Used in admin profile modal so staff can be verified in the system (scan VN eID, etc.)
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IS NULL OR gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS id_verified_from_cccd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN staff_profiles.id_verified_from_cccd IS 'When true, id_number, date_of_birth, gender, address are from CCCD/eID scan and read-only in profile';
