# Forecast (Admin Analytics)

## Purpose

Project runway, revenue, and profitability from **current paying members**, **monthly operating costs** (Finance), and **scenario inputs** stored in `forecast_config`.

## Data

| Source | Use |
|--------|-----|
| `member_profiles` | Count members with active day pass (expires in future) or `visits_remaining > 0` |
| Finance (rent + payroll + expenses MTD) | Extrapolated to **monthly_costs** |
| `forecast_config` | `current_cash`, `avg_member_price`, `retention_rate`, `new_members_per_month` |
| Prior month payments + POS | `suggested_avg_price` = last month revenue ÷ current members |

## Logic (`lib/forecast.ts`)

Each month:

- `members = round(members × retention_rate + new_members_per_month)`
- `revenue = members × avg_member_price`
- `profit = revenue − monthly_costs` (costs held flat)

**Runway:** Uses month-1 projected net. If `revenue − costs ≥ 0` → infinite; else `current_cash / |monthly_net|`.

**Break-even (summary):** First projected month with `profit ≥ 0` within the horizon (default 6 months).

## API

- `GET /api/admin/forecast` — analytics role; returns config, `current_members`, `monthly_costs`, suggestions.
- `PATCH /api/admin/forecast` — JSON body: any of `current_cash`, `avg_member_price`, `retention_rate`, `new_members_per_month`.

## UI

**Analytics → Finance → Forecast** (second tab next to “This month”): same projection UI — summary cards, 6-month table, scenario inputs, save. Dashed placeholder for future charts.

## Migration

`056_forecast_config.sql` — table + seed row (cash from `finance_config` when present).
