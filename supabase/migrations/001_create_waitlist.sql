-- Leo Mây Waitlist Table
-- Run this in Supabase SQL Editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  cloud_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for counting and ordering
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at);

-- RLS: Service role (API) bypasses RLS. No policies = anon/authenticated have no access.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
