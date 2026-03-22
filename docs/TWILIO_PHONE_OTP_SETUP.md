# Twilio Phone OTP Setup

The app uses **Twilio Verify** (VA...) for phone OTP — not Twilio Messaging. This avoids toll-free verification and A2P registration.

---

## Twilio Verify (current flow)

### 1. Create Verify Service

1. [Twilio Console](https://console.twilio.com) → **Verify** → **Services** → **Create new**
2. Copy the **Service SID** (starts with `VA...`)

### 2. Add env vars to `.env.local`

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_VERIFY_SID=VAxxxxxxxx
```

### 3. Flow

- Send OTP: `POST /api/send-otp` with `{ phone }`
- Verify: `POST /api/verify-otp` with `{ phone, code, redirectTo? }` → returns magic link

---

## Legacy: Twilio Messaging + Supabase (deprecated)

The following applied when using Supabase's built-in phone OTP.

### 1. Create Twilio account (if needed)

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up, verify email and your personal phone
3. You get a free trial with a small balance

### 2. Get credentials

1. Open [Twilio Console](https://console.twilio.com)
2. On the dashboard, find **Account SID** and **Auth Token** (or go to **Account** → **API keys & tokens**)
3. Copy both — you’ll need them for Supabase

### 3. Get a phone number (sender)

1. In Console, go to **Phone Numbers** → **Manage** → **Active numbers** (or **Buy a number**)
2. If you have no number yet, click **Buy a number** and pick one with **SMS** capability
3. Copy the number in E.164 format, e.g. `+1234567890`

**Alternative: Messaging Service**

- **Messaging** → **Services** → **Create Messaging Service**
- Add your Twilio phone number as sender
- Copy the **Messaging Service SID** (starts with `MG...`)

### 4. Verify your test phone numbers (trial accounts)

1. Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click **Add a new Caller ID**
3. Enter the US number you want to test (e.g. `+1 555 123 4567`)
4. Choose **SMS** verification and complete the flow
5. Repeat for each number you want to test with

Without this, SMS will fail with no obvious error.

---

## Part 2: Supabase Dashboard

### 1. Enable Phone provider

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Authentication** → **Providers**
4. Find **Phone** and enable it

### 2. Configure Twilio

On the same **Providers** page, in the Phone section:

1. Set **SMS Provider** to **Twilio**
2. Enter:
   - **Account SID** — from Twilio Console
   - **Auth Token** — from Twilio Console
3. Enter one of:
   - **Message Service SID** — if you created a Messaging Service (recommended for production)
   - **Sender phone number** — your Twilio number in E.164 (e.g. `+1234567890`)

4. Save

### 3. Check redirect URLs

In **Authentication** → **URL Configuration**:

- Add your app URLs to **Redirect URLs** (e.g. `https://your-domain.com/**`, `https://*.vercel.app/**`)

---

## Part 3: Debugging

### No SMS received

- **Trial account:** Ensure the recipient number is in [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
- **Supabase logs:** **Project Settings** → **Logs** → **Auth** for OTP-related errors
- **Twilio logs:** **Monitor** → **Logs** → **Messaging** to see if messages were sent or failed

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| Rate limit | Too many OTP requests | Wait 60 seconds before retrying |
| Invalid phone | Wrong E.164 format | App uses `toE164()`; ensure numbers include country code |
| 21603 (From/MessagingServiceSid required) | Missing sender in Supabase | Add Message Service SID or phone number in Phone provider settings |
| Message not delivered | Trial + unverified number | Add the number to Verified Caller IDs |

### Test with email first

To confirm the flow without SMS, use **Email** in the verification modal. If email OTP works but phone does not, the issue is with Twilio.

---

## Quick checklist

- [ ] Twilio Account SID and Auth Token obtained
- [ ] Twilio phone number (or Messaging Service) created
- [ ] Test phone numbers added to Verified Caller IDs (trial)
- [ ] Supabase Phone provider enabled
- [ ] Twilio credentials set in Supabase Phone provider
- [ ] Message Service SID or sender phone number set in Supabase
