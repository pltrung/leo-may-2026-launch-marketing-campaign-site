-- Add a dedicated kiosk role for staff attendance scanning only.
ALTER TABLE staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_role_check;

ALTER TABLE staff_profiles
  ADD CONSTRAINT staff_profiles_role_check
  CHECK (role IN ('admin', 'frontdesk', 'route_setter', 'coach', 'checkin_operator'));
