# Stripe setup for Leo Mây (Vietnam business)

## Vietnam and Stripe

**Stripe does not yet support opening a Stripe account directly in Vietnam.** You cannot register at stripe.com with a Vietnam business and a Vietnamese bank account as the payout account.

Your options:

### Option A: Use a Stripe-supported entity (recommended)

1. **Singapore / Thailand / Malaysia / Hong Kong**  
   If you (or a co-founder) can open a business and bank account in one of these countries, you can [register for Stripe there](https://stripe.com/global) and receive payouts to that bank. You can then transfer to your VN account as needed.

2. **Stripe Atlas (US company)**  
   [Stripe Atlas](https://stripe.com/atlas) lets you incorporate a US company and get a US bank account from anywhere. You run the business from Vietnam but receive payouts in USD to the US account; you then wire or use a service to move funds to Vietnam. Good if you want to charge in USD and have a US presence.

3. **UK company (e.g. via Incorpuk or similar)**  
   Some services help you incorporate a UK company and open a business bank account; you then connect that account to Stripe. Payouts go to the UK account; you handle transfers to VN.

### Option B: Local payment gateways (Vietnam)

If you prefer to keep everything in Vietnam and in VND:

- Use a **Vietnamese payment provider** (e.g. VNPay, Momo, ZaloPay, or your bank’s gateway) that supports domestic and possibly international cards.
- This repo currently only integrates **Stripe**. Adding a second provider would require new API routes and UI for that gateway; the existing “Power Your Cloud” flow would need to call either Stripe or the local gateway depending on config.

---

## If you already have a Stripe account (e.g. SG / US / UK)

Once you have a Stripe account (from any supported country), set it up as below so the Leo Mây app can run checkout and webhooks.

### 1. Get API keys

1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys).
2. Use **Test** keys while developing, **Live** keys for production.
3. Copy:
   - **Secret key** (starts with `sk_test_` or `sk_live_`).

Do **not** put the secret key in frontend code or commit it to git. It stays only in `.env.local` (local) and in Vercel Environment Variables (production).

### 2. Add keys to the project

**Local (`.env.local`):**

```bash
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_...
```

**Vercel (production):**

1. Vercel project → **Settings** → **Environment Variables**.
2. Add:
   - `STRIPE_SECRET_KEY` = your live secret key (e.g. `sk_live_...`).
   - `STRIPE_WEBHOOK_SECRET` = from step 3 below.

### 3. Create a webhook (required for tier upgrades)

The app updates `waitlist.total_contribution_usd` and `tier_level` only when Stripe sends `checkout.session.completed`. Without the webhook, payments succeed but tiers do not update.

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks).
2. **Add endpoint**.
3. **Endpoint URL:**
   - Local (testing): use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward:  
     `stripe listen --forward-to localhost:3000/api/stripe-webhook`  
     and use the signing secret it prints as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
   - Production: `https://your-vercel-domain.com/api/stripe-webhook`
4. **Events to send:** select **checkout.session.completed**.
5. After creating the endpoint, open it and copy the **Signing secret** (starts with `whsec_`).
6. Put that in:
   - `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...` (for local testing with Stripe CLI).
   - Vercel env as `STRIPE_WEBHOOK_SECRET` (for production).

### 4. Run migrations (if not already)

The app expects these (from `007_waitlist_tier_and_stripe.sql`):

- `waitlist`: `tier_level`, `total_contribution_usd`, `stripe_checkout_session_id`, `contribution_source`, `upgraded_at`
- Table `stripe_checkout_completed` for webhook idempotency

Apply your Supabase migrations so these exist.

### 5. Test (test mode)

1. Use **test** API key and a **test** webhook secret (from Stripe CLI or a test webhook endpoint).
2. Use [Stripe test cards](https://docs.stripe.com/testing#cards), e.g. `4242 4242 4242 4242`.
3. In the app, click “Upgrade to Tier X”, complete Checkout; then check:
   - Stripe Dashboard → Payments (payment created).
   - Webhook was called (Dashboard → Webhooks → your endpoint → “Recent events”).
   - In Supabase: `waitlist.total_contribution_usd` and `tier_level` updated for that user.

### 6. Go live

1. Switch to **live** API key and a **live** webhook endpoint pointing to your production URL.
2. Add the live webhook’s **Signing secret** to Vercel as `STRIPE_WEBHOOK_SECRET`.
3. Optionally set up Stripe Radar and customer emails in the Dashboard.

---

## Summary

| Goal | What to do |
|------|------------|
| **Business in Vietnam, VN bank** | Stripe cannot be opened directly in VN. Use Option A (entity in SG/TH/MY/HK or Atlas/UK) or Option B (local VN gateway + extra dev work). |
| **Already have Stripe (e.g. SG/US)** | Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; create webhook for `checkout.session.completed`; run migrations; test with test cards. |
| **Only testing** | Use test keys + Stripe CLI for webhook forwarding and test cards; no real money. |

For more on Vietnam and Stripe, see [Stripe global](https://stripe.com/global) and, if you consider Atlas, [Stripe Atlas](https://stripe.com/atlas).
