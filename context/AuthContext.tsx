"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { User, Session } from "@supabase/supabase-js";

export interface MemberProfile {
  id: string;
  auth_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  display_name?: string | null;
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
  address?: string | null;
  id_verified_from_cccd?: boolean;
  instagram_handle?: string | null;
  gender?: string | null;
  current_streak?: number;
  best_streak?: number;
  /** 50% off 30/180/365 day passes for 7 days after newbie class ends */
  newbie_graduate_sale?: {
    ends_at: string;
    discount_percent: number;
    eligible_plan_ids: string[];
  } | null;
  /** Stored tier (5 or 10); use merchandise_discount_effective at POS eligibility */
  merchandise_discount_percent?: number;
  merchandise_discount_effective?: number;
  first_visit_welcomed_at?: string | null;
  is_minor?: boolean;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  zalo_user_id?: string | null;
  prefer_zalo_notifications?: boolean;
  prefer_sms_notifications?: boolean;
  credit_balance_vnd?: number;
}

type AuthValue = {
  session: Session | null;
  user: User | null;
  member: MemberProfile | null;
  /** True while /api/member/me is in flight for the latest request */
  memberLoading: boolean;
  loading: boolean;
  accessToken: string | null;
  refresh: (opts?: { backgroundMemberFetch?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Global auth provider. Single source of truth for session.
 * - Initial mount: refresh() runs once with getSession retries
 * - onAuthStateChange: uses session from callback directly (no refresh), avoids cascading cycles
 * - Does not clear session when getSession returns null during hydration
 * - Protected pages wait for loading=false before redirecting
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const fetchMemberGenRef = useRef(0);
  const memberRef = useRef<MemberProfile | null>(null);
  const memberFetchAbortRef = useRef<AbortController | null>(null);
  const scheduleMemberLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMemberFetchRef = useRef<{ token: string; authUserId: string } | null>(null);

  /**
   * Loads /api/member/me. Aborts any in-flight request when a newer run starts (avoids stale
   * responses winning the gen race). Retries 5xx/network. On 401, retries once with a fresh
   * session token before clearing member — fixes duplicate refresh()+onAuthStateChange races.
   */
  const fetchMember = useCallback(async (token: string, options?: { background?: boolean; authUserId?: string }) => {
    const background = options?.background === true;
    const authUserId = options?.authUserId;
    const gen = ++fetchMemberGenRef.current;

    memberFetchAbortRef.current?.abort();
    const controller = new AbortController();
    memberFetchAbortRef.current = controller;

    if (!background) setMemberLoading(true);

    const applyMember = (m: MemberProfile) => {
      if (authUserId && m.auth_id && m.auth_id !== authUserId) return;
      if (gen === fetchMemberGenRef.current) {
        setMember(m);
        return;
      }
      setMember((prev) => (prev == null ? m : prev));
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let attemptToken = token;
    let retried401 = false;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (gen !== fetchMemberGenRef.current) return;

        let res: Response;
        try {
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          res = await fetch("/api/member/me", {
            headers: { Authorization: `Bearer ${attemptToken}` },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          if (attempt < 2 && gen === fetchMemberGenRef.current) {
            await sleep(350 * (attempt + 1));
            continue;
          }
          if (gen === fetchMemberGenRef.current) setMember((prev) => prev);
          return;
        }

        let data: { member?: MemberProfile } = {};
        try {
          data = await res.json();
        } catch {
          /* non-JSON */
        }

        if (res.ok && data?.member) {
          applyMember(data.member);
          return;
        }

        if (res.status === 401) {
          if (!retried401 && authUserId) {
            try {
              const sb = getSupabaseBrowserClient();
              const { data: sess } = await sb.auth.getSession();
              const fresh = sess.session?.access_token;
              const uid = sess.session?.user?.id;
              if (fresh && uid === authUserId) {
                retried401 = true;
                attemptToken = fresh;
                await sleep(80);
                attempt -= 1;
                continue;
              }
            } catch {
              /* ignore */
            }
          }
          if (gen === fetchMemberGenRef.current) setMember(null);
          return;
        }

        if (res.status >= 500 && attempt < 2 && gen === fetchMemberGenRef.current) {
          await sleep(400 * (attempt + 1));
          continue;
        }

        if (gen === fetchMemberGenRef.current) setMember((prev) => prev);
        return;
      }
    } finally {
      if (gen === fetchMemberGenRef.current) setMemberLoading(false);
    }
  }, []);

  /**
   * Debounced /api/member/me — use the token we already have instead of getSession() again.
   * After login redirect, getSession() can still return null 120ms later; using the session
   * from refresh()/onAuthStateChange avoids "Something went wrong" then Retry works.
   */
  const scheduleMemberFetch = useCallback((token: string, authUserId: string) => {
    if (!token || !authUserId) return;
    pendingMemberFetchRef.current = { token, authUserId };
    if (!memberRef.current) setMemberLoading(true);
    if (scheduleMemberLoadTimerRef.current) clearTimeout(scheduleMemberLoadTimerRef.current);
    scheduleMemberLoadTimerRef.current = setTimeout(() => {
      scheduleMemberLoadTimerRef.current = null;
      const pending = pendingMemberFetchRef.current;
      if (pending?.token && pending?.authUserId) {
        const bg = memberRef.current != null;
        fetchMember(pending.token, {
          background: bg,
          authUserId: pending.authUserId,
        });
      } else {
        setMemberLoading(false);
      }
      pendingMemberFetchRef.current = null;
    }, 120);
  }, [fetchMember]);

  const refresh = useCallback(async (opts?: { backgroundMemberFetch?: boolean }) => {
    // Only show full-page loading on first load. Background refresh (e.g. after check-in) must not unmount dashboard.
    if (!initialLoadDoneRef.current) setLoading(true);
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setSession(null);
      setUser(null);
      setMember(null);
      setMemberLoading(false);
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
      // Do not clear session here — getSession can briefly return null during hydration.
      // onAuthStateChange will provide definitive SIGNED_OUT when the user actually signs out.
      setLoading(false);
      return;
    }

    initialLoadDoneRef.current = true;
    const token = s.access_token ?? null;
    setSession(s);
    setUser(s.user ?? null);
    setAccessToken(token);
    setLoading(false);

    scheduleMemberFetch(token, s.user.id);
  }, [scheduleMemberFetch]);

  useEffect(() => {
    memberRef.current = member;
  }, [member]);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setLoading(false);
      return;
    }

    refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const token = session.access_token ?? null;
        setSession(session);
        setUser(session.user ?? null);
        setAccessToken(token);
        setLoading(false);
        if (token) scheduleMemberFetch(token, session.user.id);
      } else {
        fetchMemberGenRef.current += 1;
        memberFetchAbortRef.current?.abort();
        setSession(null);
        setUser(null);
        setMember(null);
        setMemberLoading(false);
        setAccessToken(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (scheduleMemberLoadTimerRef.current) clearTimeout(scheduleMemberLoadTimerRef.current);
    };
  }, [refresh, scheduleMemberFetch]);

  const signOut = useCallback(async () => {
    try {
      const sb = getSupabaseBrowserClient();
      await sb.auth.signOut();
    } catch {
      /* env vars may be missing */
    }
    initialLoadDoneRef.current = false;
    fetchMemberGenRef.current += 1;
    memberFetchAbortRef.current?.abort();
    setSession(null);
    setUser(null);
    setMember(null);
    setMemberLoading(false);
    setAccessToken(null);
  }, []);

  const value: AuthValue = {
    session,
    user,
    member,
    memberLoading,
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
