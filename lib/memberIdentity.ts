/** Govt ID complete: verified from CCCD/eID chip scan, or manual CCCD + legal name + gender + DoB. */
export function memberIdentityComplete(m: {
  id_verified_from_cccd?: boolean | null;
  id_number?: string | null;
  full_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
} | null | undefined): boolean {
  if (!m) return false;
  if (m.id_verified_from_cccd) return true;
  const id = (m.id_number ?? "").trim();
  const name = (m.full_name ?? "").trim();
  const dob = m.date_of_birth ? String(m.date_of_birth).slice(0, 10) : "";
  return (
    id.length >= 8 &&
    name.length >= 2 &&
    (m.gender === "male" || m.gender === "female") &&
    dob.length >= 8
  );
}
