-- Staff compensation: support hourly (based on check-ins per month) or monthly salary
-- 1 check-in per day per staff → payroll uses staff_attendance count × hourly_rate for hourly staff

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS compensation_type text NOT NULL DEFAULT 'monthly'
    CHECK (compensation_type IN ('hourly', 'monthly')),
  ADD COLUMN IF NOT EXISTS hourly_rate_vnd numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN staff_profiles.compensation_type IS 'hourly = pay per check-in (staff_attendance); monthly = fixed monthly_salary';
COMMENT ON COLUMN staff_profiles.hourly_rate_vnd IS 'Pay per check-in (VND) when compensation_type=hourly; 1 check-in per day';
