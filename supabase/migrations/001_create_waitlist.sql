-- Leo Mây Waitlist Table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  cloud_type text NOT NULL,
  referral_code text UNIQUE,
  referred_by text,
  referral_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_phone ON waitlist (phone);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist (referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON waitlist (referred_by);

-- RLS: block all; server uses service role (bypasses RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- No policies = anon/authenticated cannot read or write.
-- API route uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
