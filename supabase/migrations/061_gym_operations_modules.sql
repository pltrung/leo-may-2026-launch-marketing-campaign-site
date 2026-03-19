-- Gym operations extensions: settings, safety, compliance, roster, shift close, corporate leads, member extras.
-- Access via service role in Next.js API routes only (no new RLS policies needed).

-- Singleton operational settings (capacity, public links, VAT / e-invoice notes)
CREATE TABLE IF NOT EXISTS gym_operational_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_occupancy int NOT NULL DEFAULT 30,
  busy_threshold_pct int NOT NULL DEFAULT 70 CHECK (busy_threshold_pct >= 1 AND busy_threshold_pct <= 100),
  google_business_url text,
  google_maps_url text,
  zalo_oa_url text,
  business_tax_id text,
  e_invoice_workflow_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gym_operational_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Refunds / credits (negative amount_vnd = refund)
CREATE TABLE IF NOT EXISTS payment_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  amount_vnd int NOT NULL,
  reason text NOT NULL,
  recorded_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_adjustments_member ON payment_adjustments (member_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_created ON payment_adjustments (created_at DESC);

-- Safety / incident log
CREATE TABLE IF NOT EXISTS facility_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  member_id uuid REFERENCES member_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  reported_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_facility_incidents_created ON facility_incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facility_incidents_status ON facility_incidents (status);

-- Non-route facility maintenance
CREATE TABLE IF NOT EXISTS facility_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  due_date date,
  created_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_facility_maint_status ON facility_maintenance_tasks (status);

-- Equipment / mat inspection logs
CREATE TABLE IF NOT EXISTS equipment_inspection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type text NOT NULL DEFAULT 'daily_mats',
  notes text,
  checklist jsonb,
  checked_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_inspection_created ON equipment_inspection_logs (created_at DESC);

-- Simple shift roster (who is scheduled which day)
CREATE TABLE IF NOT EXISTS staff_shift_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  roster_date date NOT NULL,
  shift_label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, roster_date, shift_label)
);

CREATE INDEX IF NOT EXISTS idx_staff_shift_roster_date ON staff_shift_roster (roster_date);

-- End-of-shift POS / cash reconciliation
CREATE TABLE IF NOT EXISTS pos_shift_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closed_by_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  gym_date date NOT NULL,
  cash_expected_vnd int NOT NULL DEFAULT 0,
  cash_counted_vnd int NOT NULL DEFAULT 0,
  variance_notes text,
  digital_sales_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_shift_closes_date ON pos_shift_closes (gym_date DESC);

-- Corporate / group sales leads
CREATE TABLE IF NOT EXISTS corporate_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corporate_inquiries_created ON corporate_inquiries (created_at DESC);

-- Member profile extensions (minors, Zalo/SMS prefs, lightweight automation flags)
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS guardian_phone text;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS zalo_user_id text;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS prefer_zalo_notifications boolean NOT NULL DEFAULT false;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS prefer_sms_notifications boolean NOT NULL DEFAULT false;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS first_visit_welcomed_at timestamptz;
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS birthday_message_sent_year smallint;

COMMENT ON TABLE gym_operational_settings IS 'Singleton row id=1: capacity caps, public URLs, VAT/e-invoice notes.';
COMMENT ON TABLE payment_adjustments IS 'Manual refunds/credits recorded by admin (links to member / optional payment).';
COMMENT ON TABLE facility_incidents IS 'Safety / incident log for gym operations.';
COMMENT ON TABLE corporate_inquiries IS 'Corporate & group pass inquiries from public form or admin.';
