-- Forecast: scenario inputs for runway / revenue / profit projections (admin Analytics → Forecast)

CREATE TABLE IF NOT EXISTS forecast_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_cash numeric(16,2) NOT NULL DEFAULT 0,
  avg_member_price numeric(14,2) NOT NULL DEFAULT 0,
  retention_rate numeric(10,8) NOT NULL DEFAULT 0.92
    CHECK (retention_rate >= 0 AND retention_rate <= 1.00000001),
  new_members_per_month int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO forecast_config (current_cash, avg_member_price, retention_rate, new_members_per_month)
SELECT
  COALESCE((SELECT current_cash FROM finance_config LIMIT 1), 0)::numeric,
  350000::numeric,
  0.92::numeric,
  8
WHERE NOT EXISTS (SELECT 1 FROM forecast_config LIMIT 1);

COMMENT ON TABLE forecast_config IS 'Single-row style: admin forecast scenarios; app uses first row';
