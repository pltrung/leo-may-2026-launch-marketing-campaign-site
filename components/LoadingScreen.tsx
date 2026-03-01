"use client";

import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/messages";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";

const LOGO_SRC = "/logo-white.svg";
const CLOUD_SRC = "/brand/cloud-copyright.svg";

export default function LoadingScreen() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/vi") ? "vi" : "en";
  const t = getMessages(locale as "en" | "vi").loading;
  return (
    <div id="loading-screen" className="loading-screen" aria-hidden>
      <div className="loading-inner">
        {isValidImgSrc(LOGO_SRC) ? (
          <SafeImg src={LOGO_SRC} className="loading-logo" alt="" />
        ) : null}
        <div className="loading-cloud">
          {isValidImgSrc(CLOUD_SRC) ? (
            <SafeImg src={CLOUD_SRC} alt="" />
          ) : null}
        </div>
        <div className="loading-text">{t.preparingTheSky}</div>
      </div>
    </div>
  );
}
