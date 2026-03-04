# Login & password flow — how it maps to tables

## Where the password lives

| Where | Has password? | Notes |
|-------|----------------|--------|
| **auth.users** (Supabase Auth) | ✅ Yes | `encrypted_password` — only place passwords are stored. Supabase hashes them (bcrypt). |
| **auth.identities** | ❌ No | Links provider (email/phone) to `auth.users`; needed so signInWithPassword works. |
| **waitlist** | ❌ No | Pre-launch list; has `auth_id` only after user is created (claim or signup). |
| **member_profiles** | ❌ No | Gym member record; has `auth_id` → `auth.users(id)`. No password column. |

**Summary:** Passwords exist only in **Supabase Auth** (`auth.users.encrypted_password`). Your app tables (`waitlist`, `member_profiles`) never store passwords; they only store `auth_id` to link to the auth user.

---

## How login works (step by step)

### 1. User submits email + password (e.g. /gym modal or /login)

- Frontend calls **Supabase client**: `signInWithPassword({ email, password })`.
- The request goes to **Supabase Auth** (your Next.js API is not in the path for this call).
- Supabase Auth:
  - Finds the row in **auth.users** for that email.
  - Compares the submitted password with `encrypted_password` (bcrypt).
  - If match: creates a **session** (access_token, refresh_token) and returns it.
  - If no match or no user: returns an error (e.g. "Invalid login credentials").

### 2. If `signInWithPassword` fails

- Frontend then calls **your API**: `POST /api/auth/claim-waitlist` with `{ email }` (no password).
- **claim-waitlist** does **not** check or set any password. It:
  - Looks up **waitlist** by email/phone.
  - If not in waitlist, also checks **member_profiles** by email; if found with `auth_id` → returns `hasAccount: true` (so UI shows "Invalid password" instead of "Not in list").
  - If in waitlist and already has `auth_id` → returns `hasAccount: true`.
  - If in waitlist and no `auth_id` → creates a new user in **auth.users** (with a random temp password), links waitlist, creates **member_profiles**, then returns a **magic link** (no password needed for that redirect).

So the password is only ever checked by Supabase Auth in step 1. Your tables are only used to decide “does this person have an account?” and “should we send a magic link?”.

### 3. After a successful login (session exists)

- Frontend has a **session** (access_token) from Supabase Auth.
- For “am I a gym member?” the app calls **GET /api/member/me** with `Authorization: Bearer <access_token>`.
- **member/me**:
  - Validates the token with Supabase Auth (gets `user.id`).
  - Reads **member_profiles** by `auth_id = user.id` (no password involved).
  - If no row: optionally migrates from **waitlist** (same `auth_id`) and creates **member_profiles**.
- So “logged in” = valid Auth session; “gym member” = existing **member_profiles** row for that `auth_id`.

---

## How the password gets into the system

| Path | Where password is set | Table impact |
|------|------------------------|--------------|
| **Signup** (/signup) | User types password → `supabase.auth.signUp({ email, password })` | Supabase creates **auth.users** (with hashed password) and **auth.identities**. Then **POST /api/member/onboard** creates **member_profiles** using `auth_id` from session. |
| **Claim waitlist** (no account yet) | User has no password; API calls `supabase.auth.admin.createUser({ email, password: randomPassword() })` | New **auth.users** row (random password user never sees), **waitlist** updated with `auth_id`, **member_profiles** inserted. User signs in via **magic link** only. |
| **SQL seed** (dummy user) | You run `seed_dummy_gym_member.sql`: inserts into **auth.users** with `encrypted_password = crypt('password123', gen_salt('bf'))` and into **auth.identities**, then **member_profiles**. | Password exists only in **auth.users**. **member_profiles** only has `auth_id`; no password column. |

So in every case the password (or its hash) is only ever written into **auth.users** (and used by Auth for `signInWithPassword`). **member_profiles** and **waitlist** only store `auth_id`.

---

## Table relationship diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Auth (managed by Supabase)                            │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │ auth.users           │    │ auth.identities               │  │
│  │ id (uuid)            │◄───│ user_id, provider, provider_id │  │
│  │ email                │    │ (needed for email login)       │  │
│  │ encrypted_password   │    └──────────────────────────────┘  │
│  └──────────┬───────────┘                                       │
└─────────────┼───────────────────────────────────────────────────┘
              │
              │ auth_id (FK)
              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ waitlist                    │    │ member_profiles              │
│ id, name, email, phone,     │    │ id, auth_id, email, phone,   │
│ auth_id (nullable)          │    │ full_name, tier, waiver_*     │
│ (no password)              │    │ (no password)                │
└─────────────────────────────┘    └─────────────────────────────┘
```

- **Login:** email + password → Auth checks **auth.users** → session.
- **App:** session → **member/me** uses `auth_id` → **member_profiles** (and optionally **waitlist** for migration).

---

## Summary

- **Password flow:** Password is sent to Supabase Auth; Auth checks **auth.users.encrypted_password**. No app table stores or checks the password.
- **Tables:** **member_profiles** and **waitlist** only store `auth_id`; they identify “which auth user” this row belongs to. They do not participate in password verification.
- **Dummy / SQL-seeded user:** Must have a row in **auth.users** (with correct `encrypted_password`) and **auth.identities** so `signInWithPassword` works; then **member_profiles** with that `auth_id` so **member/me** returns a member. If the SQL insert into **auth.users** fails (e.g. schema difference), create the user in Supabase Dashboard and insert only **member_profiles** with that user’s UUID.
