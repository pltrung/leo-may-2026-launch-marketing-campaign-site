-- Acquisition attribution & ad performance for paid ads + owned campaigns.
-- Phase 1: manual ad stats, UTM capture, funnel joins to signups/payments/check-ins.

-- 1) marketing_attribution: first/last touch, UTM params, click ids
CREATE TABLE IF NOT EXISTS marketing_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES member_profiles(id) ON DELETE SET NULL,
  anonymous_id text,
  session_id text,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_term text,
  fbclid text,
  gclid text,
  ttclid text,
  landing_path text,
  landing_url text,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_at timestamptz,
  raw_params jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_attribution_user ON marketing_attribution (user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_first_touch_at ON marketing_attribution (first_touch_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_source_campaign ON marketing_attribution (first_touch_source, first_touch_campaign);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_landing_path ON marketing_attribution (landing_path);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_anonymous ON marketing_attribution (anonymous_id) WHERE anonymous_id IS NOT NULL;

COMMENT ON TABLE marketing_attribution IS 'First/last touch attribution for ad traffic. Persisted on signup or lead capture.';

-- 2) ad_campaign_daily_stats: manual entry first; external API sync later
CREATE TYPE ad_stats_source_mode AS ENUM ('manual', 'api');

CREATE TABLE IF NOT EXISTS ad_campaign_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date date NOT NULL,
  platform text NOT NULL,
  campaign_id text,
  campaign_name text NOT NULL DEFAULT '',
  adset_name text,
  ad_name text,
  spend numeric(14, 2) NOT NULL DEFAULT 0,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  leads int NOT NULL DEFAULT 0,
  ctr numeric(8, 4),
  cpc numeric(12, 4),
  reach int,
  raw_payload jsonb,
  source_mode ad_stats_source_mode NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_daily_stat_date ON ad_campaign_daily_stats (stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_daily_platform_campaign ON ad_campaign_daily_stats (platform, campaign_name);

COMMENT ON TABLE ad_campaign_daily_stats IS 'Daily ad performance: spend, impressions, clicks, leads. Manual or API-synced.';

-- 3) internal_campaigns: owned campaigns (onsite, promo codes, referral, QR, etc.)
CREATE TABLE IF NOT EXISTS internal_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  start_at timestamptz,
  end_at timestamptz,
  landing_path text,
  promo_code text,
  audience_type text,
  notes text,
  created_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_campaigns_channel ON internal_campaigns (channel);
CREATE INDEX IF NOT EXISTS idx_internal_campaigns_status ON internal_campaigns (status);

-- 4) internal_campaign_events: views, clicks, signups, purchases, first_checkin
CREATE TABLE IF NOT EXISTS internal_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_campaign_id uuid NOT NULL REFERENCES internal_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES member_profiles(id) ON DELETE SET NULL,
  anonymous_id text,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'signup', 'purchase', 'first_checkin', 'redeem_code')),
  event_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_campaign_events_campaign ON internal_campaign_events (internal_campaign_id);
CREATE INDEX IF NOT EXISTS idx_internal_campaign_events_type ON internal_campaign_events (event_type);
CREATE INDEX IF NOT EXISTS idx_internal_campaign_events_at ON internal_campaign_events (event_at DESC);
