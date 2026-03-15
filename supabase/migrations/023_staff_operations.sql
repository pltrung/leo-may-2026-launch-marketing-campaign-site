-- Staff operations: route setters and coaches
-- Roles: member (default), admin, route_setter, coach

-- Staff profiles: route setters and coaches (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'route_setter' CHECK (role IN ('route_setter', 'coach')),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_auth_id ON staff_profiles (auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_email ON staff_profiles (email);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
-- Policy: staff can read own row; insert own row on first login (API uses service role)
CREATE POLICY staff_profiles_select_own ON staff_profiles
  FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY staff_profiles_insert_own ON staff_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Daily attendance: IN or NOT_IN per staff per day
CREATE TABLE IF NOT EXISTS staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('IN', 'NOT_IN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance (staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance (date);

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_attendance_select_own ON staff_attendance
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY staff_attendance_insert_own ON staff_attendance
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM staff_profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY staff_attendance_update_own ON staff_attendance
  FOR UPDATE USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE auth_id = auth.uid())
  );

-- Coaching sessions: max 2 per start_time (enforced in API)
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  coach_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  session_type text NOT NULL DEFAULT 'beginner',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_start ON coaching_sessions (start_time);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach ON coaching_sessions (coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status ON coaching_sessions (status);

ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
-- Staff and admin only via service role for now; RLS can be extended

-- Route zones: wall areas and reset schedule
CREATE TABLE IF NOT EXISTS route_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reset_frequency_days integer NOT NULL DEFAULT 14,
  last_reset_at timestamptz,
  next_reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_zones_next_reset ON route_zones (next_reset_at);

ALTER TABLE route_zones ENABLE ROW LEVEL SECURITY;

-- Staff tasks: daily operations checklist
CREATE TABLE IF NOT EXISTS staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned ON staff_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks (status);

ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_tasks_select_own ON staff_tasks
  FOR SELECT USING (
    assigned_to IS NULL OR assigned_to IN (SELECT id FROM staff_profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY staff_tasks_update_own ON staff_tasks
  FOR UPDATE USING (
    assigned_to IS NULL OR assigned_to IN (SELECT id FROM staff_profiles WHERE auth_id = auth.uid())
  );

-- Unique zone names for idempotent seed
ALTER TABLE route_zones ADD CONSTRAINT route_zones_name_key UNIQUE (name);

-- Seed route zones (idempotent)
INSERT INTO route_zones (name, reset_frequency_days, last_reset_at, next_reset_at)
VALUES
  ('Main Wall', 14, now() - interval '7 days', now() + interval '7 days'),
  ('Slab Wall', 14, now() - interval '10 days', now() + interval '4 days'),
  ('Competition Wall', 21, now() - interval '5 days', now() + interval '16 days'),
  ('Kids Wall', 7, now() - interval '8 days', now() - interval '1 day')
ON CONFLICT (name) DO NOTHING;

-- Seed example staff tasks (run once)
DO $$
BEGIN
  IF (SELECT count(*) FROM staff_tasks) = 0 THEN
    INSERT INTO staff_tasks (title, description, status) VALUES
      ('Clean holds', 'Clean and brush all holds on main wall', 'pending'),
      ('Inspect anchors', 'Check all anchor points for wear', 'pending'),
      ('Brush volumes', 'Brush and clean volumes', 'pending'),
      ('Check rental shoes', 'Count and sanitize rental shoes', 'pending'),
      ('Inspect crash pads', 'Check crash pads for damage', 'pending');
  END IF;
END $$;
