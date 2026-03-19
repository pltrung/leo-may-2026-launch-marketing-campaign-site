-- Pending bank transfers: SePay webhook matches amount + payment_code → auto-fulfill
-- No FKs: runs even if migrations are applied out of order (member_profiles / membership_plans from earlier migrations).
CREATE TABLE IF NOT EXISTS vietqr_pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code text NOT NULL,
  member_id uuid NOT NULL,
  plan_id text NOT NULL,
  amount_vnd int NOT NULL,
  memo_qr text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  sepay_transaction_id bigint UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vietqr_pending_payment_code
  ON vietqr_pending_orders (payment_code) WHERE fulfilled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vietqr_pending_open
  ON vietqr_pending_orders (member_id, plan_id) WHERE fulfilled_at IS NULL;

ALTER TABLE vietqr_pending_orders ENABLE ROW LEVEL SECURITY;
