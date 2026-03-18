INSERT INTO membership_plans (id, name, duration_days, price_vnd, description)
VALUES (
  'half_year_pass',
  '180 Day Pass',
  180,
  10500000,
  'Unlimited climbing for 180 days'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  price_vnd = EXCLUDED.price_vnd,
  description = EXCLUDED.description;
