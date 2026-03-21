/** User metadata flag: must finish /claim/complete-password before using dashboard. */
export const PRELAUNCH_CLAIM_PASSWORD_PENDING_KEY = "prelaunch_claim_password_pending" as const;

export function isPrelaunchClaimPasswordPending(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.[PRELAUNCH_CLAIM_PASSWORD_PENDING_KEY] === true;
}
