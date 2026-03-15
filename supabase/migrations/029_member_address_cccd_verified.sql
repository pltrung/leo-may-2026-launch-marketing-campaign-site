-- Address from CCCD scan; lock CCCD-verified fields from editing in profile
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS id_verified_from_cccd boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN member_profiles.address IS 'Address from CCCD/eID scan';
COMMENT ON COLUMN member_profiles.id_verified_from_cccd IS 'When true, id_number, full_name, date_of_birth, gender, address are from CCCD and read-only in profile';
