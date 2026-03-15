-- Newbie class: link members to coaching sessions when they purchase Newbie Class.
-- Max 5 newbies per 30-min session; 2 sessions per slot = max 10 newbies per 30 mins.

-- Add location to coaching sessions (where to be at class time)
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS location text;
UPDATE coaching_sessions SET location = 'Main Wall - Beginner Area' WHERE location IS NULL;
ALTER TABLE coaching_sessions ALTER COLUMN location SET DEFAULT 'Main Wall - Beginner Area';

-- Bookings: one row per member per purchased newbie class (linked to a session)
CREATE TABLE IF NOT EXISTS newbie_class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  coaching_session_id uuid NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newbie_bookings_member ON newbie_class_bookings (member_id);
CREATE INDEX IF NOT EXISTS idx_newbie_bookings_session ON newbie_class_bookings (coaching_session_id);
CREATE INDEX IF NOT EXISTS idx_newbie_bookings_payment ON newbie_class_bookings (payment_id);

ALTER TABLE newbie_class_bookings ENABLE ROW LEVEL SECURITY;
-- Members can read own bookings; insert/update via API (service role)
CREATE POLICY newbie_bookings_select_own ON newbie_class_bookings
  FOR SELECT USING (
    member_id IN (SELECT id FROM member_profiles WHERE auth_id = auth.uid())
  );

-- Enforce max 5 newbies per session at application level (check in API before insert).
