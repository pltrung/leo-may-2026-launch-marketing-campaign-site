-- Referral system for trait unlock
-- Run in Supabase SQL Editor

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist (referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON waitlist (referred_by);
