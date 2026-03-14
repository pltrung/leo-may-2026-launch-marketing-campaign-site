-- Plan name changes, visit passes, visits_remaining
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS duration_visits int;
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS visits_remaining int NOT NULL DEFAULT 0;

-- Update plan names
UPDATE membership_plans SET name = '1 Day Pass' WHERE id = 'day_pass';
UPDATE membership_plans SET name = '30 Day Pass' WHERE id = 'month_pass';
UPDATE membership_plans SET name = '365 Day Pass' WHERE id = 'year_pass';

-- Insert visit passes
INSERT INTO membership_plans (id, name, duration_days, duration_visits, price_vnd, description)
VALUES
  ('visit_5', '5 Visit Pass', 0, 5, 1400000, '5 gym visits'),
  ('visit_10', '10 Visit Pass', 0, 10, 3300000, '10 gym visits'),
  ('visit_20', '20 Visit Pass', 0, 20, 6800000, '20 gym visits')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  duration_visits = EXCLUDED.duration_visits,
  price_vnd = EXCLUDED.price_vnd,
  description = COALESCE(EXCLUDED.description, membership_plans.description);
