"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
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

type MemberAuthValue = {
  user: User | null;
  member: MemberProfile | null;
  loading: boolean;
  accessToken: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const MemberAuthContext = createContext<MemberAuthValue | null>(null);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
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
    // Retry getSession: on slow load or during profile/waiver updates, session can be briefly null.
    let session: { access_token?: string; user?: { id: string } } | null = null;
    for (const delay of [0, 150, 400]) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const { data } = await supabase.auth.getSession();
      session = data.session;
      if (session?.user) break;
    }
    if (!session?.user) {
      setUser(null);
      setMember(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }
    // Skip refreshSession on reset-password: recovery sessions can be invalidated by it,
    // causing "Auth session missing!" when user tries to set new password.
    const isResetPassword = pathRef.current?.includes("/reset-password");
    let freshSession = session;
    if (!isResetPassword) {
      const { data: { session: fs } } = await supabase.auth.refreshSession();
      freshSession = fs ?? session;
    }
    const token = freshSession.access_token;
    setUser(freshSession.user);
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

  const value: MemberAuthValue = {
    user,
    member,
    loading,
    accessToken,
    refresh,
    signOut,
  };

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuthContext(): MemberAuthValue {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error("useMemberAuthContext must be used within MemberAuthProvider");
  return ctx;
}
