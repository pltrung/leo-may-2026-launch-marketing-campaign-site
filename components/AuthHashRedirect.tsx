"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

/** Supabase may set session from hash asynchronously; retry getSession and listen for SIGNED_IN. */
const RETRY_INTERVALS_MS = [0, 100, 300, 600];

/**
 * When the URL contains Supabase auth hash (#access_token=..., type=magiclink),
 * we wait for the client to recover the session (it can be async), then redirect
 * to dashboard. Same behavior as countdown/pre-launch: magic link → session → dashboard.
 */
export default function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (!/access_token=/.test(hash) && !/type=magiclink/.test(hash)) return;
    // Let reset-password page handle type=recovery (password reset flow)
    if (/type=recovery/.test(hash)) return;

    // If we're on root (or non-locale path) with hash, go to /en/dashboard with hash so session can be recovered
    const hasLocale = pathname?.startsWith("/en") || pathname?.startsWith("/vi");
    if (!hasLocale) {
      handled.current = true;
      window.location.replace(`/en/dashboard${hash}`);
      return;
    }

    const locale = pathname?.startsWith("/vi") ? "vi" : "en";
    const target = `/${locale}/dashboard`;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }

    const doRedirect = () => {
      if (handled.current) return;
      handled.current = true;
      window.history.replaceState(null, "", target);
      router.replace(target);
    };

    // Listen for session recovery from URL (Supabase fires SIGNED_IN when it parses the hash)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        doRedirect();
      }
    });

    let step = 0;
    const tryRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        doRedirect();
        return;
      }
      step++;
      if (step < RETRY_INTERVALS_MS.length) {
        setTimeout(tryRedirect, RETRY_INTERVALS_MS[step]);
      }
    };
    setTimeout(tryRedirect, RETRY_INTERVALS_MS[0]);

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
