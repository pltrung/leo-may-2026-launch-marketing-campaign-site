-- Unified admin/staff roles and POS commission
-- 1) Extend staff_profiles.role to admin, frontdesk (keep route_setter, coach)
-- 2) Add commission columns to pos_transactions

-- Drop existing role check and add extended role check
ALTER TABLE staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_role_check;

ALTER TABLE staff_profiles
  ADD CONSTRAINT staff_profiles_role_check
  CHECK (role IN ('admin', 'frontdesk', 'route_setter', 'coach'));

-- Add commission columns to pos_transactions (staff_id already exists)
ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_amount int DEFAULT NULL;

COMMENT ON COLUMN pos_transactions.commission_rate IS 'e.g. 0.10 for 10%';
COMMENT ON COLUMN pos_transactions.commission_amount IS 'VND commission for this transaction';
