-- Until end of year: price and duration computed dynamically in API
INSERT INTO membership_plans (id, name, duration_days, price_vnd)
VALUES ('until_end_of_year', 'Until end of year', 0, 0)
ON CONFLICT (id) DO NOTHING;
