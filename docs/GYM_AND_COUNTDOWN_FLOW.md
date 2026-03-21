# /gym Full Flow & Relation to Countdown (Pre-launch)

This doc describes the full flow of the `/gym` experience, all frontend/backend triggers (including OTP), and how it connects to the countdown page for pre-launch users.

---

## 1. /gym page structure (no auth required to view)

| Route | What runs | Backend/API |
|-------|-----------|--------------|
| `/[locale]/gym` | Renders `GymWorld` (scroll experience, 3D island, chapters) | None on load |

**On load:**

- **Frontend:** `GymWorld` mounts → `GymHeader`, `GymScrollScene`, `GymFooter`, `GymTransitionOverlay`, `GymVisitModal`, `GymMembershipModal`.
- **Auth:** `GymHeader` and `GymChaptersOverlay` (inside `GymScrollScene`) both call `useMemberAuth()`:
  - `getSupabaseBrowserClient().auth.getSession()` then **GET `/api/member/me`** with `Authorization: Bearer <token>`.
  - So: **any time /gym is open and user has a session, the app calls `/api/member/me`** (and on auth state change).

**Header (from `useMemberAuth`):**

- If **logged in** (user + member): links to Dashboard + Logout.
- If **not logged in**: links to Membership + Login.

**Scroll overlay CTAs (chapter 4, from `useMemberAuth`):**

- If **logged in**: “Show QR Check-In” and “Open Dashboard” → both go to `/[locale]/dashboard`.
- If **not**: “Book a Visit” (opens `GymVisitModal`) and “Become a Member” (opens `GymMembershipModal`).

**Modals:**

- `GymVisitModal`: likely form/link for booking a visit (no API detailed here).
- `GymMembershipModal`: should link to `/[locale]/gym/membership` (membership entry).

No other backend calls are triggered by the /gym page itself except **GET `/api/member/me`** when there is a session.

---

## 2. Membership entry: /gym/membership

| Route | What runs | Backend/API |
|-------|-----------|-------------|
| `/[locale]/gym/membership` | Membership entry page | **GET `/api/member/me`** (via `useMemberAuth`) |

**Flow:**

1. Page uses `useMemberAuth()` → if session exists, calls **GET `/api/member/me`**.
2. If **user and member** both exist → redirect to `/[locale]/dashboard`.
3. Otherwise: show headline “YOUR SKY STARTS HERE”, description, and two links:
   - **Login** → `/[locale]/login`
   - **Create Account** → `/[locale]/signup`

No other API calls on this page.

---

## 3. Login: /login (email/password + pre-launch OTP)

| Action | Frontend | Backend / Supabase |
|--------|----------|---------------------|
| **Email + password submit** | `signInWithPassword({ email, password })` | Supabase Auth |
| **Success** | `router.replace(/${locale}/dashboard)` | — |
| **“Part of pre-launch? Verify with email”** | See below | See below |

**Prelaunch “Verify with email” (OTP path):**

1. User enters email and clicks “Verify with email”.
2. **Dev bypass (same test accounts as countdown):**
   - If `NEXT_PUBLIC_DEV_BYPASS_OTP === "true"` and email is test (`evN-*@l` or `dummy2N@test.local`):
     - **POST `/api/auth/dev-bypass-gym`** with body `{ email, locale }`.
     - API: checks waitlist for that email, `is_verified === true`, then **Supabase Admin `generateLink({ type: 'magiclink', email, options: { redirectTo } })`**, returns `{ url }`.
     - Frontend: `window.location.href = url` → user lands on Supabase magic-link verification → redirected to `/[locale]/dashboard`.
   - No OTP email sent; no code step.
3. **Normal OTP (no bypass):**
   - **Frontend:** `signInWithOtp({ email })` (Supabase).
   - Supabase sends OTP email.
   - Frontend: `router.replace(/${locale}/login?otp_sent=1&email=...)`.
4. **OTP code step** (when `?otp_sent=1`):
   - User enters code.
   - **Frontend:** `verifyOtp({ email, token: code, type: 'email' })` (Supabase).
   - On success → `router.replace(/${locale}/dashboard)`.

So: **Supabase** is used for `signInWithPassword`, `signInWithOtp`, and `verifyOtp`. The only **app backend** call in login is **POST `/api/auth/dev-bypass-gym`** when dev bypass is used.

---

## 4. Signup: /signup

| Step | Frontend | Backend / Supabase |
|------|----------|---------------------|
| Submit | `signUp({ email, password, options: { data: { full_name, phone } } })` | Supabase Auth |
| If session returned | **POST `/api/member/onboard`** with `Authorization: Bearer <token>` and body `{ full_name, email, phone }` | **POST `/api/member/onboard`** |
| On success | `router.replace(/${locale}/waiver)` | — |

**POST `/api/member/onboard`:** Resolves user from token; if no `member_profiles` row for that `auth_id`, inserts one (tier `Explorer`). So signup creates both Supabase Auth user and `member_profiles` row.

If Supabase is configured to require email confirmation and no session is returned, the app shows “Check your email to confirm…” and does not call onboard until the user confirms and logs in later.

---

## 5. Waiver: /waiver

| Trigger | Frontend | Backend |
|---------|----------|---------|
| Page load | `useMemberAuth()` → **GET `/api/member/me`** | **GET `/api/member/me`** |
| Guards | No user → redirect to login. Member exists and `waiver_signed` → redirect to dashboard. User but no member → redirect to dashboard. | — |
| Submit | **POST `/api/member/waiver`** with Bearer token and `{ full_name, agreed, signature_data? }` | **POST `/api/member/waiver`** |
| Success | `router.replace(/${locale}/dashboard)` | Updates `member_profiles.waiver_signed`, `waiver_signed_at`, `full_name` by `auth_id` |

---

## 6. Dashboard: /dashboard

| Trigger | Frontend | Backend |
|---------|----------|---------|
| Page load | `useMemberAuth()` → **GET `/api/member/me`** | **GET `/api/member/me`** |
| Guards | No user → login. User but no member → “Setting up your profile…”. Member and `!waiver_signed` → redirect to waiver. | — |
| Content | Welcome, QR code (`leo-member:{member_id}`), membership status, gym stats (total_visits, last_check_in), community placeholders, Profile (set/change password). | — |
| Set password | `supabase.auth.updateUser({ password })` | Supabase Auth only |

**GET `/api/member/me`** (used by membership, waiver, dashboard, and /gym when logged in):

- Validates Bearer token with Supabase Auth (`getUser`).
- Reads `member_profiles` by `auth_id`.
- **If no row:** reads `waitlist` by `auth_id`; if found, **inserts** into `member_profiles` (tier from waitlist `tier_level` via `evolutionLevels`) and uses that as the member row. This is the **waitlist → member_profiles migration** for pre-launch users.
- Returns member + `total_visits` (count from `gym_checkins`) and `last_check_in` (latest `gym_checkins.timestamp`).

---

## 7. Check-in (staff / external)

| Trigger | Caller | Backend |
|---------|--------|---------|
| Staff scans QR or system posts | Any client/service with `member_id` | **POST `/api/checkin`** body `{ member_id, location? }` |

**POST `/api/checkin`:** Inserts into `gym_checkins`. No auth required in current implementation (assumed to be used by trusted staff/backend).

---

## 8. Summary: backend APIs used by /gym flow

| API | Method | When |
|-----|--------|------|
| `/api/member/me` | GET | Session exists on /gym, /gym/membership, /waiver, /dashboard (via `useMemberAuth`) |
| `/api/auth/dev-bypass-gym` | POST | Login “Verify with email” when dev bypass + test email |
| `/api/member/onboard` | POST | After signup (when session is present) |
| `/api/member/waiver` | POST | Waiver form submit |
| `/api/checkin` | POST | Staff/backend records a visit by `member_id` |

Supabase Auth is used for: login (password + OTP), signup, verify OTP, magic link (dev bypass), and dashboard `updateUser` (password).

---

## 9. How /gym relates to countdown (pre-launch users)

**Countdown** is the pre-launch experience: waitlist, clouds, referrals, evolution. It uses:

- **Data:** `waitlist` table (and optionally Supabase Auth linked via `auth_id` after verification).
- **Auth:** Optional. User can be “logged in” only in **localStorage** (e.g. after VerificationModal bypass with test accounts) or via **Supabase session** (after OTP verify and **POST `/api/waitlist/verify`** or link).
- **APIs:** **GET `/api/waitlist/me`** (by Bearer token, returns waitlist row by `auth_id`), **GET `/api/waitlist/lookup`** (by email/phone, for dev bypass), **POST `/api/waitlist/verify`** (after OTP: link auth user to waitlist, set `is_verified`).

**Connection to /gym:**

1. **Same Supabase Auth:** A user who verified on countdown (OTP or magic link) has a session and `waitlist.auth_id` set. When they go to **/gym** and log in (or are already logged in), **GET `/api/member/me`** runs. There is no `member_profiles` row yet, so the API looks up **waitlist** by `auth_id`, creates a **member_profiles** row from that waitlist row (tier from `tier_level`), and returns it. So **pre-launch users get a gym member profile automatically** on first use of /gym/dashboard/waiver while logged in.

2. **Same test-account bypass:** Countdown’s VerificationModal uses `NEXT_PUBLIC_DEV_BYPASS_OTP` and test emails (`evN-*@l`, `dummy2N@test.local`): instead of sending OTP, it calls **GET `/api/waitlist/lookup?email=...`** and if verified, calls `onSuccess({ mode: 'countdown' })` (no Supabase session for that bypass path; countdown state is in localStorage). For **/gym**, the same env and test emails trigger **POST `/api/auth/dev-bypass-gym`**, which returns a **magic link** so the user gets a real session and is redirected to dashboard. So **countdown bypass = no OTP, client-only state; gym bypass = no OTP, magic link → session → dashboard**.

3. **AuthSessionHandler (hero only):** On the **hero** (`/[locale]`), if there is a session, the app calls **GET `/api/waitlist/me`**, restores user into localStorage, and redirects to **countdown**. So hero → countdown uses **waitlist**, not **member_profiles**. /gym does not use AuthSessionHandler; it only uses `useMemberAuth` and **member_profiles**.

**In short:**

- **Countdown** = waitlist, referral, evolution; auth optional; state can be localStorage or session; **waitlist/me** and **waitlist/verify** + **waitlist/lookup** for bypass.
- **Gym** = membership, waiver, dashboard, QR; requires session; **member_profiles** + **member/me** (which migrates from waitlist by `auth_id`).
- **Pre-launch user** who already verified on countdown: same session + same `auth_id` in waitlist → first time they hit member/me they get a **member_profiles** row created from their waitlist row and can use dashboard/waiver like any other member.

---

## 10. Claim flow: /countdown → /gym (prelaunch users)

**Entry points:** `MembershipEntrySheet` (on /gym), `/signup`, `/[locale]/claim`.

**POST `/api/auth/claim-waitlist`** (body: `{ email?, phone?, locale?, origin? }`):

| Scenario | Response | UI behavior |
|----------|----------|-------------|
| Not in waitlist | 404 `{ status: "not_found" }` | Show "Create account instead" (signup continues) |
| In waitlist, no `auth_id` | 200 `{ url, magicLinkUrl }` | Redirect to magic link → **`/[locale]/claim/complete-password`** (then dashboard) |
| In waitlist, has `auth_id` | 200 `{ hasAccount: true, email? }` | Show "You already have an account. Log in." |

**Claim (no auth yet):** API creates `auth.users` with a random temporary password, sets `user_metadata.prelaunch_claim_password_pending: true`, sets `waitlist.auth_id`, inserts `member_profiles`, generates a magic link with `redirectTo` = **`/{locale}/claim/complete-password`**. User never sees the temp password.

**Password after claim (required):**
1. User opens the magic link → Supabase signs them in and redirects to **`/[locale]/claim/complete-password`**.
2. They choose a password; the app calls `updateUser({ password, data: { prelaunch_claim_password_pending: false } })`.
3. They are sent to **`/[locale]/dashboard`** (then waiver / rest of onboarding as usual).

If they hit **dashboard** or **waiver** while `prelaunch_claim_password_pending` is still true, the app redirects them back to **`/claim/complete-password`**.

**Later logins:** Email + password (or **Forgot password** if needed). **Dashboard → Profile** can still change password.

Add **`https://<your-domain>/**/claim/complete-password`** (or wildcard) to Supabase **Authentication → URL Configuration → Redirect URLs**.

**Signup with prelaunch email:** Both `MembershipEntrySheet` and `/signup` call `claim-waitlist` **before** `signUp`. If in waitlist → redirect (claim) or show hasAccount. Normal signup is blocked; user never reaches `signUp()`.

---

## 11. Top 3 teams (leaderboard) and /gym

**GET `/api/leaderboard`** returns teams sorted by verified waitlist count. Countdown shows `leaderboard.slice(0, 3)` as "top 3" (winning teams).

**Using top 3 for /gym claim:**
- **Option A (recommended):** Show a banner in `MembershipEntrySheet`: "Top 3 teams: [names] — Are you in a winning team? Claim your account!" to motivate prelaunch users.
- **Option B:** When user claims and we find them in waitlist, show "You're in Team X — currently #N on the leaderboard!" (requires `cloud_type` in claim response).
- **Option C:** Restrict claiming to top-3 teams only (restrictive; usually not desired).

No leaderboard data is currently fetched on /gym. To implement Option A, fetch `/api/leaderboard` when `MembershipEntrySheet` opens and render the top 3 team names.

---

## 12. Dashboard for claimed prelaunch users

After **complete-password**, same as any other member:
- **GET `/api/member/me`** returns `member_profiles` (created at claim from waitlist)
- Tier from `waitlist.tier_level` → `evolutionLevels`
- Waiver gate, QR code, membership status, activity, redeem, events, leaderboard — all behave identically

---

## 13. Data model (relevant to /gym and countdown)

- **auth.users** (Supabase): canonical identity.
- **waitlist:** pre-launch signups; `auth_id` set after verification; used by countdown and by **GET `/api/member/me`** to create **member_profiles** when missing.
- **member_profiles:** gym members; `auth_id` UNIQUE; created on signup (onboard), by **claim-waitlist**, or by **member/me** from waitlist.
- **gym_checkins:** one row per check-in; `member_id` → `member_profiles.id`.

No separate “accounts” table; gym identity is **member_profiles** keyed by **auth_id**.
