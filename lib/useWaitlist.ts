"use client";

import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 30_000;

export interface WaitlistProfile {
  name: string;
  referralCount: number;
  referralCode: string | null;
  traitUnlocked: boolean;
  isVerified: boolean;
  tierLevel: number;
  totalContributionUsd: number;
  identifier?: string;
  identifier_type?: "email" | "phone";
}

const DEFAULT_PROFILE: WaitlistProfile = {
  name: "Member",
  referralCount: 0,
  referralCode: null,
  traitUnlocked: false,
  isVerified: false,
  tierLevel: 1,
  totalContributionUsd: 0,
};

/**
 * Fetches waitlist row by email or phone (via /api/user-profile).
 * Exposes refreshWaitlist() to refetch without page reload.
 */
export function useWaitlist(email?: string, phone?: string): { profile: WaitlistProfile; refreshWaitlist: () => void } {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profile, setProfile] = useState<WaitlistProfile>(DEFAULT_PROFILE);

  const refreshWaitlist = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!email && !phone) return;
    const fetchProfile = () => {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);
      fetch(`/api/user-profile?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && (d.referralCount !== undefined || d.name !== undefined)) {
            setProfile({
              name: typeof d.name === "string" ? d.name : DEFAULT_PROFILE.name,
              referralCount: typeof d.referralCount === "number" ? d.referralCount : 0,
              referralCode: d.referralCode ?? null,
              traitUnlocked: d.traitUnlocked === true,
              isVerified: d.isVerified === true,
              tierLevel: typeof d.tierLevel === "number" && d.tierLevel >= 1 && d.tierLevel <= 6 ? d.tierLevel : 1,
              totalContributionUsd: typeof d.totalContributionUsd === "number" ? Math.max(0, d.totalContributionUsd) : 0,
              identifier: d.email ?? d.phone,
              identifier_type: d.email ? "email" : d.phone ? "phone" : undefined,
            });
          }
        })
        .catch(() => {});
    };
    fetchProfile();
    const id = setInterval(fetchProfile, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [email, phone, refreshTrigger]);

  return { profile, refreshWaitlist };
}
