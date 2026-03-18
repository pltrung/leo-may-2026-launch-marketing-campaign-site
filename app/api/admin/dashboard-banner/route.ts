import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday, getGymStartOfDay, getGymEndOfDay } from "@/lib/gymTimezone";

const GYM_TZ = "America/Los_Angeles";
const RESTOCK_THRESHOLD = 5;

function getGymMinutesFromMidnight(): number {
  const t = new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: GYM_TZ,
  }).slice(0, 5);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type ShiftPhase = "closed" | "pre_open" | "gym_open" | "closing";

function getCurrentPhase(): ShiftPhase {
  const mins = getGymMinutesFromMidnight();
  if (mins < 6 * 60) return "closed";
  if (mins < 10 * 60) return "pre_open";
  if (mins < 22 * 60) return "gym_open";
  return "closing";
}

const SAFETY_TASK_TITLES = ["Inspect anchors", "Inspect crash pads", "Check rental shoes"];

/**
 * GET /api/admin/dashboard-banner
 * Returns { gym_ready, checkins_today, inventory_need_restock } for frontdesk (and admin) banner.
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified || (unified.role !== "admin" && unified.role !== "frontdesk"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const today = getGymToday();
  const startOfToday = getGymStartOfDay(today);
  const endOfToday = getGymEndOfDay(today);

  const [tasksRes, checkinsRes, invRes] = await Promise.all([
    supabase
      .from("staff_tasks")
      .select("id, title, block, status")
      .eq("block", "pre_open"),
    supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("counts_as_visit", true)
      .gte("timestamp", startOfToday)
      .lt("timestamp", endOfToday),
    supabase.from("inventory").select("variant_id, quantity"),
  ]);

  const tasks = (tasksRes.data ?? []) as { id: string; title: string; block: string; status: string }[];
  const checkinsToday = typeof checkinsRes.count === "number" ? checkinsRes.count : 0;
  const invRows = (invRes.data ?? []) as { variant_id: string; quantity: number }[];

  const qtyByVariant: Record<string, number> = {};
  for (const r of invRows) {
    qtyByVariant[r.variant_id] = (qtyByVariant[r.variant_id] ?? 0) + (r.quantity ?? 0);
  }
  const { data: variantRows } = await supabase.from("product_variants").select("id");
  const variantIds = (variantRows ?? []).map((v) => v.id);
  const inventoryNeedRestock = variantIds.filter((id) => (qtyByVariant[id] ?? 0) <= RESTOCK_THRESHOLD).length;

  const phase = getCurrentPhase();
  const safetyTasks = tasks.filter((t) =>
    SAFETY_TASK_TITLES.some((title) => (t.title ?? "").trim().toLowerCase() === title.toLowerCase())
  );
  const gymReady =
    phase === "closed"
      ? false
      : phase === "pre_open"
      ? safetyTasks.length >= 3 && safetyTasks.every((t) => t.status === "completed")
      : phase === "gym_open" || phase === "closing";

  return NextResponse.json({
    gym_ready: gymReady,
    checkins_today: checkinsToday,
    inventory_need_restock: inventoryNeedRestock,
  });
}
