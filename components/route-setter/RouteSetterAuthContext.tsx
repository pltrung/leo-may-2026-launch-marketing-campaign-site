"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { isRouteSetterEmail } from "@/lib/routeSetterAuth";
import type { Session } from "@supabase/supabase-js";

export interface StaffProfile {
  id: string;
  auth_id: string;
  email: string;
  role: string;
  display_name: string | null;
}

interface RouteSetterAuthContextValue {
  session: Session | null;
  staff: StaffProfile | null;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  staffFetch: (url: string, init?: RequestInit) => Promise<Response>;
  refreshStaff: () => Promise<void>;
}

const RouteSetterAuthContext = createContext<RouteSetterAuthContextValue | null>(null);

export function RouteSetterAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/route-setter/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.staff) setStaff(data.staff);
      else setStaff(null);
    } catch {
      setStaff(null);
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    const token = session?.access_token;
    if (token) await fetchStaff(token);
  }, [session?.access_token, fetchStaff]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      if (s?.access_token && isRouteSetterEmail(s.user?.email)) {
        fetchStaff(s.access_token);
      } else {
        setStaff(null);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.access_token && isRouteSetterEmail(s.user?.email)) {
        fetchStaff(s.access_token);
      } else {
        setStaff(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchStaff]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    if (!isRouteSetterEmail(data.user?.email)) {
      await supabase.auth.signOut();
      return { error: "Invalid email or password" };
    }
    if (data.session?.access_token) await fetchStaff(data.session.access_token);
    return {};
  }, [fetchStaff]);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setStaff(null);
  }, []);

  const staffFetch = useCallback(
    (url: string, init?: RequestInit) => {
      const token = session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
    [session?.access_token]
  );

  const value: RouteSetterAuthContextValue = {
    session,
    staff,
    loading,
    accessToken: session?.access_token ?? null,
    signIn,
    signOut,
    staffFetch,
    refreshStaff,
  };

  return (
    <RouteSetterAuthContext.Provider value={value}>
      {children}
    </RouteSetterAuthContext.Provider>
  );
}

export function useRouteSetterAuth() {
  const ctx = useContext(RouteSetterAuthContext);
  if (!ctx) throw new Error("useRouteSetterAuth must be used within RouteSetterAuthProvider");
  return ctx;
}
