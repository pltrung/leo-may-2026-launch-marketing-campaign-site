# Supabase Auth setup (Email + Phone OTP)

This app uses **Supabase Auth** for email and phone OTP verification only. The **waitlist** table remains the source of truth for countdown, leaderboard, team counts, and referrals.

## 1. Get API keys

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose in the browser)

Add them to `.env.local` (see `.env.example`).

## 2. Enable Email OTP

1. In the dashboard: **Authentication** → **Providers**.
2. Open **Email**.
3. Enable **“Confirm email”** (or equivalent) so that OTP is sent instead of a magic link if you use **Email OTP**.
4. For **Email OTP** (one-time code):
   - Use `signInWithOtp({ email })` from the client; Supabase sends a 6-digit code.
   - No extra provider config required beyond having Email enabled.

## 3. Enable Phone (SMS) OTP

1. **Authentication** → **Providers** → **Phone**.
2. Enable the **Phone** provider.
3. Configure an SMS provider (e.g. **Twilio**):
   - Add Twilio credentials in the Supabase dashboard (or the provider Supabase supports).
   - Supabase will send the OTP via Twilio when you call `signInWithOtp({ phone })`.

Without an SMS provider, phone OTP will not send; email OTP will still work.

## 4. Run migrations

Ensure the waitlist table is linked to Auth and has the RPC:

```bash
npx supabase db push
# or apply supabase/migrations/005_waitlist_auth_and_referral.sql manually
```

This adds `auth_id`, `is_verified`, `verified_at`, referral columns, and the `confirm_referral` RPC.

## 5. Client-side auth (this app)

- **Browser:** `lib/supabaseBrowser.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so that `signInWithOtp` and `verifyOtp` run in the browser.
- **Session:** After `verifyOtp`, the session is stored automatically; `createBrowserClient()` uses it for authenticated calls (e.g. `/api/waitlist/me`, `confirm_referral`).

## Quick reference

| Action        | Where in Dashboard        |
|---------------|---------------------------|
| Project URL   | Project Settings → API    |
| Anon key      | Project Settings → API   |
| Enable Email  | Authentication → Providers → Email |
| Enable Phone  | Authentication → Providers → Phone (+ SMS provider) |
| Forgot pwd redirects | Authentication → URL Configuration → Redirect URLs |

## 6. Forgot Password (reset link)

If you use email/password login, the app supports **Forgot Password**:
1. **Authentication** → **URL Configuration**
2. Add **Redirect URLs** (e.g. `http://localhost:3000/**`, `https://your-domain.com/**`, or `https://*.vercel.app/**` for Vercel)
3. Supabase sends a reset email; the link redirects to `/[locale]/reset-password`
4. **Pre-launch claim** magic links use **`/[locale]/claim/complete-password`** as `redirectTo` — ensure that path is allowed (wildcards like `/**` cover it)

No redirect URLs or “magic link” site URL are required for OTP-only flows; the user enters the code in the app.
