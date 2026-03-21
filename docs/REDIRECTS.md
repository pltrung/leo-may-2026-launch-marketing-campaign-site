# Redirects and navigation targets

Central reference for **HTTP redirects**, **full-page navigations**, and common **`router.replace`** targets. Update this doc when adding new entry redirects.

## Edge / middleware

| Source | Destination | File |
|--------|-------------|------|
| `/` | `/{locale}` (`en` or `vi`: cookie `leo_language` > Accept-Language > default `en`) | `middleware.ts` (`NextResponse.redirect`) |

`next.config.js` has no `redirects` / `rewrites`.

## Client: auth hash (Supabase)

| Condition | Destination | File |
|-----------|---------------|------|
| `#...type=recovery...` | `/{en or vi}/reset-password` + hash (locale from path: `/vi` → `vi`) | `components/AuthHashRedirect.tsx` (`window.location.replace`) |
| Magic link hash on path **without** `/en` or `/vi` prefix | `/en/dashboard` + hash | `AuthHashRedirect` |
| Magic link hash under `/en` or `/vi` | `/{locale}/dashboard` (after session) | `AuthHashRedirect` (`router.replace`) |

## Client: session → countdown

| Condition | Destination | File |
|-----------|-------------|------|
| Session + restored waitlist user on **prelaunch landing** (`isLandingFlowPath`) | `/{locale}/countdown` (`locale` from route; `/prelaunch` → `en`) | `components/AuthSessionHandler.tsx` |

## Client: `router.replace` (representative)

- **Unauthenticated protected app:** `/` → middleware sends to `/prelaunch` — `components/ProtectedRoute.tsx`
- **Staff:** `/staff` → `/admin` if staff; `app/staff/page.tsx` — `app/route-setter/page.tsx` → `/staff`
- **Locale staff shortcut:** `app/[locale]/staff/page.tsx` → `/staff`
- **Login:** `app/[locale]/login/page.tsx` → `/{locale}/gym`
- **Gym membership route:** `app/[locale]/gym/membership/page.tsx` → `/{locale}/gym`
- **Signup success:** `app/[locale]/signup/page.tsx` → `/{locale}/waiver`
- **Waiver:** `app/[locale]/waiver/page.tsx` → `/{locale}/gym` or `/{locale}/dashboard`
- **Reset password:** `app/[locale]/reset-password/page.tsx` → `/{locale}/gym` (delayed)
- **Countdown:** `app/[locale]/countdown/page.tsx` → `/{locale}` (home) in several branches
- **Dashboard:** tab cleanup, gym, language switch — `app/[locale]/dashboard/page.tsx`
- **Membership modals:** `components/gym/modals/MembershipEntrySheet.tsx` → `/{locale}/dashboard`
- **TV transition overlay:** `context/TransitionOverlayContext.tsx` — `router.replace` / `push` for pending `href`
- **Logo (cloud selector):** `components/Logo.tsx` — `logoHomePath()` (e.g. `/prelaunch` or `/{locale}`)

## Client: `window.location` (representative)

- Magic links / payment / claim URLs from APIs — e.g. `MembershipEntrySheet`, `signup`, `claim`, `PowerYourCloudModal`, `countdown`
- Logout / gym: `app/[locale]/dashboard/page.tsx`, `components/gym/GymHeader.tsx` → `/{locale}/gym`
- **Errors:** `app/admin/error.tsx`, `app/onboarding/error.tsx`, dashboard/gym errors → `/` (then middleware → `/prelaunch`)
- **Auth hash:** see above

## Related docs

- Payment return URLs: `docs/PAYMENT_GATEWAYS.md`
- Broader flows: `docs/FULL_FLOW_GYM_DASHBOARD_ADMIN.md`, `docs/GYM_AND_COUNTDOWN_FLOW.md`
