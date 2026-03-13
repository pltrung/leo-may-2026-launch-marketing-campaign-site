# VietQR Payment & Membership Setup

## 1. Run migration

```bash
supabase db push
# or: supabase migration up
```

This creates `membership_plans` and `payments` tables, and adds `member_code` to `member_profiles` if needed.

## 2. Environment variables

**Where to set:**
- **Local:** Add to `.env.local` in the project root
- **Vercel:** Project → Settings → Environment Variables

| Variable | Description | Example (Techcombank) |
|----------|-------------|------------------------|
| `VIETQR_BANK_CODE` | NAPAS247 bank BIN | `970407` (Techcombank) |
| `VIETQR_ACCOUNT` | Bank account number | `19027030091996` |
| `CRON_SECRET` | Secret for expiry-reminders cron (Vercel sends as Bearer) | `any-random-string` |

Defaults in code: Techcombank 970407, account 19027030091996. Override via env for production.

## 3. VietQR URL format

`https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT}-print.png?amount={VND}&addInfo={MEMO}`

- MEMO = member_code (e.g. LM0234) for payment tracking

## 4. Expiry reminders cron

- Route: `GET /api/cron/expiry-reminders`
- Vercel Cron: daily at 8:00 UTC (see `vercel.json`)
- Returns members with `membership_expires_at` in the next 7 days
- Wire to your email/SMS service to send reminder messages
