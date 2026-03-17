import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

const STAFF_PROFILE_BASE = "id, auth_id, email, role, display_name";
const STAFF_PROFILE_EXTENDED = "id, auth_id, email, role, display_name, id_number, date_of_birth, gender, id_verified_from_cccd, address";

/**
 * GET /api/admin/staff/profile
 * Returns full staff profile (including id_number, date_of_birth, gender, id_verified_from_cccd, address when migration 040 applied).
 */
export async function GET(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  let { data: row, error } = await supabase
    .from("staff_profiles")
    .select(STAFF_PROFILE_EXTENDED)
    .eq("id", staffId)
    .single();

  if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
    const fallback = await supabase.from("staff_profiles").select(STAFF_PROFILE_BASE).eq("id", staffId).single();
    row = fallback.data as typeof row;
    error = fallback.error;
  }
  if (error || !row) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 500 });

  return NextResponse.json({
    staff: {
      id: row.id,
      auth_id: row.auth_id,
      email: row.email,
      role: row.role,
      display_name: row.display_name ?? null,
      id_number: (row as { id_number?: string }).id_number ?? null,
      date_of_birth: (row as { date_of_birth?: string }).date_of_birth ?? null,
      gender: (row as { gender?: string }).gender ?? null,
      id_verified_from_cccd: (row as { id_verified_from_cccd?: boolean }).id_verified_from_cccd ?? false,
      address: (row as { address?: string }).address ?? null,
    },
  });
}

/**
 * PATCH /api/admin/staff/profile
 * Body: { display_name?, id_number?, date_of_birth?, gender?, address?, id_verified_from_cccd? }
 * Updates the current staff's profile. Allowed when user has staff profile (staff or frontdesk with staffId).
 */
export async function PATCH(request: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(request);
  if (!unified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    display_name?: string;
    id_number?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    address?: string | null;
    id_verified_from_cccd?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  let staffId = unified.staffId;
  if (!staffId) {
    const r = await supabase.from("staff_profiles").select("id").eq("auth_id", unified.user.id).single();
    staffId = r.data?.id ?? null;
  }
  if (!staffId) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const displayName =
    typeof body.display_name === "string"
      ? body.display_name.trim().slice(0, 120) || null
      : undefined;
  const idNumber =
    body.id_number === null || (typeof body.id_number === "string" && body.id_number.trim() === "")
      ? null
      : typeof body.id_number === "string"
        ? body.id_number.trim().slice(0, 50) || null
        : undefined;
  const dateOfBirth =
    body.date_of_birth === null || (typeof body.date_of_birth === "string" && body.date_of_birth.trim() === "")
      ? null
      : typeof body.date_of_birth === "string"
        ? body.date_of_birth.trim().slice(0, 10) || null
        : undefined;
  const gender =
    body.gender === null || body.gender === ""
      ? null
      : body.gender === "male" || body.gender === "female"
        ? body.gender
        : undefined;
  const address =
    body.address === null || (typeof body.address === "string" && body.address.trim() === "")
      ? null
      : typeof body.address === "string"
        ? body.address.trim().slice(0, 500) || null
        : undefined;
  const idVerifiedFromCccd =
    typeof body.id_verified_from_cccd === "boolean" ? body.id_verified_from_cccd : undefined;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (displayName !== undefined) updates.display_name = displayName;
  if (idNumber !== undefined) updates.id_number = idNumber;
  if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
  if (gender !== undefined) updates.gender = gender;
  if (address !== undefined) updates.address = address;
  if (idVerifiedFromCccd !== undefined) updates.id_verified_from_cccd = idVerifiedFromCccd;

  const { data: updated, error: updateErr } = await supabase
    .from("staff_profiles")
    .update(updates)
    .eq("id", staffId)
    .select("id, email, display_name, id_number, date_of_birth, gender, id_verified_from_cccd, address")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ staff: updated });
}
