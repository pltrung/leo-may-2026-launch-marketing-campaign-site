/**
 * Extension logic for membership stacking.
 * new_expiry = max(current_membership_expiry, today) + duration_days
 * This prevents users from losing unused days.
 */
export function computeNewExpiry(
  currentExpiry: Date | null,
  durationDays: number,
  today?: Date
): Date {
  const now = today ?? new Date();
  const base = currentExpiry && currentExpiry.getTime() > now.getTime()
    ? currentExpiry
    : now;
  const result = new Date(base);
  result.setDate(result.getDate() + durationDays);
  return result;
}
