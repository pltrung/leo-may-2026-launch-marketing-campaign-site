/**
 * Normalize phone to E.164 for storage and Supabase Auth.
 * Vietnam (+84) and US (+1) supported when no country code.
 */
export function toE164(phone: string): string {
  const trimmed = phone.trim().replace(/\s/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (digits.length === 10 && digits.startsWith("0")) return `+84${digits.slice(1)}`;
  if (digits.length === 9 && /^[98753]/.test(digits)) return `+84${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}
