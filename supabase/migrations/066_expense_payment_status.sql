-- Add payables tracking: status and paid_at to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status) WHERE status = 'pending';
