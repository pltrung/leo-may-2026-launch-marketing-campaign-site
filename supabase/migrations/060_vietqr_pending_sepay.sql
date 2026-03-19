-- Pending bank transfers: unique code in VietQR memo; SePay webhook matches amount + code → auto-fulfill
CREATE TABLE IF NOT EXISTS vietqr_pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code text NOT NULL,
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES membership_plans(id),
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
