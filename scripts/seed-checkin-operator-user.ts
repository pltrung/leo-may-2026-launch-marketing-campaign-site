/**
 * Create kiosk check-in operator account for /gym/checkin.
 * checkin@gym.local / Password: leomay2026
 *
 * Usage: npx tsx scripts/seed-checkin-operator-user.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const EMAIL = "checkin@gym.local";
const PASSWORD = "leomay2026";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

async function findUserIdByEmail(
  supabase: any,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    const found = users.find((u: { email?: string; id?: string }) => u.email?.toLowerCase() === email);
    if (found?.id) return found.id;
    if (users.length < perPage) return null;
    page++;
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

  let authId = await findUserIdByEmail(supabase, EMAIL);
  if (authId) {
    const { error } = await supabase.auth.admin.updateUserById(authId, { password: PASSWORD });
    if (error) {
      console.warn("User exists; could not reset password:", error.message);
    } else {
      console.log(`[${EMAIL}] password reset to: ${PASSWORD}`);
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user?.id) {
      console.error("Create user failed:", error?.message ?? "unknown");
      process.exit(1);
    }
    authId = data.user.id;
    console.log(`[${EMAIL}] Auth user created`);
  }

  const { data: existingProfile } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (existingProfile?.id) {
    const { error } = await supabase
      .from("staff_profiles")
      .update({
        email: EMAIL,
        role: "checkin_operator",
        display_name: "Check-in Operator",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfile.id);
    if (error) {
      console.error("Update staff_profiles failed:", error.message);
      process.exit(1);
    }
    console.log("[staff_profiles] updated role to checkin_operator");
  } else {
    const { error } = await supabase.from("staff_profiles").insert({
      auth_id: authId,
      email: EMAIL,
      role: "checkin_operator",
      display_name: "Check-in Operator",
    });
    if (error) {
      console.error("Insert staff_profiles failed:", error.message);
      process.exit(1);
    }
    console.log("[staff_profiles] row created with role checkin_operator");
  }

  console.log("\n--- Check-in operator account ---");
  console.log(`  ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log("\nOpen /gym/checkin and log in with this account.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
