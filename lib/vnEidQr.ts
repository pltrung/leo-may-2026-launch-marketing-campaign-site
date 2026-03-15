/**
 * Parse VN eID (CCCD/CMND) or passport identifier from QR code content.
 * Handles: raw number, URL params, or JSON with common field names.
 */
export function extractIdFromVnEidQr(content: string): string | null {
  const raw = content.trim();
  if (!raw) return null;

  // Plain digits (VN CCCD 12 digits, CMND 9 digits) or alphanumeric (passport)
  const digitsOrAlpha = raw.replace(/[\s\-._]/g, "");
  if (digitsOrAlpha.length >= 6 && /^[A-Za-z0-9]+$/.test(digitsOrAlpha)) {
    return digitsOrAlpha;
  }

  // If the whole string looks like an ID (reasonable length, alphanumeric)
  if (raw.length >= 6 && raw.length <= 32 && /^[A-Za-z0-9\s\-._]+$/.test(raw)) {
    return raw.replace(/\s+/g, "").replace(/[-._]/g, "") || null;
  }

  // URL: ?id=... or ?cccd=... or ?identifier=... or ?so_cccd=...
  try {
    const url = new URL(raw);
    const params = url.searchParams;
    const fromParam =
      params.get("id") ??
      params.get("cccd") ??
      params.get("identifier") ??
      params.get("so_cccd") ??
      params.get("id_number");
    if (fromParam && fromParam.trim().length >= 6) {
      return fromParam.trim().replace(/\s+/g, "");
    }
  } catch {
    // not a URL
  }

  // JSON: common keys for eID/chip data
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const keys = [
      "id",
      "id_number",
      "cccd",
      "so_cccd",
      "identifier",
      "identifier_number",
      "number",
      "citizen_id",
    ];
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && v.trim().length >= 6) {
        return v.trim().replace(/\s+/g, "");
      }
    }
  } catch {
    // not JSON
  }

  return null;
}
