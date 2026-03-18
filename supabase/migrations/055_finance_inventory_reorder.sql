-- Finance: staff compensation, expenses, config, payroll records, monthly audit snapshots
-- Inventory: front-desk restock requests → finance visibility & optional expense linkage

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS monthly_salary numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric(8,6) NOT NULL DEFAULT 0;

COMMENT ON COLUMN staff_profiles.monthly_salary IS 'Base monthly salary (VND)';
COMMENT ON COLUMN staff_profiles.commission_rate IS 'Variable pay as fraction of POS sales in period, e.g. 0.05; if 0, finance uses sum of POS commission_amount';

CREATE TABLE IF NOT EXISTS finance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_amount numeric(14,2) NOT NULL DEFAULT 0,
  rent_due_day int NOT NULL DEFAULT 1 CHECK (rent_due_day >= 1 AND rent_due_day <= 28),
  payroll_day int NOT NULL DEFAULT 25 CHECK (payroll_day >= 1 AND payroll_day <= 28),
  current_cash numeric(16,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO finance_config (rent_amount, rent_due_day, payroll_day, current_cash)
SELECT 0, 1, 25, 0::numeric
WHERE NOT EXISTS (SELECT 1 FROM finance_config LIMIT 1);

CREATE TABLE IF NOT EXISTS inventory_reorder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity_requested int NOT NULL CHECK (quantity_requested > 0),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  requested_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  estimated_unit_cost numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_reorder_pending ON inventory_reorder_requests(created_at DESC)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  category text NOT NULL CHECK (category IN ('inventory', 'equipment', 'misc', 'rent', 'payroll', 'inventory_restock')),
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  cost numeric(14,2) NOT NULL CHECK (cost >= 0),
  created_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  notes text,
  reorder_request_id uuid REFERENCES inventory_reorder_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC);

CREATE TABLE IF NOT EXISTS payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL,
  total_amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key)
);

CREATE TABLE IF NOT EXISTS finance_monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL UNIQUE,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  costs_total numeric(14,2) NOT NULL DEFAULT 0,
  profit numeric(14,2) NOT NULL DEFAULT 0,
  payroll_total numeric(14,2),
  rent_amount numeric(14,2),
  expenses_total numeric(14,2),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE finance_monthly_snapshots IS 'Optional month-end close for audit; not auto-filled';
COMMENT ON TABLE inventory_reorder_requests IS 'Front desk / ops request more stock; finance records cost via expenses when ordered';
