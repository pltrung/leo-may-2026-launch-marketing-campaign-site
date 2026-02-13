# Leo Mây — Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose org, name the project (e.g. `leo-may`), set a database password, select region.
4. Wait for the project to be ready.

## 2. Run SQL Migration

1. In the Supabase dashboard, open **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `supabase/migrations/001_create_waitlist.sql`.
4. Click **Run**.

## 3. Get API Keys

1. In Supabase dashboard, go to **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key (under "Project API keys") → use for `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Never expose the service_role key to the browser.** It bypasses RLS and has full access.

## 4. Create `.env.local`

In the project root, create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Replace with your actual values.

## 5. Add Logo

Place your logo at `public/logo.svg` (or `public/logo.png` and update imports).

## 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7. Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import the GitHub repo.
4. Before deploying, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key
5. Deploy.

## 8. Verify Submissions

1. Submit the waitlist form on your live site.
2. In Supabase dashboard, go to **Table Editor** → **waitlist**.
3. Confirm the new row appears.

Do not expose a public SELECT endpoint; keep the list private.
