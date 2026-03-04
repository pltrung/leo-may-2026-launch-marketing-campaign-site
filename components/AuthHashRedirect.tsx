"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

/**
 * When the URL contains Supabase auth hash (#access_token=...), Supabase client
 * will consume it on getSession(). We then redirect to dashboard so the user
 * doesn't stay on a blank or wrong page (e.g. localhost:3000/#access_token=...).
 */
export default function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (!/access_token=/.test(hash) && !/type=magiclink/.test(hash)) return;

    handled.current = true;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const locale = pathname?.startsWith("/vi") ? "vi" : "en";
      const target = `/${locale}/dashboard`;
      window.history.replaceState(null, "", target);
      router.replace(target);
    })();
  }, [pathname, router]);

  return null;
}
