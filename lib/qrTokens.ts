import crypto from "crypto";

const QR_SECRET =
  process.env.QR_SIGNING_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "dev-qr-secret";

type Subject = "member" | "staff";

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Create a short-lived QR token for member or staff.
 * Format: leo-<subject>:<id>:<epochSeconds>:<signature>
 */
export function createQrToken(subject: Subject, id: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = `${subject}:${id}:${nowSec}`;
  const sig = base64Url(
    crypto.createHmac("sha256", QR_SECRET).update(payload).digest()
  );
  return `leo-${subject}:${id}:${nowSec}:${sig}`;
}

export function verifyQrToken(
  expectedSubject: Subject,
  token: string,
  maxAgeSeconds = 60
): { ok: boolean; id?: string; error?: string } {
  const raw = token.trim();
  const parts = raw.split(":");
  if (parts.length !== 4) {
    return { ok: false, error: "Invalid token format" };
  }
  const [prefix, id, epochStr, sig] = parts;
  const subjectFromPrefix =
    prefix === "leo-member" ? "member" : prefix === "leo-staff" ? "staff" : null;

  if (!subjectFromPrefix || subjectFromPrefix !== expectedSubject) {
    return { ok: false, error: "Invalid token subject" };
  }
  const epoch = parseInt(epochStr, 10);
  if (!Number.isFinite(epoch)) {
    return { ok: false, error: "Invalid token timestamp" };
  }

  const payload = `${subjectFromPrefix}:${id}:${epoch}`;
  const expectedSig = base64Url(
    crypto.createHmac("sha256", QR_SECRET).update(payload).digest()
  );

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { ok: false, error: "Invalid token signature" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - epoch) > maxAgeSeconds) {
    return { ok: false, error: "Token expired" };
  }

  return { ok: true, id };
}

