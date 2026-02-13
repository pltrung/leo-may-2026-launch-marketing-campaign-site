# Leo Mây — Deployment Guide

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Name it (e.g. `leo-may-waitlist`)
4. Set a strong database password and choose a region

### 2. Run Migration

1. In the Supabase dashboard, open **SQL Editor**
2. Click **New Query**
3. Paste the contents of `supabase/migrations/001_create_waitlist.sql`
4. Click **Run**

### 3. Get API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key (under "Project API keys") → use as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ Never expose the `service_role` key client-side. It bypasses RLS.

---

## Vercel Deployment

### 1. Push to Git

```bash
cd "C:\Users\pltru\Downloads\Leo May 2026 Marketing Launch Campaign Site"
git init
git add .
git commit -m "Leo Mây brand immersion"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leo-may.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: .next (default)

### 3. Environment Variables

In Vercel project **Settings** → **Environment Variables**, add:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Production, Preview, Development |

### 4. Deploy

Click **Deploy**. Vercel will build and deploy automatically.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Position Calculation

When a user joins the waitlist:

1. Row is inserted into `waitlist`
2. API runs `SELECT COUNT(*) FROM waitlist`
3. Count = total rows = user's position in the Founding Circle

Example: 47th signup → position = 47.
