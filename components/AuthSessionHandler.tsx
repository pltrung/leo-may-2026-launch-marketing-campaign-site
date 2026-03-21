"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { saveUser, clearUser } from "@/lib/userStorage";
import type { CloudType } from "@/lib/cloudData";
import type { Locale } from "@/lib/i18n";
import { isLandingFlowPath } from "@/lib/landingPaths";

const VALID_LOCALES: Locale[] = ["en", "vi"];

function isValidLocale(locale: string): locale is Locale {
  return VALID_LOCALES.includes(locale as Locale);
}

async function restoreUserFromSession(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/waitlist/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    const u = data?.user;
    if (!u?.name || !u?.team) return false;
    const team = u.team as CloudType;
    const identifier = u.email ?? u.phone ?? "";
    const identifier_type = u.email ? ("email" as const) : ("phone" as const);
    saveUser({
      name: u.name,
      email: u.email,
      phone: u.phone,
      team,
      referralCode: u.referralCode,
      identifier: identifier || undefined,
      identifier_type: identifier ? identifier_type : undefined,
      locked: true,
      timestamp: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * On app load: getSession(); if session exists, restore waitlist user state and
 * redirect to countdown when on hero to avoid OTP rate limit and flicker.
 * Listens to onAuthStateChange for SIGNED_IN/SIGNED_OUT.
 * Renders children; on hero, blocks until session check so we can redirect before painting.
 */
export default function AuthSessionHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);

  /** Any prelaunch landing surface (session + waitlist → countdown). */
  const isHero = isLandingFlowPath(pathname);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setSessionCheckComplete(true);
      return;
    }

    let mounted = true;

    const runSessionCheck = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.access_token) {
        const restored = await restoreUserFromSession(session.access_token);
        if (!mounted) return;
        if (restored && isHero) {
          const loc = isValidLocale(locale) ? locale : "en";
          router.replace(`/${loc}/countdown`);
          return;
        }
      }

      setSessionCheckComplete(true);
    };

    runSessionCheck();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.access_token) {
        restoreUserFromSession(session.access_token);
      } else if (event === "SIGNED_OUT") {
        clearUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [locale, isHero, router]);

  useEffect(() => {
    if (!isHero) setSessionCheckComplete(true);
  }, [isHero]);

  if (isHero && !sessionCheckComplete) {
    return null;
  }

  return <>{children}</>;
}
