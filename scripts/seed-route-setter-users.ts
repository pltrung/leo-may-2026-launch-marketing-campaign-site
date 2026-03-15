/**
 * Create route setter / staff auth users for the /route-setter dashboard.
 * routesetter1@gym.local … routesetter4@gym.local
 * Password: leomay2026
 * Staff profiles (staff_profiles) are created on first login via /api/route-setter/me.
 *
 * Usage: npx tsx scripts/seed-route-setter-users.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ROUTE_SETTER_EMAILS } from "../lib/routeSetterAuth";

const STAFF_PASSWORD = "leomay2026";

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

  for (const email of ROUTE_SETTER_EMAILS) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email);

    if (found?.id) {
      const { error } = await supabase.auth.admin.updateUserById(found.id, { password: STAFF_PASSWORD });
      if (error) {
        console.warn(`[${email}] exists; could not reset password:`, error.message);
      } else {
        console.log(`[${email}] password reset to: ${STAFF_PASSWORD}`);
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: STAFF_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        console.error(`[${email}] failed:`, error.message);
      } else {
        console.log(`[${email}] created`);
      }
    }
  }

  console.log("\n--- Route setter accounts (role: route_setter) ---");
  ROUTE_SETTER_EMAILS.forEach((e) => console.log(`  ${e}`));
  console.log(`  Password: ${STAFF_PASSWORD}`);
  console.log("\nGo to /route-setter and sign in. Staff profile is created on first login.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
