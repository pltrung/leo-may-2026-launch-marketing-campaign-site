-- Lightweight audit log for admin operational actions.
-- Used for traceability: who did what, when.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  admin_auth_id uuid,
  action_type text NOT NULL,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type
  ON admin_audit_log (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity_id
  ON admin_audit_log (entity_id) WHERE entity_id IS NOT NULL;

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_audit_log_select
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_audit_log_insert
  ON admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
