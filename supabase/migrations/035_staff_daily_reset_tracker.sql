-- Tracks last date we ran the daily staff_tasks reset (so operations "reset" at midnight).
-- GET /api/admin/staff checks this and resets staff_tasks when the gym date rolls over.

CREATE TABLE IF NOT EXISTS staff_daily_reset (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_reset_date date NOT NULL
);

-- Single row: seed with past date so first API run after deploy does one reset
INSERT INTO staff_daily_reset (id, last_reset_date)
VALUES (1, '1970-01-01'::date)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE staff_daily_reset ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_daily_reset_select ON staff_daily_reset FOR SELECT TO authenticated USING (true);
CREATE POLICY staff_daily_reset_update ON staff_daily_reset FOR UPDATE TO authenticated USING (true);
