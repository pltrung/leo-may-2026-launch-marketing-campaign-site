# Leo Mây — Climb the Clouds. Build a Culture.

Brand immersion experience for Leo Mây Climbing Gym. Ho Chi Minh City · Launch 2026.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod

## Project Structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── waitlist/
│           └── route.ts
├── components/
│   ├── FogIntro.tsx      # First 5s fog + logo reveal
│   ├── BrandLogo.tsx     # Logo with breathing space
│   ├── CloudField.tsx    # Cloud grid
│   ├── CloudShape.tsx    # Single cloud blob
│   ├── CloudReveal.tsx   # Personality reveal modal
│   ├── SignupModal.tsx   # Waitlist form
│   ├── WaitlistConfirmation.tsx
│   └── Footer.tsx
├── lib/
│   ├── supabaseServer.ts
│   ├── cloudData.ts
│   └── validators.ts
├── styles/
│   └── globals.css
├── public/
│   ├── logo.svg
│   └── fonts/            # MiSans (Leo May Font)
└── supabase/
    └── migrations/
        └── 001_create_waitlist.sql
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run `supabase/migrations/001_create_waitlist.sql`
3. Go to **Project Settings → API**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel Deployment

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

## Position Calculation

After each waitlist insert, the API runs:

```sql
SELECT COUNT(*) FROM waitlist;
```

The returned count is the new user's position in the Founding Circle. Newest signup = latest row, so count equals total signups = position.

## Brand

- **Primary Blue**: #0242FF
- **Vital Green**: #00CB4D
- **Solar Yellow**: #FDFF52
- **Font**: MiSans (Leo May Font)
