# /gym flow — short summary (what to change where)

## Route order (user journey)

```
/gym  →  /gym/membership  →  /login or /signup
                                ↓
/signup  →  /waiver  →  /dashboard
/login (password or OTP)  →  /dashboard  (or /waiver if not signed)
```

---

## 1. `/gym` (cinematic page)

| What happens | Where to change |
|--------------|-----------------|
| Scroll experience + 3D island, 4 chapters | `app/[locale]/gym/page.tsx` → `GymWorld` |
| Header: **Gym**, **Community**, **Membership** (link to /gym/membership); if logged in → Dashboard, Logout | `components/gym/GymHeader.tsx` |
| Chapter 4 CTAs: **Become a Member** → /gym/membership, **About Leo Mây** → scroll to intro (#gym) | `components/gym/GymChaptersOverlay.tsx` |
| Auth: `useMemberAuth()` → **GET `/api/member/me`** when there’s a session | `lib/useMemberAuth.ts` |

**Backend:** Only **GET `/api/member/me`** (when user has session). No other API on this page.

---

## 2. `/gym/membership` (single auth entry)

| What happens | Where to change |
|--------------|-----------------|
| If user + member → redirect to dashboard | `app/[locale]/gym/membership/page.tsx` |
| Else: **JOIN THE SKY** + pre-launch copy + “New here?” + **Login** + **Create Account** (→ /login, /signup) | Same file |
| Auth: `useMemberAuth()` → **GET `/api/member/me`** | `lib/useMemberAuth.ts` |

**Backend:** **GET `/api/member/me`** only.

---

## 3. `/login`

| What happens | Where to change |
|--------------|-----------------|
| **Email or phone** + password. Try **signInWithPassword** (email); if fail → **POST `/api/auth/claim-waitlist`** | `app/[locale]/login/page.tsx` |
| Claim-waitlist: find waitlist by email/phone; if no auth_id → create auth user, link waitlist, create member_profiles, return magic link; if has auth_id → return { hasAccount, email } | `app/api/auth/claim-waitlist/route.ts` |
| Phone: call claim-waitlist first; if hasAccount + email → signInWithPassword(email, password); if url → redirect | Same file |
| Dev bypass (test emails + env) → **POST `/api/auth/dev-bypass-gym`** → magic link → dashboard | `app/api/auth/dev-bypass-gym/route.ts` |

**Backend:** **POST `/api/auth/dev-bypass-gym`** (dev bypass only). Rest is Supabase Auth.

---

## 4. `/signup`

| What happens | Where to change |
|--------------|-----------------|
| Name, email, phone, password → Supabase `signUp` | `app/[locale]/signup/page.tsx` |
| If session returned → **POST `/api/member/onboard`** → redirect /waiver | Same file + `app/api/member/onboard/route.ts` |
| If email confirmation required and no session → “Check your email…” | Same file (copy) |

**Backend:** **POST `/api/member/onboard`** (creates `member_profiles` row, tier Explorer).

---

## 5. `/waiver`

| What happens | Where to change |
|--------------|-----------------|
| No user → redirect login; waiver already signed → redirect dashboard; user but no member → redirect dashboard | `app/[locale]/waiver/page.tsx` |
| Form: full name, checkbox, signature → **POST `/api/member/waiver`** → redirect dashboard | Same file |
| Auth: `useMemberAuth()` → **GET `/api/member/me`** | `lib/useMemberAuth.ts` |

**Backend:** **GET `/api/member/me`**, **POST `/api/member/waiver`** (sets `waiver_signed`, `waiver_signed_at`, `full_name` by `auth_id`).

---

## 6. `/dashboard`

| What happens | Where to change |
|--------------|-----------------|
| No user → login; no member → “Setting up your profile…”; member but no waiver → redirect /waiver | `app/[locale]/dashboard/page.tsx` |
| Welcome, QR (`leo-member:{member_id}`), tier, stats, community placeholders, Profile (set password) | Same file |
| Set password: `supabase.auth.updateUser({ password })` | Same file |
| Auth: `useMemberAuth()` → **GET `/api/member/me`** | `lib/useMemberAuth.ts` |

**Backend:** **GET `/api/member/me`** only. Password change is Supabase Auth.

---

## 7. Check-in (staff / backend)

| What happens | Where to change |
|--------------|-----------------|
| Someone (e.g. staff) posts `member_id` → **POST `/api/checkin`** → insert `gym_checkins` | `app/api/checkin/route.ts` |

No auth on this API in current code (trusted caller).

---

## APIs at a glance

| API | Method | Used by | Change in |
|-----|--------|--------|-----------|
| `/api/member/me` | GET | /gym, /gym/membership, /waiver, /dashboard (when session exists) | `app/api/member/me/route.ts` |
| `/api/auth/claim-waitlist` | POST | /login when pre-launch user (email or phone, no auth yet) | `app/api/auth/claim-waitlist/route.ts` |
| `/api/auth/dev-bypass-gym` | POST | /login dev bypass (test email + env) | `app/api/auth/dev-bypass-gym/route.ts` |
| `/api/member/onboard` | POST | /signup after signUp | `app/api/member/onboard/route.ts` |
| `/api/member/waiver` | POST | /waiver form submit | `app/api/member/waiver/route.ts` |
| `/api/checkin` | POST | Staff/backend | `app/api/checkin/route.ts` |

---

## Pre-launch (countdown) tie-in

- **Same auth:** User who verified on countdown has Supabase session and `waitlist.auth_id`. On first **GET `/api/member/me`** (e.g. from /gym or /dashboard), if there’s no `member_profiles` row, the API finds **waitlist** by `auth_id`, **creates** a `member_profiles` row from it (tier from waitlist `tier_level`), and returns it. So pre-launch users become gym members automatically when they use /gym flow while logged in.
- **Migration logic:** All of that is in **GET `/api/member/me`** (`app/api/member/me/route.ts`). To change how pre-launch users become members, change that route.

---

## Data (what to change in DB)

- **auth.users** — Supabase Auth (login/signup/OTP).
- **waitlist** — Pre-launch; `auth_id` set after verification; used by `/api/member/me` to create `member_profiles`.
- **member_profiles** — Gym members; one row per auth user; created by onboard or by member/me from waitlist.
- **gym_checkins** — One row per visit; `member_id` → `member_profiles.id`.

To change gym “account” behavior or fields, edit **`member_profiles`** and the code in **`/api/member/me`** and **`/api/member/onboard`** (and waiver/dashboard if you add fields).
