# Payment gateways

## How each method actually works

| First tap in modal | What the customer does | How the system knows they paid |
|--------------------|-------------------------|--------------------------------|
| **VietQR (bank)** | Scan QR → bank / MoMo / ZaloPay app → transfer to **your real bank account** | **Not possible without extra wiring.** A static QR does not talk to your server. |
| **+ SePay (recommended)** | Same QR; customer must type the **L7xxxxxxxx** code in the transfer description | SePay watches your account → **POST `/api/webhooks/sepay`** → auto-extend membership. |
| **VNPay** | Redirect to VNPay, pay by card/wallet | **GET `/api/vnpay-ipn`** |
| **MoMo** | MoMo app / browser pay URL | **POST `/api/momo-ipn`** |
| **ZaloPay** | ZaloPay or bank via their gateway | **POST `/api/zalopay-callback`** |

So: **bank app scanning the first VietQR** is still “money into your account.” For **zero manual work**, you need either **SePay** (or similar) on that rail, or send people to **MoMo / ZaloPay / VNPay** tabs where the gateway confirms payment.

## SePay + VietQR (automatic bank/MoMo/ZaloPay transfer)

1. Run migration `060_vietqr_pending_sepay.sql`.
2. Set **`SEPAY_WEBHOOK_API_KEY`** (same value as API Key in SePay webhook config; header `Authorization: Apikey <key>`).
3. In SePay: WebHooks → URL `https://<domain>/api/webhooks/sepay` → **Money in** → link your gym account.
4. Configure **payment code** parsing so the transfer description is searchable (the QR memo is short: **`L7` + 8 chars**).
5. When a member opens the payment modal, we create a **pending order** and put that code in the VietQR memo. SePay’s webhook must include that code in `content` / `code` / SMS fields we match against.

If `SEPAY_WEBHOOK_API_KEY` is **not** set, VietQR keeps the **long human-readable memo** and **desk confirm** stays available (manual path).

## Env summary

- VNPay: `VNPAY_*`
- MoMo: `MOMO_*`
- ZaloPay: `ZALOPAY_*`
- VietQR auto: `SEPAY_WEBHOOK_API_KEY` + SePay dashboard
- Bank QR image: `VIETQR_BANK_CODE`, `VIETQR_ACCOUNT`

Public flags: `GET /api/payment-gates` → `{ vnpay, momo, zalopay }`.
