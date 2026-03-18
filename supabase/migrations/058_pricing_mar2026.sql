-- Mar 2026 pricing (day + visit passes). App reads from membership_plans.

UPDATE membership_plans SET price_vnd = 550000 WHERE id = 'newbie_class';
UPDATE membership_plans SET price_vnd = 390000 WHERE id = 'day_pass';
UPDATE membership_plans SET price_vnd = 1950000 WHERE id = 'month_pass';
UPDATE membership_plans SET price_vnd = 11400000 WHERE id = 'half_year_pass';
UPDATE membership_plans SET price_vnd = 20800000 WHERE id = 'year_pass';

UPDATE membership_plans SET price_vnd = 1500000 WHERE id = 'visit_5';
UPDATE membership_plans SET price_vnd = 2800000 WHERE id = 'visit_10';
UPDATE membership_plans SET price_vnd = 5200000 WHERE id = 'visit_20';

-- Optional copy: per-visit value (visit passes have no extra merch/LMG benefits)
UPDATE membership_plans SET description = '5 visits • ~300,000 VND per visit' WHERE id = 'visit_5';
UPDATE membership_plans SET description = '10 visits • ~280,000 VND per visit' WHERE id = 'visit_10';
UPDATE membership_plans SET description = '20 visits • ~260,000 VND per visit' WHERE id = 'visit_20';
