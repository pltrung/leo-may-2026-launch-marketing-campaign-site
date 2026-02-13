# Leo Mây — Climb the Clouds. Build a Culture.

Premium immersive landing experience for Leo Mây Climbing Gym. Ho Chi Minh City · Launch 2026.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Motion**: Framer Motion
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
│   └── leo/
│       ├── Atmosphere.tsx    # Dreamlike background
│       ├── IntroView.tsx     # Logo reveal + Enter
│       ├── CloudFieldView.tsx # Cloud selection
│       ├── CloudBlob.tsx     # Organic cloud shape
│       ├── PersonalityView.tsx # Chosen cloud reveal
│       ├── SignupView.tsx    # Waitlist form
│       └── SuccessView.tsx   # Position confirmation
├── lib/
│   ├── supabaseServer.ts
│   ├── cloudData.ts
│   └── validators.ts
├── styles/
│   └── globals.css
├── public/
│   ├── logo.svg
│   └── fonts/                # MiSans (Leo May Font)
└── supabase/
    └── migrations/
        └── 001_create_waitlist.sql
```

## Flow

1. **Intro** — Logo and tagline reveal, Enter CTA
2. **Clouds** — "What type of cloud are you?" — pick one of six personalities
3. **Personality** — Chosen cloud description + Join the Founding Circle
4. **Signup** — Name, email or phone
5. **Success** — Position in the Founding Circle

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

After each waitlist insert, the API returns the count of all waitlist entries as the user's position in the Founding Circle.

## Brand

- **Primary Blue**: #0242FF
- **Vital Green**: #00CB4D
- **Solar Yellow**: #FDFF52
- **Font**: MiSans (Leo May Font)
