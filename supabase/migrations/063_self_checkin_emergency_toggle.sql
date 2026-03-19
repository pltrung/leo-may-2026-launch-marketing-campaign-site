-- Emergency fallback: allow staff/frontdesk self check-in for a single day.
ALTER TABLE gym_operational_settings
  ADD COLUMN IF NOT EXISTS allow_self_checkin_today boolean NOT NULL DEFAULT false;

ALTER TABLE gym_operational_settings
  ADD COLUMN IF NOT EXISTS allow_self_checkin_date date;

COMMENT ON COLUMN gym_operational_settings.allow_self_checkin_today IS
  'Admin emergency toggle. When true and date matches gym day, staff/frontdesk may self check-in.';
COMMENT ON COLUMN gym_operational_settings.allow_self_checkin_date IS
  'Gym date (YYYY-MM-DD) for emergency self check-in toggle.';
