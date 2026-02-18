/**
 * Normalize email for storage and lookup so that plus-addressing (e.g. user+1@gmail.com)
 * is treated as the same inbox (user@gmail.com). Prevents one person from creating
 * multiple accounts via user+1@, user+2@, etc.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const plus = local.indexOf("+");
  const localNormalized = plus >= 0 ? local.slice(0, plus) : local;
  return localNormalized + domain;
}
