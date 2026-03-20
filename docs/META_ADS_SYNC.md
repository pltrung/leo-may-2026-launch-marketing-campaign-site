# Meta Ads Sync — Setup Guide

The Paid Ads tab in Admin can automatically pull spend, impressions, clicks, and leads from Meta (Facebook/Instagram) via the Marketing API.

## 1. Get Credentials

### Ad Account ID
- In [Meta Ads Manager](https://business.facebook.com/adsmanager), check the URL or account dropdown
- Format: `act_123456789` (the number is your Ad Account ID)
- Or: Business Settings → Accounts → Ad Accounts → copy the ID

### Access Token (System User recommended)
1. Go to [Meta Business Suite](https://business.facebook.com) → **Business Settings**
2. **Users** → **System Users** → **Add** (create one for the app)
3. **Generate new token**:
   - Select your app (or create one at developers.facebook.com)
   - Permissions: `ads_read`
   - Token type: Long-lived (60 days) or use System User token (never expires)
4. Copy the token — store it in `META_ACCESS_TOKEN`

## 2. Environment Variables

Add to `.env.local` (or Vercel env):

```bash
META_ACCESS_TOKEN=your_long_lived_token
META_AD_ACCOUNT_ID=act_123456789
```

## 3. Usage

- **Manual sync**: Admin → Analytics → Paid Ads tab → click **"Sync from Meta"**
- **Automatic sync**: Vercel Cron runs daily at 6:00 UTC (requires `CRON_SECRET` set)

## 4. Notes

- **Spend currency**: Meta returns spend in your ad account currency (usually USD). Finance tab displays as-is. If your primary currency is VND, consider setting the ad account to VND in Meta Business Settings, or add conversion logic later.
- **API rows vs manual**: Synced rows use `source_mode='api'`. Manual entries use `source_mode='manual'`. Syncing replaces only API rows for the date range; manual entries are preserved.
