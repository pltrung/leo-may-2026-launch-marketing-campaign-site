/**
 * One-time seed: create Supabase Auth users + member_profiles for test waitlist rows
 * (ev*-*@l, dummy2*@test.local) so you can log in to the dashboard via dev-bypass.
 *
 * Run after: seed_evolution_stages.sql + seed_verify_test_accounts.sql (or 008).
 * Usage: npx tsx scripts/seed-test-member-profiles.ts
 *        (or: node --import tsx scripts/seed-test-member-profiles.ts)
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const EVOLUTION_LEVELS = [
  "Gentle Explorer",
  "Sky Listener",
  "Cloud Shaper",
  "Sky Influencer",
  "Founding Cloud",
  "Origin Marker",
];

function tierFromTierLevel(level: number): string {
  const idx = Math.max(0, Math.min(5, level - 1));
  return EVOLUTION_LEVELS[idx] ?? "Explorer";
}

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error: fetchErr } = await supabase
    .from("waitlist")
    .select("id, name, email, phone, tier_level, auth_id")
    .or("email.ilike.ev%-%@l,email.ilike.dummy2%@test.local");

  if (fetchErr) {
    console.error("Failed to fetch waitlist:", fetchErr);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("No test waitlist rows found. Run seed_evolution_stages.sql first.");
    process.exit(0);
  }

  let created = 0;
  let skipped = 0;
  for (const w of rows as { id: string; name: string | null; email: string | null; phone: string | null; tier_level: number | null; auth_id: string | null }[]) {
    const email = w.email?.trim();
    if (!email) {
      skipped++;
      continue;
    }
    if (w.auth_id) {
      skipped++;
      continue;
    }

    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
    });
    if (createErr || !authUser?.user) {
      console.error(`  ${email}: createUser failed`, createErr?.message ?? "");
      continue;
    }

    await supabase.from("waitlist").update({ auth_id: authUser.user.id, updated_at: new Date().toISOString() }).eq("id", w.id);
    const tier = tierFromTierLevel(typeof w.tier_level === "number" ? w.tier_level : 1);
    const { error: insertErr } = await supabase.from("member_profiles").insert({
      auth_id: authUser.user.id,
      email: w.email ?? null,
      phone: w.phone ?? null,
      full_name: w.name ?? "Member",
      tier,
    });
    if (insertErr) {
      console.error(`  ${email}: member_profiles insert failed`, insertErr.message);
      continue;
    }
    console.log(`  Created auth + member_profiles: ${email}`);
    created++;
  }

  console.log(`Done. Created ${created}, skipped ${skipped} (already had auth_id). You can log in via dev-bypass (e.g. ev1-hm@l, no password).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
