-- Paid tier upgrades: contribution, Stripe, tier level.
-- Tier level is derived from total_contribution_usd (see app logic / webhook).
-- Run after 006.

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS tier_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_contribution_usd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS contribution_source text,
  ADD COLUMN IF NOT EXISTS upgraded_at timestamptz;

ALTER TABLE waitlist
  DROP CONSTRAINT IF EXISTS waitlist_contribution_source_check;
ALTER TABLE waitlist
  ADD CONSTRAINT waitlist_contribution_source_check
  CHECK (contribution_source IS NULL OR contribution_source IN ('referral', 'payment', 'mixed'));

CREATE INDEX IF NOT EXISTS idx_waitlist_tier_level ON waitlist (tier_level);
CREATE INDEX IF NOT EXISTS idx_waitlist_stripe_customer ON waitlist (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN waitlist.tier_level IS '1-6, derived from total_contribution_usd or MAX(referral_tier, payment_tier)';
COMMENT ON COLUMN waitlist.total_contribution_usd IS 'Whole USD (5 = $5). Updated only by Stripe webhook.';

-- Idempotency: one row per completed checkout session so webhook double-fire does not double-apply
CREATE TABLE IF NOT EXISTS stripe_checkout_completed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  waitlist_id uuid NOT NULL REFERENCES waitlist(id),
  amount_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_checkout_completed_session ON stripe_checkout_completed (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_completed_waitlist ON stripe_checkout_completed (waitlist_id);
