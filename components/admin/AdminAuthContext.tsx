"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { isAdminEmail } from "@/lib/adminAuth";
import type { Session } from "@supabase/supabase-js";

interface AdminAuthContextValue {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = !!(session?.user && isAdminEmail(session.user.email));

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    if (!isAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      return { error: "Invalid email or password" };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
  }, []);

  const adminFetch = useCallback(
    (url: string, init?: RequestInit) => {
      const token = session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
    [session?.access_token]
  );

  const value: AdminAuthContextValue = {
    session,
    isAdmin,
    loading,
    accessToken: session?.access_token ?? null,
    signIn,
    signOut,
    adminFetch,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
