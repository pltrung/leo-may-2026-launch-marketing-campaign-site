"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RouteSetterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en/staff");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">Redirecting to staff…</p>
    </div>
  );
}
