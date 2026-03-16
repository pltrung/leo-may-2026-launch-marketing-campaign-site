-- Collaborative route reset coordination:
-- - route_reset_assignments: current setters assigned to a wall zone
-- - route_reset_logs: reset completion history
-- Drops the older per-day assignment table route_zone_setters (redundant).

-- 1) Assignments (current / active)
CREATE TABLE IF NOT EXISTS route_reset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES route_zones(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, staff_id)
);

ALTER TABLE route_reset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY route_reset_assignments_select
  ON route_reset_assignments
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY route_reset_assignments_insert
  ON route_reset_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY route_reset_assignments_delete
  ON route_reset_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- 2) Reset history
CREATE TABLE IF NOT EXISTS route_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES route_zones(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_reset_logs_zone_time
  ON route_reset_logs (zone_id, completed_at DESC);

ALTER TABLE route_reset_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY route_reset_logs_select
  ON route_reset_logs
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY route_reset_logs_insert
  ON route_reset_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3) Drop old per-day assignment table (redundant)
DROP TABLE IF EXISTS route_zone_setters;

