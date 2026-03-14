"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useRouter } from "next/navigation";

/**
 * Membership entry is now in the gym modal. Redirect to /gym.
 */
export default function MembershipRedirectPage() {
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${locale}/gym`);
  }, [locale, router]);
  return (
    <div className="min-h-screen flex items-center justify-center sky-auth-page">
      <p className="text-[var(--sky-text-secondary)] text-sm">Redirecting…</p>
    </div>
  );
}
