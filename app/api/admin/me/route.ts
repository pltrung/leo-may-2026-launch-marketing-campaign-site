import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getCurrentPhaseInfo } from "@/lib/gymTimezone";

/**
 * GET /api/admin/me
 * Authorization: Bearer <access_token>
 * Returns current user and unified role (admin | frontdesk | staff) and staffId when applicable.
 * Includes current gym phase for header (Staff and Frontdesk see phase at a glance).
 */
export async function GET(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const phase = getCurrentPhaseInfo();
  return NextResponse.json({
    user: { id: result.user.id, email: result.user.email },
    role: result.role,
    staffId: result.staffId ?? null,
    staffProfile: result.staffProfile
      ? {
          id: result.staffProfile.id,
          auth_id: result.staffProfile.auth_id,
          email: result.staffProfile.email,
          role: result.staffProfile.role,
          display_name: result.staffProfile.display_name,
          id_number: result.staffProfile.id_number ?? null,
          date_of_birth: result.staffProfile.date_of_birth ?? null,
          gender: result.staffProfile.gender ?? null,
          id_verified_from_cccd: result.staffProfile.id_verified_from_cccd ?? false,
          address: result.staffProfile.address ?? null,
        }
      : null,
    phase: { current_phase: phase.current_phase, phase_label: phase.phase_label, countdown_message: phase.countdown_message },
  });
}
