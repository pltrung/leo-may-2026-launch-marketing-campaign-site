-- Refund-as-credit: member balance applied to future merch/passes.
-- Automation toggles: birthday and first-visit send mode (manual vs campaign).

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS credit_balance_vnd int NOT NULL DEFAULT 0;

COMMENT ON COLUMN member_profiles.credit_balance_vnd IS 'Credit from refunds; applied at POS or pass purchase.';

ALTER TABLE gym_operational_settings
  ADD COLUMN IF NOT EXISTS birthday_send_mode text NOT NULL DEFAULT 'manual'
    CHECK (birthday_send_mode IN ('manual', 'campaign'));
ALTER TABLE gym_operational_settings
  ADD COLUMN IF NOT EXISTS first_visit_send_mode text NOT NULL DEFAULT 'manual'
    CHECK (first_visit_send_mode IN ('manual', 'campaign'));

COMMENT ON COLUMN gym_operational_settings.birthday_send_mode IS 'manual = mark sent in hub; campaign = use Analytics segment.';
COMMENT ON COLUMN gym_operational_settings.first_visit_send_mode IS 'manual = mark welcomed in hub; campaign = use Analytics segment.';

-- Optional: track credit applied on POS for reporting
ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS credit_applied_vnd int NOT NULL DEFAULT 0;
