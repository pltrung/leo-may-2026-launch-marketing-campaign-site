/**
 * Create admin users for the Leo Mây admin dashboard.
 * admin001@gym.local, admin002@gym.local, admin003@gym.local
 * Password: leomay2026
 *
 * Usage: npx tsx scripts/seed-admin-users.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ADMIN_EMAILS } from "../lib/adminAuth";

const ADMIN_PASSWORD = "leomay2026";

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

  for (const email of ADMIN_EMAILS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === email);

    if (found?.id) {
      const { error } = await supabase.auth.admin.updateUserById(found.id, { password: ADMIN_PASSWORD });
      if (error) {
        console.warn(`[${email}] exists; could not reset password:`, error.message);
      } else {
        console.log(`[${email}] password reset to: ${ADMIN_PASSWORD}`);
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        console.error(`[${email}] failed:`, error.message);
      } else {
        console.log(`[${email}] created`);
      }
    }
  }

  console.log("\n--- Admin accounts ---");
  console.log("  admin001@gym.local");
  console.log("  admin002@gym.local");
  console.log("  admin003@gym.local");
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nGo to /admin and log in with any of the above.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
