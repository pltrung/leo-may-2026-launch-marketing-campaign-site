-- Per-day route zone setter assignments.
-- Allows setters to \"Assign to me\" for a wall zone for a specific gym date.

CREATE TABLE IF NOT EXISTS route_zone_setters (
  zone_id uuid NOT NULL REFERENCES route_zones(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (zone_id, staff_id, date)
);

ALTER TABLE route_zone_setters ENABLE ROW LEVEL SECURITY;

CREATE POLICY route_zone_setters_select
  ON route_zone_setters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY route_zone_setters_insert
  ON route_zone_setters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY route_zone_setters_delete
  ON route_zone_setters
  FOR DELETE
  TO authenticated
  USING (true);

