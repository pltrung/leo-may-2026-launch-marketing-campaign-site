import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdminOrStaff } from "@/lib/gymOperationsAdminAuth";
import { insertAdminAuditLog } from "@/lib/auditLog";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const supabase = createServerClient();
  const status = req.nextUrl.searchParams.get("status");
  let q = supabase
    .from("facility_incidents")
    .select("id, severity, title, description, member_id, status, reported_by_staff_id, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (status === "open" || status === "closed") {
    q = q.eq("status", status);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({ incidents: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const severity = SEVERITIES.includes(body.severity) ? body.severity : "medium";
  const memberId = typeof body.member_id === "string" && body.member_id ? body.member_id.trim() : null;
  if (!title || !description) {
    return NextResponse.json({ error: "title and description required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("facility_incidents")
    .insert({
      title,
      description,
      severity,
      member_id: memberId,
      reported_by_staff_id: auth.u.staffId,
      status: "open",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  await insertAdminAuditLog(supabase, {
    staffId: auth.u.staffId,
    adminAuthId: auth.u.user.id,
    actionType: "facility_incident",
    entityId: data?.id ?? null,
    metadata: { title, severity },
  });
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminOrStaff(req);
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (body.status === "closed") {
    updates.status = "closed";
    updates.resolved_at = new Date().toISOString();
  } else if (body.status === "open") {
    updates.status = "open";
    updates.resolved_at = null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }
  const { error } = await supabase.from("facility_incidents").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
