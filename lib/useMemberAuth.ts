"use client";

import { useAuth } from "@/context/AuthContext";

export type { MemberProfile } from "@/context/AuthContext";

/**
 * Auth hook for dashboard, waiver, gym header.
 * Consumes global AuthProvider — single source of truth, no redirects before loading=false.
 */
export function useMemberAuth() {
  return useAuth();
}
