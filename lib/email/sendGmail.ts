/**
 * Send email via Gmail API (REST).
 * Supports two modes:
 * 1. GMAIL_ACCESS_TOKEN — use directly (expires in ~1 hour).
 * 2. GMAIL_REFRESH_TOKEN + GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET — get a fresh access token automatically (no hourly refresh).
 * Builds RFC 2822 MIME, base64url-encodes, POST to users/me/messages/send.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Optional plain text fallback */
  text?: string;
}

/**
 * Get a valid access token: from env, or by refreshing with GMAIL_REFRESH_TOKEN.
 */
async function getValidAccessToken(): Promise<string> {
  const accessToken = process.env.GMAIL_ACCESS_TOKEN?.trim();
  if (accessToken) return accessToken;

  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  if (refreshToken && clientId && clientSecret) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail token refresh failed: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { access_token?: string };
    if (data.access_token) return data.access_token;
  }

  throw new Error(
    "Set either GMAIL_ACCESS_TOKEN or (GMAIL_REFRESH_TOKEN + GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET) in env"
  );
}

/**
 * Encode subject for non-ASCII (RFC 2047) so "Leo Mây" and punctuation display correctly.
 */
function encodeSubject(subject: string): string {
  const cleaned = subject.replace(/\r?\n/g, " ").trim();
  if (!cleaned) return cleaned;
  const hasNonAscii = /[^\x00-\x7F]/.test(cleaned);
  if (!hasNonAscii) return cleaned;
  const base64 = Buffer.from(cleaned, "utf8").toString("base64");
  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Build a simple MIME message and base64url-encode for Gmail API.
 */
function buildRawMessage(opts: SendEmailOptions): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const subjectLine = encodeSubject(opts.subject);
  const lines: string[] = [
    `To: ${opts.to}`,
    `Subject: ${subjectLine}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    opts.text ?? opts.html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " "),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    opts.html,
    `--${boundary}--`,
  ];
  const mime = lines.join("\r\n");
  const base64 = Buffer.from(mime, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Send one email via Gmail API.
 * Uses GMAIL_ACCESS_TOKEN if set; otherwise refreshes with GMAIL_REFRESH_TOKEN + client id/secret.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const token = await getValidAccessToken();
  const raw = buildRawMessage(opts);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${errText}`);
  }
}
