# Referral count → Tier, IP (title), and Mascot image

Single source of truth for the countdown page: **tier** (and thus IP + mascot) is derived from `profile.tierLevel`, which follows `ASCENSION_TIERS.referralsRequired`: **0, 3, 8, 15, 25, 40**.

| Referrals | Display tier | Evo | IP (title) EN | IP (title) VI | Mascot image |
|-----------|:------------:|:---:|----------------|---------------|--------------|
| 0 – 2     | 0 | I   | The Dreamer           | Kẻ Mơ Mộng           | `ip-sleeping.svg`      |
| 3 – 7     | 1 | II  | The Cloud Seeker      | Kẻ Lần Theo Mây     | `ip-waking-up.svg`     |
| 8 – 14    | 2 | III | The Thunder Challenger| Kẻ Thách Sấm        | `ip-looking-around.svg`|
| 15 – 24   | 3 | IV  | The Sky Ascendant     | Kẻ Vượt Tầng Trời   | `ip-on-cloud-evo.svg`  |
| 25 – 39   | 4 | V   | The Sky Guardian      | Kẻ Canh Giữ Bầu Trời| `ip-energized.svg`     |
| 40+       | 5 | VI  | The Sky Creator       | Kẻ Tạo Nên Thiên Không | `ip-count-down.svg` |

**Notes**
- Tier is the **minimum** referral count to reach that row (e.g. 3 refs → tier 1, 8 refs → tier 2).
- Paid contribution can also raise tier; effective tier = max(referral-based tier, payment-based tier).
- All assets live under `public/brand/`. Mascot colors (scarf, ribbon, etc.) are applied by cloud type via `MascotSvgObject`.
