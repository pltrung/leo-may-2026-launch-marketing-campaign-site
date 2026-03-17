/**
 * Send email via Gmail API (REST).
 * Uses GMAIL_ACCESS_TOKEN from env. Token must have scope gmail.send (or gmail.compose).
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
 * Build a simple MIME message and base64url-encode for Gmail API.
 */
function buildRawMessage(opts: SendEmailOptions): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject.replace(/\r?\n/g, " ")}`,
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
 * Requires env: GMAIL_ACCESS_TOKEN (OAuth2 access token with gmail.send scope).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const token = process.env.GMAIL_ACCESS_TOKEN;
  if (!token?.trim()) {
    throw new Error("GMAIL_ACCESS_TOKEN is not set");
  }
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
