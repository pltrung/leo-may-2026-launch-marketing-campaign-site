"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { User, Session } from "@supabase/supabase-js";

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

type AuthValue = {
  session: Session | null;
  user: User | null;
  member: MemberProfile | null;
  loading: boolean;
  accessToken: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Global auth provider. Single source of truth for session.
 * - Waits for session hydration (retries) before setting loading=false
 * - Skips refreshSession on /reset-password to avoid invalidating recovery flow
 * - Protected pages must wait for loading=false before redirecting
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const [session, setSession] = useState<Session | null>(null);
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
      setSession(null);
      setUser(null);
      setMember(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    // Retry getSession: after login redirect, session may not be hydrated from cookies yet.
    let s: Session | null = null;
    for (const delay of [0, 150, 400]) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const { data } = await supabase.auth.getSession();
      s = data.session;
      if (s?.user) break;
    }

    if (!s?.user) {
      setSession(null);
      setUser(null);
      setMember(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    // Skip refreshSession on reset-password: recovery sessions can be invalidated
    const isResetPassword =
      pathRef.current?.includes("/reset-password") ||
      (typeof window !== "undefined" && window.location.pathname.includes("/reset-password"));

    let finalSession = s;
    if (!isResetPassword) {
      const { data: { session: fs } } = await supabase.auth.refreshSession();
      finalSession = fs ?? s;
    }

    const token = finalSession?.access_token ?? null;
    setSession(finalSession);
    setUser(finalSession?.user ?? null);
    setAccessToken(token);

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
    setSession(null);
    setUser(null);
    setMember(null);
    setAccessToken(null);
  }, []);

  const value: AuthValue = {
    session,
    user,
    member,
    loading,
    accessToken,
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
