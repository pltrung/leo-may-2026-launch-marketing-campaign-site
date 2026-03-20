/**
 * Campaign blast email helpers — skip obviously invalid addresses and avoid
 * one bad recipient failing the entire send batch.
 */

/** Pragmatic check before calling Gmail (API may still reject). */
export function isValidCampaignEmail(email: string | null | undefined): boolean {
  if (email == null || typeof email !== "string") return false;
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  if (/\s/.test(e)) return false;
  const at = e.indexOf("@");
  if (at < 1 || at !== e.lastIndexOf("@")) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!domain.includes(".")) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}
