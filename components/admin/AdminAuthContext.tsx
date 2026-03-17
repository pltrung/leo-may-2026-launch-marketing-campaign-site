"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { isAdminEmail } from "@/lib/adminAuth";
import { isRouteSetterEmail } from "@/lib/routeSetterAuth";
import type { Session } from "@supabase/supabase-js";
import type { UnifiedRole } from "@/lib/unifiedAdminAuth";

interface AdminAuthContextValue {
  session: Session | null;
  /** @deprecated Use role === "admin" for full admin; hasAccess for any operational access */
  isAdmin: boolean;
  /** Unified role from staff_profiles (or admin email). Null until /api/admin/me has been fetched. */
  role: UnifiedRole | null;
  staffId: string | null;
  /** Display name from staff_profiles (for profile modal). */
  staffDisplayName: string | null;
  /** Full staff profile from /api/admin/me (for profile modal: DOB, id_number, gender, verified). */
  staffProfile: {
    id: string;
    email: string;
    role: string;
    display_name: string | null;
    id_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    id_verified_from_cccd: boolean;
    address: string | null;
  } | null;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** True when user has any access to /admin (admin, frontdesk, or staff) */
  hasAccess: boolean;
  /** True after /api/admin/me has been attempted (so we can show "no access" instead of loading when session exists but no role) */
  meFetched: boolean;
  canAccessFrontDeskFull: boolean;
  canAccessFrontDeskLimited: boolean;
  canAccessOperations: boolean;
  canAccessManagement: boolean;
  canDoPos: boolean;
  canDoMembershipModify: boolean;
  canDoPaymentConfirm: boolean;
  canAccessRevenue: boolean;
  canDoCheckIn: boolean;
  canAccessInventory: boolean;
  canAccessAdminTools: boolean;
  /** Current gym phase (Pre-open / Gym Open / Closing) from /api/admin/me. Shown in header for Staff and Frontdesk. */
  phase: { phase_label: string; countdown_message: string } | null;
  /** Re-fetch /api/admin/me to refresh role, staffId, staffDisplayName, phase. */
  refreshMe: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function perm(role: UnifiedRole | null) {
  if (!role) return {
    canAccessFrontDeskFull: false,
    canAccessFrontDeskLimited: false,
    canAccessOperations: false,
    canAccessManagement: false,
    canDoPos: false,
    canDoMembershipModify: false,
    canDoPaymentConfirm: false,
    canAccessRevenue: false,
    canDoCheckIn: false,
    canAccessInventory: false,
    canAccessAdminTools: false,
  };
  return {
    canAccessFrontDeskFull: role === "admin" || role === "frontdesk",
    canAccessFrontDeskLimited: role === "staff",
    canAccessOperations: role === "admin" || role === "staff",
    canAccessManagement: role === "admin" || role === "frontdesk",
    canDoPos: true,
    canDoMembershipModify: role === "admin" || role === "frontdesk",
    canDoPaymentConfirm: role === "admin" || role === "frontdesk",
    canAccessRevenue: role === "admin",
    canDoCheckIn: role === "admin" || role === "frontdesk",
    canAccessInventory: role === "admin" || role === "frontdesk",
    canAccessAdminTools: role === "admin",
  };
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UnifiedRole | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffDisplayName, setStaffDisplayName] = useState<string | null>(null);
  const [staffProfile, setStaffProfile] = useState<AdminAuthContextValue["staffProfile"]>(null);
  const [phase, setPhase] = useState<{ phase_label: string; countdown_message: string } | null>(null);
  const [meFetched, setMeFetched] = useState(false);

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

  const adminFetch = useCallback(
    (url: string, init?: RequestInit) => {
      const token = session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
    [session?.access_token]
  );

  const refreshMe = useCallback(() => {
    if (!session?.access_token) return;
    adminFetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) {
          setRole(data.role as UnifiedRole);
          setStaffId(data.staffId ?? null);
          setStaffDisplayName(data.staffProfile?.display_name ?? null);
          setStaffProfile(data.staffProfile ?? null);
          setPhase(data.phase ? { phase_label: data.phase.phase_label, countdown_message: data.phase.countdown_message } : null);
        }
      });
  }, [session?.access_token, adminFetch]);

  useEffect(() => {
    if (!session?.access_token) {
      setRole(null);
      setStaffId(null);
      setStaffDisplayName(null);
      setStaffProfile(null);
      setPhase(null);
      setMeFetched(false);
      return;
    }
    setMeFetched(false);
    adminFetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setMeFetched(true);
        if (data?.role) {
          setRole(data.role as UnifiedRole);
          setStaffId(data.staffId ?? null);
          setStaffDisplayName(data.staffProfile?.display_name ?? null);
          setStaffProfile(data.staffProfile ?? null);
          setPhase(data.phase ? { phase_label: data.phase.phase_label, countdown_message: data.phase.countdown_message } : null);
        } else {
          setRole(null);
          setStaffId(null);
          setStaffDisplayName(null);
          setStaffProfile(null);
          setPhase(null);
        }
      })
      .catch(() => {
        setMeFetched(true);
        setRole(null);
        setStaffId(null);
        setStaffProfile(null);
        setPhase(null);
      });
  }, [session?.access_token, adminFetch]);

  const isAdmin = role === "admin";
  const hasAccess = role === "admin" || role === "frontdesk" || role === "staff";

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    if (isAdminEmail(data.user?.email) || isRouteSetterEmail(data.user?.email)) return {};
    const token = data.session?.access_token;
    if (token) {
      try {
        const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.role) {
          setRole(body.role as UnifiedRole);
          setStaffId(body.staffId ?? null);
          setStaffDisplayName(body.staffProfile?.display_name ?? null);
          setStaffProfile(body.staffProfile ?? null);
          setPhase(body.phase ? { phase_label: body.phase.phase_label, countdown_message: body.phase.countdown_message } : null);
          return {};
        }
        if (!res.ok && body.error) return { error: body.error };
      } catch (e) {
        return { error: "Could not verify access. Try again." };
      }
    }
    await supabase.auth.signOut();
    return { error: "Your account does not have access to the admin dashboard. If you are Front Desk or Staff, ask an admin to add you (run the seed script for frontdesk001)." };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setRole(null);
    setStaffId(null);
    setStaffDisplayName(null);
    setStaffProfile(null);
    setPhase(null);
  }, []);

  const perms = perm(role);

  const value: AdminAuthContextValue = {
    session,
    isAdmin,
    role,
    staffId,
    loading,
    accessToken: session?.access_token ?? null,
    signIn,
    signOut,
    adminFetch,
    hasAccess,
    meFetched,
    ...perms,
    phase,
    staffDisplayName,
    staffProfile,
    refreshMe,
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
