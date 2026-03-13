"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/messages";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

const LOGO_SRC = "/logo-white.svg";
const CLOUD_SRC = "/brand/cloud-copyright.svg";
const SLOW_LOAD_MS = 10000;

/**
 * Gym-specific loading screen. Uses same sky gradient + starfield as gym content and dashboard
 * so the background is consistent. Shows "Taking a while?" hint after 10s if still loading.
 */
export default function GymLoadingScreen() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/vi") ? "vi" : "en";
  const t = getMessages(locale as "en" | "vi").loading;
  const [skyBg, setSkyBg] = useState(() => getSkyTheme(getLocalTimeHours()).bgGradient);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const update = () => setSkyBg(getSkyTheme(getLocalTimeHours()).bgGradient);
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSlowHint(true), SLOW_LOAD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      id="loading-screen"
      className="loading-screen"
      aria-hidden
      style={{ background: "transparent" }}
    >
      {/* Same layers as GymWorld: sky + starfield */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: skyBg, zIndex: 0 }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1, width: "100%", height: "100%", minWidth: "100vw", minHeight: "100dvh" }}
        aria-hidden
      >
        <HeroStarfield heroTransitioning={false} />
      </div>
      <div className="relative z-10">
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
          {showSlowHint && (
            <p className="mt-4 text-sm text-white/60 max-w-[280px] text-center">
              {locale === "vi"
                ? "Đang tải lâu? Thử tải lại trang hoặc kiểm tra kết nối mạng."
                : "Taking a while? Try refreshing the page or check your connection."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
