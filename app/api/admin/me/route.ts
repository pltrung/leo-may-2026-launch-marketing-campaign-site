import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * GET /api/admin/me
 * Authorization: Bearer <access_token>
 * Returns current user and unified role (admin | frontdesk | staff) and staffId when applicable.
 * Accepts both admin emails and staff_profiles users (route setters, frontdesk, etc.).
 */
export async function GET(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
        }
      : null,
  });
}
