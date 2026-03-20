# Campaign email hero image

Segment and marketing campaign emails load a landscape hero from:

**` /campaign-email-hero.png `** (served from this folder as `campaign-email-hero.png`)

Add your gym facade / retail photo here with that exact filename so Gmail and other clients can load it from your production URL.

**Optional:** Set `CAMPAIGN_EMAIL_HERO_URL` in env to an absolute HTTPS URL (CDN or static host) instead of shipping the file in the repo.

Recommended for the PNG:

- **Width:** about 1120–1600px (template displays at max 560px wide; 2× for retina is enough)
- **Aspect:** landscape (~16:9 or similar); height is automatic so the image is not stretched
