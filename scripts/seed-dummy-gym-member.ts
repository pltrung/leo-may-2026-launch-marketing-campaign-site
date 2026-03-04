/**
 * Create a single dummy gym member you can log in with (email + password).
 * Uses member_profiles (not a "memberships" table); links to Supabase Auth.
 *
 * Usage: npx tsx scripts/seed-dummy-gym-member.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Then on /gym → "Trở thành thành viên" → Login: use the email and password printed below.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DUMMY_EMAIL = "dummy@gym.local";
const DUMMY_PASSWORD = "password123";
const DUMMY_NAME = "Dummy Member";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
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

  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email?.toLowerCase() === DUMMY_EMAIL);

  let authId: string;
  if (existingUser?.id) {
    authId = existingUser.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DUMMY_PASSWORD,
    });
    if (updateErr) {
      console.warn("User exists; could not reset password:", updateErr.message);
    } else {
      console.log("User already existed; password reset to:", DUMMY_PASSWORD);
    }
  } else {
    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email: DUMMY_EMAIL,
      password: DUMMY_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !authUser?.user) {
      console.error("Failed to create auth user:", createErr?.message ?? "");
      process.exit(1);
    }
    authId = authUser.user.id;
    console.log("Created auth user:", DUMMY_EMAIL);
  }

  const { data: existingProfile } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: insertErr } = await supabase.from("member_profiles").insert({
      auth_id: authId,
      email: DUMMY_EMAIL,
      full_name: DUMMY_NAME,
      tier: "Explorer",
    });
    if (insertErr) {
      console.error("Failed to create member_profile:", insertErr.message);
      process.exit(1);
    }
    console.log("Created member_profiles row for", DUMMY_EMAIL);
  } else {
    console.log("member_profiles row already exists for this user.");
  }

  console.log("\n--- Login with ---");
  console.log("  Email:", DUMMY_EMAIL);
  console.log("  Password:", DUMMY_PASSWORD);
  console.log("\nOn /gym open the membership sheet → Login (I have an account) and enter the above.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
