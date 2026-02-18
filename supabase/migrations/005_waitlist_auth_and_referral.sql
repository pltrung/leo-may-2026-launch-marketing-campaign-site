-- Link waitlist to Supabase Auth; add verification and referral-by-id.
-- DO NOT replace waitlist — only add columns and indexes.
-- Run in Supabase SQL Editor as project owner.

-- New columns
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- referral_code already exists (text UNIQUE). Ensure unique index by name.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_referral_code_unique ON waitlist (referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS waitlist_auth_id_idx ON waitlist (auth_id);

-- Migrate referred_by from text (referral_code) to uuid (waitlist.id). Idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'waitlist' AND column_name = 'referred_by' AND data_type = 'text') THEN
    ALTER TABLE waitlist ADD COLUMN referred_by_uuid uuid REFERENCES waitlist(id);
    UPDATE waitlist w SET referred_by_uuid = r.id FROM waitlist r WHERE w.referred_by IS NOT NULL AND TRIM(w.referred_by) <> '' AND w.referred_by = r.referral_code;
    ALTER TABLE waitlist DROP COLUMN referred_by;
    ALTER TABLE waitlist RENAME COLUMN referred_by_uuid TO referred_by;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'waitlist' AND column_name = 'referred_by') THEN
    ALTER TABLE waitlist ADD COLUMN referred_by uuid REFERENCES waitlist(id);
  END IF;
END $$;

-- Trigger to set updated_at
CREATE OR REPLACE FUNCTION set_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_updated_at ON waitlist;
CREATE TRIGGER waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION set_waitlist_updated_at();

-- RPC: confirm referral (only for verified user; one-time; no self-referral)
CREATE OR REPLACE FUNCTION confirm_referral(ref_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_auth_id uuid;
  current_row waitlist%ROWTYPE;
  referrer_row waitlist%ROWTYPE;
  new_count int;
BEGIN
  IF ref_code IS NULL OR TRIM(ref_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ref_code required');
  END IF;

  current_auth_id := auth.uid();
  IF current_auth_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO current_row FROM waitlist WHERE auth_id = current_auth_id LIMIT 1;
  IF current_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'waitlist_row_not_found');
  END IF;
  IF current_row.is_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_verified');
  END IF;

  SELECT * INTO referrer_row FROM waitlist WHERE referral_code = TRIM(ref_code) LIMIT 1;
  IF referrer_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'referrer_not_found');
  END IF;
  IF current_row.id = referrer_row.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral_blocked');
  END IF;
  IF current_row.referred_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  UPDATE waitlist SET referred_by = referrer_row.id WHERE id = current_row.id;
  UPDATE waitlist SET referral_count = referral_count + 1 WHERE id = referrer_row.id RETURNING referral_count INTO new_count;

  RETURN jsonb_build_object(
    'ok', true,
    'referral_count', new_count,
    'referred_by_id', referrer_row.id
  );
END;
$$;

-- Allow authenticated users to call confirm_referral
GRANT EXECUTE ON FUNCTION confirm_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_referral(text) TO service_role;
