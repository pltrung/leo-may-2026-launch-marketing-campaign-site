# Testing: Identity Lock & Verification

## Prerequisites

- Supabase project with migrations 001–006 applied (including `006_waitlist_identifier_lock_and_referral_integrity.sql`).
- Supabase Auth enabled for Email OTP and (optionally) Phone/SMS OTP.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 1. Email flow

1. Open the app (hero).
2. Scroll to cloud selector, pick a cloud, open signup modal.
3. Choose **Email**, click Next. Enter name and email. Click **Ascend**.
4. Identity should lock (input greyed, lock icon, “Change” link). Confirmation screen → redirect to countdown.
5. On countdown, below “Power your cloud” you should see **⚡ Verify to activate referrals** and **Verify Account** (breathing).
6. Click **Verify Account**. Verification modal opens with your email **read-only** (locked identity). Click **Send code**, enter the 6-digit OTP, **Verify**.
7. After success: section shows **✅ Verified** and “You can now invite others.” and **Power your cloud** is available.

## 2. Phone flow

1. Clear localStorage (or use incognito). Go to hero → cloud selector → signup.
2. Choose **Phone**, Next. Enter name and phone (e.g. `0912345678` or `+84912345678`).
3. Submit. Identity locks; go to countdown.
4. Open Verify Account; modal shows locked phone (read-only). Send OTP (SMS), enter code, verify.
5. Confirm verified state and “Power your cloud” visible.

## 3. Changing identity resets flow

1. From signup modal (after locking identity), click **Change** next to the locked field.
2. Warning: “Changing your identity will reset verification & referral eligibility.” Confirm **Change**.
3. Modal should close; identity cleared. Re-open signup: you should see **Choose Email or Phone** again (step 0), no partial carry-over.

## 4. Referral counts only when both inviter and referred are verified

1. **Inviter:** Sign up (email or phone), lock identity, go to countdown, **verify** (OTP). Copy share link (Power your cloud).
2. **Referred:** Open link in new browser/incognito. Sign up with **different** email/phone, lock identity, go to countdown.
3. **Referred:** Click **Verify Account**, complete OTP.
4. After referred user verifies, inviter’s **referral count** (e.g. “You have awakened X climbers”) should increase by 1. It must **not** increase before the referred user verifies.

## 5. Duplicate identifier / same user blocked

1. Sign up with email `test@example.com`, lock, go to countdown.
2. In another tab, try to sign up again with the same email (or same phone if you used phone). You should get an error (e.g. “This email or phone is already registered.”) and no second waitlist row.
3. Referral link from same user (same auth) should not count as a referral (confirm_referral blocks self-referral).

## 6. Know your cloud (second entry point)

1. Clear storage. From hero, click **Know your cloud?**.
2. Choose Email or Phone, Next. Enter an identifier that **already exists** in waitlist (from a previous signup).
3. **Find my team** → should lock identity, redirect to countdown, and show correct team.
4. If identifier is **not** in waitlist, you should see “We couldn’t find your cloud yet.”
5. With identity already locked (e.g. after step 3), open “Know your cloud?” again: you should see “You are on Team X” and “Go to countdown” (no form).

## 7. UI checks

- Verification modal: dark overlay, glass panel (backdrop-blur, 24px radius), enter animation ~220ms scale 0.92→1.
- Verify Account button: soft breathing (scale 1→1.02→1, ~3s loop), no layout thrash.
- “You are …” pill on countdown: readable, opacity ~0.85–0.9.
- Spacing and typography consistent (Apple-level).

## Quick local run

```bash
npm run dev
```

Then run through flows 1–6 above. Fix any regressions (e.g. countdown not loading profile when only `identifier`/`identifier_type` set, or verify API not finding row by email/phone).
