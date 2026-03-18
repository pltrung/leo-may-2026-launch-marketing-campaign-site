# Finance tab (Analytics)

## Access

**Analytics → Finance** (same role gate as other analytics: admin with analytics access).

## Data model (migration `055_finance_inventory_reorder.sql`)

| Piece | Purpose |
|-------|---------|
| `staff_profiles.monthly_salary`, `commission_rate` | Base pay + variable (rate × POS sales, or actual POS commission if rate = 0) |
| `finance_config` | Single row: `rent_amount`, `rent_due_day`, `payroll_day`, `current_cash` (runway) |
| `expenses` | Logged costs: inventory, equipment, misc; `inventory_restock` when finance records a reorder purchase |
| `payroll_records` | Per month: computed total, `pending` / `paid` |
| `finance_monthly_snapshots` | Optional month-close for audit (manual “Save month snapshot”) |
| `inventory_reorder_requests` | Front desk / inventory “request restock” → Finance records cost |

## Flows

1. **MTD summary** — Revenue (payments + POS), payroll estimate, rent from config, sum of expenses → costs, profit, runway = cash / monthly costs.
2. **Restock** — Front Desk or Management Inventory submits request → listed under Finance → **Record purchase cost** creates an `expenses` row and marks request `ordered`.
3. **Audit** — 6-month history table; per-month expense ledger; optional snapshots with notes.

## APIs

- `GET/POST /api/admin/finance`
- `PATCH /api/admin/finance/config`
- `PATCH /api/admin/finance/payroll-record`
- `PATCH /api/admin/finance/staff-comp`
- `GET /api/admin/finance/expenses-ledger?month=YYYY-MM`
- `POST /api/admin/inventory/reorder-requests` (front desk / inventory)

## Future

Charts, multi-location: keep month_key and config per location when extending.
