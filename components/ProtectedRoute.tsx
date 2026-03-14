"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

/**
 * Protects routes by waiting for auth to resolve, then redirecting if no session.
 * Never redirects during loading — prevents redirect loops during session hydration.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/");
  }, [loading, session, router]);

  if (loading) return <LoadingScreen />;
  if (!session) return null;

  return <>{children}</>;
}
