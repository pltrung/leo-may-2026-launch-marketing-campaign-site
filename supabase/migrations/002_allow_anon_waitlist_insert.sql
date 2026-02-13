-- Allow anonymous inserts to waitlist (needed when anon & service_role keys behave the same)
-- Run in Supabase SQL Editor

CREATE POLICY "Allow anon insert" ON waitlist
  FOR INSERT TO anon WITH CHECK (true);
