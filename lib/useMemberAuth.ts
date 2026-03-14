"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

export interface MemberProfile {
  id: string;
  auth_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  member_code?: string | null;
  tier?: string;
  membership_status?: string;
  membership_expires_at?: string | null;
  visits_remaining?: number;
  waiver_signed: boolean;
  waiver_signed_at: string | null;
  created_at: string;
  total_visits?: number;
  last_checkin?: string | null;
  profile_photo_url?: string | null;
  id_number?: string | null;
  date_of_birth?: string | null;
  instagram_handle?: string | null;
  gender?: string | null;
}

/**
 * Auth hook for dashboard, waiver, gym header. Runs only where used.
 * Reset-password does not use this — it manages session directly — so recovery flow is untouched.
 */
export function useMemberAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setUser(null);
      setMember(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      setMember(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }
    const { data: { session: freshSession } } = await supabase.auth.refreshSession();
    const token = (freshSession ?? session).access_token;
    setUser((freshSession ?? session).user);
    setAccessToken(token ?? null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/member/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data?.member) setMember(data.member);
      else setMember(null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setLoading(false);
      return;
    }
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      const sb = getSupabaseBrowserClient();
      await sb.auth.signOut();
    } catch {
      /* env vars may be missing */
    }
    setUser(null);
    setMember(null);
    setAccessToken(null);
  }, []);

  return { user, member, loading, accessToken, refresh, signOut };
}
