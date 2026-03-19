# Gym operations modules (admin ↔ dashboard ↔ /gym)

Run migration **`061_gym_operations_modules.sql`** on Supabase before using these features.

## Where things live in the UI

| Area | Location |
|------|----------|
| Capacity, Google/Zalo links, VAT / e-invoice SOP, refunds, corporate leads, birthdays, shift roster | **Admin → Management → Admin tools** → *Operations & compliance* hub |
| Incidents, facility maintenance, equipment inspections | **Admin → Operations** → tab **An toàn & CS** / **Safety & facility** |
| Walk-in SOP, end-of-shift cash / POS notes | **Admin → Front desk → Check-in** (below occupancy) |
| First-visit welcome (shows on member dashboard) | **Admin → Front desk → Member** → member **Summary** → *Mark welcomed* |
| Public Google / Zalo links + corporate form | **`/gym` footer** (links from settings; corporate posts to API) |
| Busy / full gym estimate | **`/dashboard` gym status** (uses `/api/occupancy` + admin capacity settings) |
| Zalo/SMS prefs, minor + guardian | **Dashboard → Profile** (PATCH `/api/member/profile-extras`) |

## APIs (summary)

- `GET/PATCH /api/admin/gym-operations/settings` — admin only; drives occupancy caps and public links.
- `GET/POST /api/admin/gym-operations/payment-adjustments` — admin only.
- `GET/POST/PATCH /api/admin/gym-operations/incidents` — admin or staff.
- `GET/POST/PATCH /api/admin/gym-operations/maintenance` — admin or staff.
- `GET/POST /api/admin/gym-operations/inspections` — admin or staff.
- `GET/POST/DELETE /api/admin/gym-operations/roster` — admin or staff (`?include_staff=1` returns staff directory).
- `GET/POST /api/admin/gym-operations/shift-close` — any logged-in admin/frontdesk/staff.
- `GET/PATCH /api/admin/gym-operations/corporate-inquiries` — admin (list/update status).
- `POST /api/gym/corporate-interest` — public.
- `GET /api/gym/public-settings` — public cached links.
- `GET /api/admin/gym-operations/birthday-queue?days=14` — admin.
- `POST /api/admin/gym-operations/birthday-mark-sent` — admin.
- `POST /api/admin/gym-operations/first-visit-welcome` — admin or staff.
- `PATCH /api/member/profile-extras` — member Bearer token.
- `GET /api/occupancy` — public; returns `count`, `maxCapacity`, `isBusy`, `isAtCapacity`, etc.
- `GET /api/cron/gym-ops-digest?secret=CRON_SECRET` — optional monitoring (set `CRON_SECRET` in env).

## Engineering

- `GET /api/plans` and occupancy routes use `export const dynamic = "force-dynamic"` to avoid build-time DB access.

## Notes

- **Zalo/SMS**: the app stores **preferences and IDs** only; actual sending stays in your Zalo OA / SMS provider workflow.
- **E-invoice**: workflow text + tax ID are **reference fields**; integrate a certified Vietnamese e-invoice provider separately if required.
- **Refunds**: `payment_adjustments` is an **audit log**; adjust membership in your existing admin flows as needed.
