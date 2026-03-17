/**
 * Create frontdesk user for the Leo Mây admin dashboard.
 * frontdesk001@gym.local / Password: leomay2026
 *
 * Usage: npx tsx scripts/seed-frontdesk-users.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const FRONTDESK_EMAIL = "frontdesk001@gym.local";
const FRONTDESK_PASSWORD = "leomay2026";

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

  // listUsers() returns only the first page (~50). Paginate to find user by email.
  let found: { id: string } | undefined;
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    found = users.find((u) => u.email?.toLowerCase() === FRONTDESK_EMAIL);
    if (found || users.length < perPage) break;
    page++;
  }

  let authId: string;

  if (found) {
    authId = found.id;
    const { error } = await supabase.auth.admin.updateUserById(authId, { password: FRONTDESK_PASSWORD });
    if (error) {
      console.warn("User exists; could not reset password:", error.message);
    } else {
      console.log(`[${FRONTDESK_EMAIL}] password reset to: ${FRONTDESK_PASSWORD}`);
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: FRONTDESK_EMAIL,
      password: FRONTDESK_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("Create user failed:", error.message);
      process.exit(1);
    }
    authId = data.user.id;
    console.log(`[${FRONTDESK_EMAIL}] Auth user created`);
  }

  const { data: existingProfile } = await supabase
    .from("staff_profiles")
    .select("id, role")
    .eq("auth_id", authId)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await supabase
      .from("staff_profiles")
      .update({ email: FRONTDESK_EMAIL, role: "frontdesk", updated_at: new Date().toISOString() })
      .eq("id", existingProfile.id);
    if (error) {
      console.error("Update staff_profiles failed:", error.message);
      process.exit(1);
    }
    console.log("[staff_profiles] updated role to frontdesk");
  } else {
    const { error } = await supabase.from("staff_profiles").insert({
      auth_id: authId,
      email: FRONTDESK_EMAIL,
      role: "frontdesk",
      display_name: "Front Desk",
    });
    if (error) {
      console.error("Insert staff_profiles failed:", error.message);
      process.exit(1);
    }
    console.log("[staff_profiles] row created with role frontdesk");
  }

  console.log("\n--- Frontdesk account ---");
  console.log(`  ${FRONTDESK_EMAIL}`);
  console.log(`  Password: ${FRONTDESK_PASSWORD}`);
  console.log("\nGo to /admin and log in to use the Front Desk Dashboard.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
