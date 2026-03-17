# /admin — Flow, UI & Technical Reference

This document describes the **/admin** back office: layout, structure, Front Desk UI and flow, and role-based access. The unified admin serves **admin**, **frontdesk**, and **staff** roles. Separate routes `/dashboard` (members) and `/staff` (route setters) exist but are not covered here.

---

## 1. Route and layout

| Item | Detail |
|------|--------|
| **Route** | `/admin` (no locale segment) |
| **Layout** | `app/admin/layout.tsx` → `AdminAuthProvider` |
| **Page** | `app/admin/page.tsx` — single client page, no shell from layout |
| **Auth** | `AdminAuthContext`; `getUnifiedAdminOrStaffFromRequest` for API auth |

**Auth sources:** (1) `ADMIN_EMAILS` (admin001@gym.local, …), (2) `staff_profiles` row (role: `admin`, `frontdesk`, `route_setter`/`staff`, `coach`). Frontdesk/staff need a `staff_profiles` row with their `auth_id`; run `npx tsx scripts/seed-frontdesk-users.ts` for frontdesk001.

---

## 2. Header (global)

- **Desktop (sm+):** Logo + title "Leo May Admin" + subtitle (Admin Dashboard / Front Desk Dashboard / Staff Dashboard by role) + phase badge + gym occupancy + EN/VN toggle + Profile button + Logout.
- **Mobile:** Logo + phase (row 2) + occupancy + locale + Profile + Logout. Title/subtitle hidden (`hidden sm:block`).
- **Profile button:** Shows display name for staff/frontdesk when set; otherwise "Profile". Opens Profile modal (email, role, display name editable; for staff/frontdesk: verify identity — DOB, Govt ID, Scan VN eID, gender, address).
- **Gym timezone:** `lib/gymTimezone` (America/Los_Angeles) for "today", occupancy, check-ins, phases.

---

## 3. Main area structure

State: `adminArea` ∈ { `front_desk`, `operations`, `management`, `staff`, `analytics` }. Role determines which areas are visible.

| Role | Visible areas |
|------|----------------|
| **admin** | Front Desk, Operations, Management, Analytics |
| **frontdesk** | Front Desk, Management (Inventory only) |
| **staff** | Staff, Front Desk (Member tab only) |

**Main nav:** Sticky bar under header; pills for Front Desk | Operations | Management | Staff | Analytics. Active area highlighted.

**Above main content (conditional):**
- **Staff/frontdesk checked in today:** Compact "You're checked in" bar (sales, commission).
- **Admin:** Collapsible Operations overview (staff present, gym ready, alerts).
- **Front Desk area + staffId:** Shift check-in block (QR for front desk to scan, "Not working today").
- **Frontdesk with staffId:** Sales & commission bar.

---

## 4. Front Desk — UI and flow

**Sub-tabs:** `frontDeskTab` ∈ { `checkin`, `member` }. Staff without `canDoCheckIn` see Member only (default).

### 4.1 Check-in tab (`frontDeskTab === "checkin"`)

**Layout (top to bottom):**

1. **Quick Check-In** — Primary CTA card: "Scan to check-in" button; opens QR scanner modal to scan member QR.
2. **Gym occupancy** — Current count; "climber(s) inside (last 2 hours)".
3. **Recent check-ins (7 days)** — List by day; expandable; each row: member name, code, timestamp; undo for today’s check-ins.

**Flow:**
- Click "Scan to check-in" → `QrScannerModal` → scan member QR → resolve member → call `performCheckIn` (waiver, membership validated) → `POST /api/admin/checkin` → refresh occupancy and recent check-ins.
- Manual check-in: search member in Member tab first, then use check-in action when profile is open.

### 4.2 Member tab (`frontDeskTab === "member"`)

**Layout:**

1. **Member lookup**
   - Search mode: ID | Name | QR. Input + scan button.
   - ID/name: `GET /api/admin/members?id=...` or `?name=...`.
   - QR: `QrScannerModal` → parse token → lookup.
   - Name search: shows list of matches; click to load member.

2. **Member profile** (when `foundMember`)
   - **Sub-tabs:** `memberProfileSubTab` ∈ { `summary`, `membership`, `sales`, `history` }.
   - **Summary:** Profile card (photo, name, membership, status, valid until, check-ins, visits, waiver).
   - **Membership** (if `canDoMembershipModify`): Extend, freeze, cancel, upgrade; payment (VietQR, confirm cash); create new member.
   - **Sales:** POS cart; barcode lookup; checkout; payment confirm (VietQR/cash).
   - **History:** Purchase/payment history.

**Flow:**
- Search → load member → `GET /api/admin/members/purchases` → show profile.
- Membership: select plan → VietQR or cash → confirm payment.
- Sales: add items by barcode → checkout → confirm payment.

---

## 5. Management

**Sub-tabs:** `managementTab` ∈ { `inventory`, `admin_tools` }. Frontdesk sees Inventory only (`canAccessAdminTools` = false for frontdesk).

### 5.1 Inventory

- Barcode scan, create product with variants, stock in/out, view inventory, product detail.
- APIs: `GET/POST/PATCH /api/admin/inventory`, `GET /api/admin/products`, `POST /api/admin/products/with-variants`, etc.

### 5.2 Admin Tools (admin only)

- **Reset today's staff attendance** — `POST /api/admin/staff/reset-attendance`; clears staff check-ins and resets daily tasks.
- **View audit log** — `GET /api/admin/audit-log`; table of who did what, when.
- **Open countdown (display)** — Opens `/[locale]/countdown` in new tab for TV/display.

---

## 6. Operations (admin only)

Staff overview, zone resets, setter assignments, task completion, staff check-in, attendance reset. Tabs: Overview, Tasks, Attendance, Coaching, Routes. Uses `GET /api/admin/staff` and related APIs.

---

## 7. Staff area (staff role)

Replaces Operations for staff. Same as old `/staff`: Daily attendance (QR, "Not working today"), when IN: phase tasks, Routes (zones, assign to me, mark reset), Coaching (sessions, assign to me). Uses `/api/admin/staff/*` and routes APIs.

---

## 8. Analytics (admin only)

Tabs: Overview, Revenue, Members, Retention, Behavior, Funnel, Operations, Staff. Uses `GET /api/admin/analytics`.

---

## 9. APIs (admin)

| API | Purpose |
|-----|---------|
| `GET /api/admin/me` | Current user, role, staffProfile, phase |
| `GET /api/admin/members?id=...` or `?name=...` | Member lookup |
| `GET /api/admin/members/purchases?member_id=...` | Member purchases |
| `POST /api/admin/checkin` | Manual check-in (member_id, location) |
| `GET /api/admin/checkins?days=7` | Recent check-ins |
| `GET /api/admin/occupancy` | Gym occupancy |
| `GET /api/admin/membership` (POST/PATCH) | Create/update membership |
| `GET /api/admin/vietqr?plan_id=...&member_id=...` | VietQR URL |
| `POST /api/admin/payments/confirm` | Confirm payment |
| `GET /api/admin/staff` | Staff list, attendance, sessions, zones, tasks |
| `POST /api/admin/staff/checkin` | Record staff check-in |
| `POST /api/admin/staff/reset-attendance` | Reset today (admin only) |
| `GET /api/admin/audit-log?limit=...` | Audit log (admin only) |
| `GET/POST/PATCH /api/admin/inventory` | Inventory |
| `GET /api/admin/products`, variants, POS, revenue, routes | Products, POS, revenue, zone assignments |

---

## 10. Components

| Component | Role |
|-----------|------|
| `AdminAuthContext` | Session, `adminFetch`, role, staffId, capabilities |
| `AdminLoginForm` | Login (email/password) |
| `QrScannerModal` | Scan member QR |
| `BarcodeScannerModal` | Scan barcode (inventory/POS) |
| `EidQrScannerModal` | Scan VN eID (profile verify) |
| `AnalyticsCharts` | Analytics charts |

---

## 11. Role capability matrix

| Capability | Admin | Frontdesk | Staff |
|------------|-------|-----------|-------|
| Front Desk → Check-in tab | ✓ | ✓ | ✗ |
| Front Desk → Member (full) | ✓ | ✓ | Member tab only |
| Member → Membership modify | ✓ | ✓ | ✗ |
| Member → POS / payment confirm | ✓ | ✓ | ✓ (own commission) |
| Operations | ✓ | ✗ | ✗ |
| Staff area (own tasks/zones) | ✗ | ✗ | ✓ |
| Management → Inventory | ✓ | ✓ | ✗ |
| Management → Admin Tools | ✓ | ✗ | ✗ |
| Analytics | ✓ | ✗ | ✗ |
| Shift check-in (QR, Not working) | ✓ (if staffId) | ✓ (if staffId) | ✓ |
| Profile: display name, verify identity | ✓ | ✓ | ✓ |

---

## 12. Lib modules

| Module | Purpose |
|--------|---------|
| `lib/unifiedAdminAuth` | `getUnifiedAdminOrStaffFromRequest`; role, staffId, capabilities |
| `lib/adminAuth` | `ADMIN_EMAILS`, `isAdminEmail` |
| `lib/gymTimezone` | `getGymToday`, `getCurrentPhase`, `formatInGymTZ` |
| `lib/performCheckIn` | Shared check-in logic |
| `lib/auditLog` | `insertAdminAuditLog`, `getStaffIdFromAuthId` |
| `lib/messages` | UI strings (admin + staff) |
| `lib/i18n` | Locale type |
