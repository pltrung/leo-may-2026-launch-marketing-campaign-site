"use client";

import { useContext } from "react";
import { MemberAuthContext } from "@/context/MemberAuthContext";

export type { MemberProfile } from "@/context/MemberAuthContext";

/**
 * Use auth from MemberAuthProvider (root layout). Auth state persists across
 * locale changes, so language switch on /dashboard stays on dashboard.
 */
export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error("useMemberAuth must be used within MemberAuthProvider");
  return ctx;
}
