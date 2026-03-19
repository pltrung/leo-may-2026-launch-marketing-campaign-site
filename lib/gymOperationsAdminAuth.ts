import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest, type UnifiedAdminResult } from "@/lib/unifiedAdminAuth";

export async function requireUnified(
  req: NextRequest
): Promise<{ u: UnifiedAdminResult } | { res: NextResponse }> {
  const u = await getUnifiedAdminOrStaffFromRequest(req);
  if (!u) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { u };
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ u: UnifiedAdminResult } | { res: NextResponse }> {
  const r = await requireUnified(req);
  if ("res" in r) return r;
  if (r.u.role !== "admin") {
    return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { u: r.u };
}

/** Admin or staff (operations / safety modules). */
export async function requireAdminOrStaff(
  req: NextRequest
): Promise<{ u: UnifiedAdminResult } | { res: NextResponse }> {
  const r = await requireUnified(req);
  if ("res" in r) return r;
  if (r.u.role !== "admin" && r.u.role !== "staff") {
    return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { u: r.u };
}

/** Front desk, admin, or staff — shift close & walk-in desk. */
export async function requireDeskStaff(
  req: NextRequest
): Promise<{ u: UnifiedAdminResult } | { res: NextResponse }> {
  return requireUnified(req);
}
