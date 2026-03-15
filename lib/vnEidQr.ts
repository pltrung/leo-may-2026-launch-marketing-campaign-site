/**
 * VN eID (CCCD) pipe-delimited format from QR:
 * CCCD|old_CCCD?|Full name|DDMMYYYY|Gender(VN)|Address|Issue date(DDMMYYYY)
 * Example: 001096046146|013446969|Phạm Lê Minh Trung|17051996|Nam|D3a2 15+16 Khu...|24042024
 */
export interface CccdParsed {
  id_number: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: "male" | "female" | "";
  address: string;
}

function formatDob(ddmmyyyy: string): string | null {
  const cleaned = ddmmyyyy.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;
  const d = cleaned.slice(0, 2);
  const m = cleaned.slice(2, 4);
  const y = cleaned.slice(4, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Parse CCCD QR content (pipe-delimited). Returns all profile fields to fill.
 * 7 parts: cccd, old_cccd, name, dob, gender, address, issue_date
 * 6 parts: cccd, name, dob, gender, address, issue_date (no old CCCD)
 */
export function parseCccdPipeDelimited(content: string): CccdParsed | null {
  const raw = content.trim();
  if (!raw) return null;

  const parts = raw.split("|").map((p) => p.trim());
  if (parts.length < 6) return null;

  let id_number: string;
  let full_name: string;
  let dobRaw: string;
  let genderVn: string;
  let address: string;

  // part[1] is 9 digits = old CCCD (7-part format)
  if (parts.length >= 7 && /^\d{9}$/.test(parts[1])) {
    id_number = parts[0];
    full_name = parts[2];
    dobRaw = parts[3];
    genderVn = parts[4];
    address = parts[5] ?? "";
  } else {
    id_number = parts[0];
    full_name = parts[1];
    dobRaw = parts[2];
    genderVn = parts[3];
    address = parts[4] ?? "";
  }

  const date_of_birth = formatDob(dobRaw);
  if (!id_number || !full_name || !date_of_birth) return null;

  const gender =
    genderVn === "Nam" ? "male" : genderVn === "Nữ" ? "female" : ("" as const);

  return {
    id_number,
    full_name,
    date_of_birth,
    gender,
    address: address.trim(),
  };
}

/**
 * Parse VN eID (CCCD/CMND) or passport identifier from QR code content.
 * Handles: pipe-delimited CCCD (use parseCccdPipeDelimited first), raw number, URL params, JSON.
 */
export function extractIdFromVnEidQr(content: string): string | null {
  const pipe = parseCccdPipeDelimited(content);
  if (pipe) return pipe.id_number;

  const raw = content.trim();
  if (!raw) return null;

  const digitsOrAlpha = raw.replace(/[\s\-._]/g, "");
  if (digitsOrAlpha.length >= 6 && /^[A-Za-z0-9]+$/.test(digitsOrAlpha)) {
    return digitsOrAlpha;
  }

  if (raw.length >= 6 && raw.length <= 32 && /^[A-Za-z0-9\s\-._]+$/.test(raw)) {
    return raw.replace(/\s+/g, "").replace(/[-._]/g, "") || null;
  }

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
    /* not URL */
  }

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
    /* not JSON */
  }

  return null;
}
