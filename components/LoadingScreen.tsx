"use client";

import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/messages";

export default function LoadingScreen() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/vi") ? "vi" : "en";
  const t = getMessages(locale as "en" | "vi").loading;
  return (
    <div id="loading-screen" className="loading-screen" aria-hidden>
      <div className="loading-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" className="loading-logo" alt="" />
        <div className="loading-cloud">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cloud-copyright.svg" alt="" />
        </div>
        <div className="loading-text">{t.preparingTheSky}</div>
      </div>
    </div>
  );
}
