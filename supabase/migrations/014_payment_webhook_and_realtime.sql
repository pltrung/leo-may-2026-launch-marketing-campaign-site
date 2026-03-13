-- Optional transaction_id for webhook idempotency
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_transaction_id
  ON payments (gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;

-- Allow members to SELECT their own payments (required for realtime subscription)
CREATE POLICY payments_select_own ON payments FOR SELECT
  USING (
    member_id IN (SELECT id FROM member_profiles WHERE auth_id = auth.uid())
  );

-- Enable realtime on payments
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
