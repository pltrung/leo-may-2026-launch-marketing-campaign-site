/**
 * On route reset day, staff UI shows only "essential" shift tasks (safety / front desk).
 * Must match filtering in GET /api/admin/staff consumers (admin Staff tab + banner).
 */
export function isStaffEssentialTaskDuringRouteReset(title: string): boolean {
  return /anchor|crash|rental|shoe|front desk|pos|bathroom|safety|check bathroom/i.test(
    String(title ?? "").toLowerCase()
  );
}
