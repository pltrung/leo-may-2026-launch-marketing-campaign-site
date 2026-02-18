-- Identity lock: single identifier (email or E.164 phone) + type.
-- Referral count is ONLY incremented via confirm_referral (when referred user is verified).
-- Run after 005.

-- Add identifier columns (source of truth for locked identity)
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS identifier text,
  ADD COLUMN IF NOT EXISTS identifier_type text;

-- Constrain type
ALTER TABLE waitlist
  DROP CONSTRAINT IF EXISTS waitlist_identifier_type_check;
ALTER TABLE waitlist
  ADD CONSTRAINT waitlist_identifier_type_check
  CHECK (identifier_type IS NULL OR identifier_type IN ('email', 'phone'));

-- Backfill: set identifier/identifier_type from email or phone where missing
UPDATE waitlist
SET
  identifier = LOWER(TRIM(email)),
  identifier_type = 'email'
WHERE (identifier IS NULL OR identifier_type IS NULL) AND TRIM(email) <> '';

UPDATE waitlist
SET
  identifier = REGEXP_REPLACE(TRIM(phone), '\s+', '', 'g'),
  identifier_type = 'phone'
WHERE (identifier IS NULL OR identifier_type IS NULL) AND TRIM(phone) <> '';

-- Unique per (type, identifier). App normalizes: email lowercased, phone E.164.
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_identifier_unique
  ON waitlist (identifier_type, TRIM(identifier))
  WHERE identifier IS NOT NULL AND TRIM(identifier) <> '';

CREATE INDEX IF NOT EXISTS idx_waitlist_identifier ON waitlist (identifier_type, identifier);

-- Ensure confirm_referral only increments when inviter is verified (already enforced in 005).
-- No change to confirm_referral; referral_count must only be updated there, not on insert.
-- Application must NOT increment referral_count in signup/insert; only via confirm_referral.
