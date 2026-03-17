# Flow & Technical Analysis: /dashboard, /staff, /admin

This document describes the full flow, technical details, and all modules that power the three main app areas: **Dashboard** (members), **Staff** (route setters), and **Admin** (gym operators).

---

## 1. Route structure

| Route | Purpose | Auth |
|-------|--------|------|
| `/[locale]/dashboard` | Member dashboard (post-login) | Supabase session → member profile |
| `/[locale]/staff` or `/staff` | Route setter / staff hub | Supabase session → staff profile (route_setter emails) |
| `/admin` | Admin back office (front desk, ops, management) | Supabase session → admin emails |

- **Dashboard** is under `[locale]` (e.g. `/en/dashboard`, `/vi/dashboard`). **Staff** exists both at `/staff` and `/[locale]/staff`; `[locale]/staff` redirects to `/staff`. **Admin** has no locale segment.

---

## 2. Layouts

All three areas use a **route-specific layout** that wraps the page in an auth provider or guard. These layouts sit under the root `app/layout.tsx` (which provides `AuthProvider` for the whole app).

| Route | Layout file(s) | What the layout does |
|-------|----------------|----------------------|
| **/dashboard** | `app/[locale]/dashboard/layout.tsx` | Wraps `children` in `ProtectedRoute`. No chrome (no extra nav/sidebar); the page renders full UI. |
| **/staff** | `app/staff/layout.tsx` and `app/[locale]/staff/layout.tsx` | Both wrap `children` in `RouteSetterAuthProvider`. Same component; staff layout is used for both `/staff` and `/[locale]/staff`. |
| **/admin** | `app/admin/layout.tsx` | Wraps `children` in `AdminAuthProvider`. No extra chrome; the admin page renders its own tabs/nav. |

### 2.1 Dashboard layout

- **File:** `app/[locale]/dashboard/layout.tsx`
- **Client:** `"use client"` (because `ProtectedRoute` uses hooks).
- **Structure:** `ProtectedRoute` → `children`. If no session (after loading), `ProtectedRoute` redirects to `/` and does not render `children`. No header/footer is added here; the dashboard page includes its own hero and content.

### 2.2 Staff layout

- **Files:** `app/staff/layout.tsx`, `app/[locale]/staff/layout.tsx` (identical content).
- **Structure:** `RouteSetterAuthProvider` → `children`. The provider supplies session, staff profile, `staffFetch`, and sign-in/out. The staff **page** decides whether to show the login form or the staff UI; the layout does not redirect.

### 2.3 Admin layout

- **File:** `app/admin/layout.tsx`
- **Structure:** `AdminAuthProvider` → `children`. The provider supplies `isAdmin`, `loading`, `adminFetch`, sign-in/out. The admin **page** shows `AdminLoginForm` when not admin, or the main admin UI when authorized. The layout does not add any shell; the page contains the three-area tabs (Front desk, Operations, Management).

### 2.4 Nesting with root layout

- **Root:** `app/layout.tsx` wraps the app in `AuthProvider` (and other global providers). So every route, including `/dashboard`, `/staff`, and `/admin`, has access to the global `AuthContext`.
- **Dashboard** uses that global auth and adds a **protection** layer (`ProtectedRoute`) so only logged-in members see the dashboard.
- **Staff** and **admin** add their **own** auth contexts (`RouteSetterAuthProvider`, `AdminAuthProvider`) and do not use `ProtectedRoute`; their pages handle “show login vs show app” internally.

---

## 3. /dashboard — Member dashboard

### 3.1 Flow

1. **Layout** (`app/[locale]/dashboard/layout.tsx`) wraps children in `ProtectedRoute`.
2. **ProtectedRoute** (`components/ProtectedRoute.tsx`) uses `useAuth()` from the global `AuthContext`. It waits for `loading === false`; if there is no `session`, it redirects to `/`.
3. **Page** (`app/[locale]/dashboard/page.tsx`) is a client component that:
   - Uses `useMemberAuth()` (same as `useAuth()`) for `session`, `member`, `accessToken`, `refresh`.
   - Fetches: occupancy, member progress, newbie class, leaderboard, plans, member payments; subscribes to Supabase realtime for `payments` and `gym_checkins` for the member.
   - Handles VNPay return (payment success) and URL cleanup.
   - Renders dashboard UI: hero, membership card, events, progress, leaderboard, packages, payment history, modals (profile, package detail, payment, event detail, waiver, achievement unlock).
4. **QR code**: Member can request a QR token via `/api/member/qr-token` and display it (e.g. for check-in at gym).

### 3.2 Auth and data source

- **Auth**: Global `AuthProvider` in `app/layout.tsx`. It holds Supabase `session`, `user`, and `member` (from `/api/member/me`). `useMemberAuth()` in `lib/useMemberAuth.ts` simply re-exports `useAuth()` so dashboard/waiver/gym header use one source of truth.
- **Member profile**: Fetched by `AuthContext` via `GET /api/member/me` (Bearer token). That API uses Supabase Auth to resolve the user, then loads/creates `member_profiles` row (including migration from waitlist by `auth_id`).

### 3.3 APIs used by dashboard

| API | Purpose |
|-----|--------|
| `GET /api/member/me` | Current member profile (used by AuthContext) |
| `GET /api/member/qr-token` | QR token for member check-in |
| `GET /api/occupancy` | Current gym occupancy count |
| `GET /api/member/progress` | Climbing progress (level, streak, etc.) |
| `GET /api/member/newbie-class` | Upcoming newbie class if applicable |
| `GET /api/member/leaderboard` | Leaderboard (with period/gender params) |
| `GET /api/plans` | Available membership plans |
| `GET /api/member/payments` | Payment and purchase history |
| `GET /api/member/membership` | Membership state (for upgrades/renewals) |
| `GET /api/member/vietqr?plan_id=...` | VietQR payment URL for a plan |
| `GET /api/member/vnpay?...)` | VNPay payment redirect (query params) |

### 3.4 Components (dashboard-specific)

| Component | Role |
|-----------|------|
| `components/dashboard/ProfileModal` | Edit profile (photo, name, etc.) |
| `components/dashboard/PackageDetailModal` | Plan details and purchase entry |
| `components/dashboard/PaymentModal` | Payment flow (VietQR/cash, etc.) |
| `components/dashboard/EventDetailModal` | Event info (from `DASHBOARD_EVENTS`) |
| `components/dashboard/WaiverModal` | Waiver view/sign |
| `components/dashboard/AchievementUnlockModal` | Achievement unlock popup |
| `components/dashboard/EidQrScannerModal` | eID QR scan (if used) |
| `components/ProtectedRoute` | Redirect to `/` if not logged in |
| `components/Logo`, `components/LocaleProvider`, `components/HeroStarfield` | Shared UI |

### 3.5 Lib modules used by dashboard

| Module | Purpose |
|--------|--------|
| `lib/useMemberAuth` | Re-export of `useAuth()` for member-facing UI |
| `lib/supabaseBrowser` | Browser Supabase client (realtime, etc.) |
| `lib/heroConstants` | Hero section constants |
| `lib/announcementConfig` | Announcement / social links |
| `context/AuthContext` | Session + member profile state; calls `/api/member/me`, refresh, signOut |

---

## 4. /staff — Route setter / staff hub

### 4.1 Flow

1. **Layout** (`app/staff/layout.tsx` and `app/[locale]/staff/layout.tsx`) wraps children in `RouteSetterAuthProvider`.
2. **RouteSetterAuthContext** (`components/route-setter/RouteSetterAuthContext.tsx`):
   - Uses same Supabase Auth as rest of app but restricts to **route setter emails** (`lib/routeSetterAuth.ts`: `routesetter1@gym.local` … `routesetter4@gym.local`).
   - On session with allowed email: fetches staff profile via `GET /api/route-setter/me` and exposes `staff`, `staffFetch`, `refreshStaff`.
3. **Page** (`app/staff/page.tsx`): If not logged in, shows `RouteSetterLoginForm`; else shows staff UI:
   - **Attendance**: Check in/out via `POST /api/route-setter/attendance`; load state via `GET /api/route-setter/attendance`.
   - **Sessions**: List/assign coaching sessions (`/api/route-setter/sessions`, `/api/route-setter/sessions/assign`).
   - **Zones**: Route zones and resets (`/api/route-setter/zones`, `/api/route-setter/zones/[id]/reset`, assign/unassign).
   - **Tasks**: Pre-open / during / closing tasks; complete via `PATCH /api/route-setter/tasks/[id]`.
   - **QR token**: Staff can get a QR for gym use via `GET /api/route-setter/qr-token`.
   - **Profile**: Update display name via `PATCH /api/route-setter/profile`.

### 4.2 Auth and data source

- **Auth**: `RouteSetterAuthProvider` in staff layout. It listens to Supabase `onAuthStateChange` and `getSession`; if the email is in `ROUTE_SETTER_EMAILS`, it fetches `/api/route-setter/me` to get `staff_profiles` (id, auth_id, email, role, display_name). All staff API calls use `staffFetch`, which adds `Authorization: Bearer <access_token>`.
- **Staff profile**: From table `staff_profiles`; resolved in `/api/route-setter/me` using `getRouteSetterFromRequest` (validates Bearer token and route setter email).

### 4.3 APIs used by staff

| API | Purpose |
|-----|--------|
| `GET /api/route-setter/me` | Current staff profile |
| `GET/POST /api/route-setter/attendance` | Daily check-in/out |
| `GET /api/route-setter/sessions` | Coaching sessions (e.g. today) |
| `POST /api/route-setter/sessions/assign` | Assign self to session |
| `GET /api/route-setter/zones` | Route zones and reset state |
| `POST /api/route-setter/zones/[id]/reset` | Start zone reset |
| `DELETE /api/route-setter/zones/[id]/unassign` | Unassign from zone |
| `POST /api/route-setter/zones/[id]/assign` | Assign to zone |
| `GET /api/route-setter/tasks` | Tasks (pre_open, during_hours, closing) |
| `PATCH /api/route-setter/tasks/[id]` | Complete/update task |
| `PATCH /api/route-setter/profile` | Update display name |
| `GET /api/route-setter/qr-token` | Staff QR token |

### 4.4 Components (staff-specific)

| Component | Role |
|-----------|------|
| `components/route-setter/RouteSetterLoginForm` | Staff login (email/password) |
| `components/route-setter/RouteSetterAuthContext` | Staff session + profile + `staffFetch` |

### 4.5 Lib modules used by staff

| Module | Purpose |
|--------|--------|
| `lib/routeSetterAuth` | `ROUTE_SETTER_EMAILS`, `isRouteSetterEmail`, `getRouteSetterFromRequest` for API auth |
| `lib/supabaseBrowser` | Supabase client for auth state |
| `lib/messages` | UI strings (admin/staff share message sets) |
| `lib/i18n` | Locale type (`en` \| `vi`) |
| `lib/gymTimezone` | Gym date/today in `America/Los_Angeles` for sessions/zones |

---

## 5. /admin — Admin back office

### 5.1 Flow

1. **Layout** (`app/admin/layout.tsx`) wraps children in `AdminAuthProvider`.
2. **AdminAuthContext** (`components/admin/AdminAuthContext.tsx`):
   - Uses Supabase Auth; only considers session valid for **admin emails** (`lib/adminAuth.ts`: `admin001@gym.local` … `admin003@gym.local`).
   - Exposes `isAdmin`, `signIn`, `signOut`, and `adminFetch` (fetch with `Authorization: Bearer <access_token>`).
3. **Page** (`app/admin/page.tsx`): Single large client page. If not admin, shows `AdminLoginForm`; else shows three main areas (tabs):
   - **Front desk**: Check-in (member lookup by ID/name/QR, manual check-in, undo), member profile (summary, membership, sales, history), payments (VietQR, confirm), new member form.
   - **Operations**: Staff overview (attendance, sessions, zones, tasks), zone resets and setter assignments, task completion, attendance reset.
   - **Management**: Inventory (barcode scan, create product with variants, stock in/out, view inventory, product detail edit), POS (cart, barcode lookup, checkout, VietQR/cash, confirm), Reporting (check-ins, revenue), Admin tools (e.g. monthly attendance).

Admin uses **gym timezone** for “today”, revenue periods, and check-in lists.

### 5.2 Auth and data source

- **Auth**: `AdminAuthProvider` in admin layout. Access is granted if (1) email is in `ADMIN_EMAILS`, or (2) email is in `ROUTE_SETTER_EMAILS` (auto-create staff_profiles as route_setter), or (3) the user has a row in `staff_profiles` (e.g. frontdesk, coach). **Front desk / Staff login**: Create the user in Supabase Auth (Authentication → Users), then ensure a `staff_profiles` row exists with that user’s `auth_id` and the right `role` (`frontdesk`, `admin`, `route_setter`, `coach`). For **frontdesk001@gym.local**, run: `npx tsx scripts/seed-frontdesk-users.ts` (uses `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`). The script creates or finds the Auth user (paginating through users if needed), sets password to `leomay2026`, and creates/updates the `staff_profiles` row with `role: frontdesk`. Without the `staff_profiles` row, login will show "Invalid email or password" after a valid Supabase sign-in.
- **Data**: Members from `member_profiles`, payments from `payments`, products/variants/inventory from `products`, `product_variants`, `inventory`; staff from `staff_profiles` and related attendance/sessions/zones/tasks tables. Check-in is performed via shared `performCheckIn` and optionally audited via `auditLog`.

### 5.3 APIs used by admin

| API | Purpose |
|-----|--------|
| `GET /api/admin/plans` | Plans for membership sales |
| `GET /api/admin/members?id=...` or `?name=...` | Member lookup |
| `GET /api/admin/members/purchases?member_id=...` | Member purchases |
| `GET /api/admin/checkin` (POST) | Manual check-in (body: member_id, location) — uses `performCheckIn` |
| `GET /api/admin/checkins?days=7` | Recent check-ins list |
| `GET /api/admin/occupancy` | Current occupancy |
| `GET /api/admin/membership` (POST/PATCH) | Create/update membership (new member, extend, freeze, etc.) |
| `GET /api/admin/vietqr?plan_id=...&member_id=...` | VietQR URL for payment |
| `POST /api/admin/payments/confirm` | Confirm payment (e.g. cash) |
| `GET /api/admin/payments?member_id=...` | Payments for member |
| `GET /api/admin/staff` | Staff list + attendance + sessions + zones + tasks (aggregated) |
| `POST /api/admin/staff/checkin` | Record staff check-in (admin-initiated) |
| `GET /api/admin/staff/attendance-summary?period=month&year=...&month=...` | Monthly attendance summary |
| `POST /api/admin/staff/reset-attendance` | Reset staff attendance (admin tool) |
| `GET/POST/PATCH /api/admin/inventory` | List inventory, stock in (POST), stock out (PATCH) |
| `GET /api/admin/variants/by-barcode?barcode=...` | Lookup variant + stock + other sizes |
| `GET /api/admin/products`, `GET /api/admin/products/[id]` | Products with variants |
| `POST /api/admin/products/with-variants` | Create product + variants |
| `PATCH /api/admin/products/[id]` | Update product |
| `PATCH /api/admin/variants/[id]` | Update variant |
| `POST /api/admin/upload/product-image` | Upload product image (base64 → URL) |
| `POST /api/admin/pos/checkout` | Create POS transaction |
| `POST /api/admin/pos/confirm` | Confirm POS payment |
| `GET /api/admin/revenue?period=day|week|month` | Revenue report |
| `GET/POST /api/admin/routes/zones/[id]/assignments` | Zone setter assignments |
| `POST /api/admin/routes/zones/[id]/reset` | Trigger zone reset |

### 5.4 Components (admin-specific)

| Component | Role |
|-----------|------|
| `components/admin/AdminAuthContext` | Admin session, `adminFetch`, sign in/out |
| `components/admin/AdminLoginForm` | Admin login form |
| `components/admin/QrScannerModal` | Scan member QR for lookup/check-in |
| `components/admin/BarcodeScannerModal` | Scan barcode (inventory/POS) |

### 5.5 Lib modules used by admin

| Module | Purpose |
|--------|--------|
| `lib/adminAuth` | `ADMIN_EMAILS`, `isAdminEmail`, `getAdminFromRequest` for API auth |
| `lib/supabaseBrowser` | Used by AdminAuthContext for auth |
| `lib/messages` | UI strings (admin + staff) |
| `lib/i18n` | Locale type |
| `lib/gymTimezone` | `getGymToday`, `getGymDateFromISO`, etc. for front desk and reporting |
| `lib/performCheckIn` | Shared check-in logic (waiver, photo, membership, streak, achievements); used by `/api/checkin` and `/api/admin/checkin` |
| `lib/auditLog` | `insertAdminAuditLog`, `getStaffIdFromAuthId` for admin check-in audit trail |

---

## 6. Shared and cross-cutting modules

### 6.1 Auth and Supabase

| Module | Purpose |
|--------|--------|
| `context/AuthContext` | Global member auth: session, member profile via `/api/member/me`, refresh, signOut. Used by dashboard and any member UI. |
| `lib/supabaseBrowser` | Browser Supabase client (auth + realtime). Used by dashboard, staff, and admin auth contexts. |
| `lib/supabaseServer` | Server Supabase client (service role or anon with RLS). Used in API routes and `performCheckIn`. |
| `lib/adminAuth` | Admin email allowlist and `getAdminFromRequest` for admin API routes. |
| `lib/routeSetterAuth` | Route setter email allowlist and `getRouteSetterFromRequest` for staff API routes. |

### 6.2 Check-in

| Module | Purpose |
|--------|--------|
| `lib/performCheckIn` | Single place for check-in logic: load member, validate waiver + photo + membership, insert `gym_checkins`, update streaks and achievements. Used by `POST /api/checkin` and `POST /api/admin/checkin`. |
| `app/api/checkin/route.ts` | Public check-in (e.g. by QR token or member_id + token). Calls `performCheckIn`. |
| `app/api/admin/checkin/route.ts` | Admin check-in (member_id in body); calls `performCheckIn` then audit log. |

### 6.3 i18n and messaging

| Module | Purpose |
|--------|--------|
| `lib/i18n` | `Locale` type, `locales`, `defaultLocale`, `isValidLocale`. |
| `lib/messages` | Central message bundles (e.g. `getMessages(locale)`); used by admin and staff for labels, buttons, errors. |

### 6.4 Gym timezone

| Module | Purpose |
|--------|--------|
| `lib/gymTimezone` | `America/Los_Angeles`: `getGymToday()`, `getGymDateFromISO(iso)`, `getGymStartOfDay()`, `formatInGymTZ()`. Ensures “today”, revenue periods, check-ins, and staff attendance use the same day boundary. Used by dashboard (optional), staff, and admin. |

### 6.5 Other libs (referenced by dashboard or features)

| Module | Purpose |
|--------|--------|
| `lib/achievements` | Streak and achievement evaluation; used inside `performCheckIn`. |
| `lib/evolutionLevels` | Used by `/api/member/me` for tier display. |
| `lib/heroConstants` | Hero background/constants for dashboard. |
| `lib/announcementConfig` | Social/announcement links. |
| `lib/waiverText` | Waiver content for waiver modal/signing. |
| `lib/vietqr` | VietQR generation (used by member and admin payment flows). |
| `lib/vnpay` | VNPay redirect/return handling. |
| `lib/qrTokens` | QR token generation/validation for member and staff check-in. |

---

## 7. Why these modules exist (summary)

- **Separate auth contexts (Admin vs Route setter vs Member)**  
  Three different roles with different allowlists and API surfaces: members use global `AuthContext` and `/api/member/*`; staff use `RouteSetterAuthContext` and `/api/route-setter/*`; admins use `AdminAuthContext` and `/api/admin/*`. Each context attaches the correct Bearer token and only allows access for the right email list.

- **Single check-in implementation (`performCheckIn`)**  
  So both self-service (e.g. QR) and admin-initiated check-in share the same validation (waiver, photo, membership) and side effects (check-in row, streaks, achievements), and only the admin path adds an audit log.

- **Gym timezone (`gymTimezone`)**  
  So “today”, revenue “day/week/month”, check-in lists, and staff attendance are all in the same timezone and day boundary, regardless of server or user locale.

- **Central messages (`messages`)**  
  Admin and staff UIs share the same copy and locale switching without duplicating strings.

- **Admin vs route-setter APIs**  
  Admins can manage members, payments, inventory, POS, and staff data; route setters only manage their own attendance, sessions, zones, and tasks. So admin routes are under `/api/admin/*` and staff routes under `/api/route-setter/*`, with different auth helpers (`getAdminFromRequest` vs `getRouteSetterFromRequest`).

---

## 8. Role-based access (unified /admin)

Access to `/admin` is unified: **admin**, **frontdesk**, and **staff** roles (from `staff_profiles.role` or admin email) see different tabs and capabilities. Staff do not need a separate /staff UI for ops—they use the same /admin with role-based visibility.

### 8.1 Admin

| Tabs visible | What they see |
|--------------|----------------|
| **Front Desk** | Check-in (scan QR, quick check-in, occupancy, recent check-ins), Member (lookup, profile: Summary, Membership, Sales, History). |
| **Operations** | Staff overview (attendance, sessions, zones, tasks), zone resets and setter assignments, task completion, staff check-in, reset attendance. |
| **Management** | **Inventory** (scan, create product, stock in/out, view inventory, product detail), **Reporting** (revenue by day/week/month), **Admin Tools** (e.g. monthly attendance). |

**Can do:** Check-in (auto + manual), undo check-in, member lookup, full member profile and membership controls (collect payment, extend, freeze, cancel, upgrade), POS (cart, checkout, confirm VietQR/cash), revenue view, inventory (full), staff ops (record staff check-in, reset attendance, zone resets, task completion). **Profile** tab in header opens modal (email, role). **Header:** “Leo May Admin” + “Admin Dashboard”. Admin does not see a separate “staff” area; staff ops are under Operations and Management.

**Modules behind:** All `/api/admin/*` routes; `lib/unifiedAdminAuth` (role admin), `lib/performCheckIn`, `lib/auditLog`, `lib/gymTimezone`, `lib/messages`, product/inventory/pos/plans/vietqr/payments/membership/checkin/checkins/revenue/staff/routes APIs.

---

### 8.2 Frontdesk

| Tabs visible | What they see |
|--------------|----------------|
| **Front Desk** | Same as admin: Check-in (scan QR, quick check-in, occupancy, recent check-ins), Member (lookup, Summary, Membership, Sales, History). |
| **Management** | **Inventory only** (no Reporting, no Admin Tools). |

**Can do:** Check-in (auto + manual), undo check-in, member lookup, full member profile and membership (collect payment, extend, freeze, cancel, upgrade), POS (cart, checkout, confirm VietQR/cash), **inventory** (scan, create product, stock in/out, view inventory, product detail). **Shift check-in** (when frontdesk has `staffId`): QR for front desk to scan or “Not working today” (GET/POST staff/my-attendance, GET staff/qr-token) on Front Desk tab. **Profile** tab in header opens modal (email, role, display name editable; for staff/frontdesk: **verify identity** same as /dashboard — DOB, Govt ID, Scan VN eID, gender, address; once verified from CCCD, fields are read-only). **Header:** “Leo May Admin” + “Front Desk Dashboard”; current gym phase. Cannot: access Operations tab, revenue/reporting, admin tools, staff check-in (record others), reset attendance.

**Modules behind:** Same as admin for Front Desk + Inventory: `canAccessFrontDeskFull`, `canAccessManagement`, `canAccessInventory`; APIs: checkin, checkins, occupancy, members, members/purchases, membership, payments, payments/confirm, vietqr, plans, pos/checkout, pos/confirm, products (GET/POST), products/[id], products/with-variants, variants/by-barcode, variants/[id], inventory (GET/POST/PATCH), upload/product-image.

---

### 8.3 Staff

**Staff do not see the Operations tab.** The Operations tab (Overview with staff-in count, operations alerts, gym ready, full Tasks/Attendance/Coaching/Routes control board) is **admin-only**. Staff instead see a **Staff** tab that reproduces the **old /staff route setter workflow**: phase-based tasks, their own check-in, their zones and coaching—no bird’s-eye view, no “how many staff present”, no operations alerts.

| Tabs visible | What they see |
|--------------|----------------|
| **Front Desk** | **Member tab only** (no Check-in tab): member lookup, profile with **Summary**, **Sales** (POS), **History** only (no Membership sub-tab). **Shift check-in** block at top when user has `staffId`: QR code (for front desk to scan) and “Not working today” until checked in. |
| **Staff** | **Same as old /staff** (not the admin Operations board): **Daily attendance** (QR for front desk to scan, “Not working today”); when **IN**: profile, “You’re checked in”, route reset day banner, **current gym phase**, **active tasks for this phase only** (complete buttons), team timeline, **Routes** tab (zones, assign to me, mark reset complete), **Coaching** tab (my sessions, unassigned with assign to me). No Overview, no staff-present count, no operations alerts, no Management. |

**Can do:** Member lookup, view member Summary/Sales/History, **POS** (cart, checkout—transactions attributed to their `staff_id` with commission). **Shift check-in:** show QR for front desk to scan or mark “Not working today” (GET/POST staff/my-attendance, GET staff/qr-token). **Staff tab only:** focus on **tasks for current gym phase** (pre-open / gym open / closing), complete tasks (PATCH staff/tasks/[id]), assign self to zones, assign session to me (POST staff/sessions/assign), mark zone reset complete. **Profile** tab in header opens modal (email, role, display name editable; for staff/frontdesk: **verify identity** same as /dashboard — DOB, Govt ID, Scan VN eID, gender, address; once verified from CCCD, fields are read-only). **Header:** “Leo May Admin” + “Staff Dashboard”; current gym phase. Sees “My Sales Today” and “My Commission Earned” when `staffId` set. Cannot: see Operations tab, check-in members or manual check-in, membership create/modify, payment confirm, revenue, inventory, admin tools, staff check-in (record others), reset attendance.

**Modules behind:** `canAccessFrontDeskLimited`; Staff tab uses GET staff (canAccessOperations) only for data (zones, tasks, sessions, myAttendance). APIs: me (phase, staffProfile), me/sales-summary, staff (GET, includes myAttendance), staff/qr-token, staff/my-attendance (GET/POST), staff/profile (PATCH), staff/tasks/[id] (PATCH), staff/sessions/assign (POST), routes/zones/assignments (PUT), routes/zones/reset (POST). POS checkout records `staff_id`, `commission_rate`, `commission_amount` on `pos_transactions`.

---

This is the final picture of tabs and modules per role after the unified /admin refactor.
