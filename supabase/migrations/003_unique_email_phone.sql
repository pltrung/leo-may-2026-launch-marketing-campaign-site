-- Prevent duplicate waitlist entries by email or phone.
-- Run in Supabase SQL Editor. If you have existing duplicates, clean them first.

-- Unique index on email (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_unique
  ON waitlist (LOWER(TRIM(email)))
  WHERE TRIM(email) <> '';

-- Unique index on phone (spaces removed for consistent matching)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_phone_unique
  ON waitlist (REGEXP_REPLACE(TRIM(phone), '\s+', '', 'g'))
  WHERE TRIM(phone) <> '';
