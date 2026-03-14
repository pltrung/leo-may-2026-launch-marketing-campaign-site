-- Add description column to membership_plans
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS description text;

-- Update day_pass and insert new plans. Do NOT delete old plans (explorer_month, etc.)
-- since payments table references them via foreign key.
UPDATE membership_plans SET
  name = 'Day Pass',
  duration_days = 1,
  price_vnd = 350000,
  description = 'Access for 1 day'
WHERE id = 'day_pass';

INSERT INTO membership_plans (id, name, duration_days, price_vnd, description)
VALUES
  ('month_pass', 'Month Pass', 30, 1750000, 'Unlimited climbing for 30 days'),
  ('year_pass', 'Year Pass', 365, 18900000, 'Unlimited climbing for 365 days'),
  ('newbie_class', 'Newbie Class', 1, 500000, '30 minute coaching session • 1 day climbing access')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  price_vnd = EXCLUDED.price_vnd,
  description = EXCLUDED.description;
