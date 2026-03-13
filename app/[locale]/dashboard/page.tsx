"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { useLocale } from "@/components/LocaleProvider";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

export default function DashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, member, loading, signOut } = useMemberAuth();

  const [mounted, setMounted] = useState(false);
  const [skyBg, setSkyBg] = useState<string>(() => getSkyTheme(getLocalTimeHours()).bgGradient);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const wakeLockRef = useRef<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep member-only gate exactly as before.
  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace(`/${locale}/gym`);
      return;
    }
    if (member && !member.waiver_signed) {
      router.replace(`/${locale}/waiver`);
    }
  }, [mounted, loading, user, member, locale, router]);

  // Dynamic sky background similar to countdown / gym.
  useEffect(() => {
    const update = () => setSkyBg(getSkyTheme(getLocalTimeHours()).bgGradient);
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen QR: keep screen awake while open.
  useEffect(() => {
    if (!isQrModalOpen) {
      try {
        if (wakeLockRef.current && typeof wakeLockRef.current.release === "function") {
          wakeLockRef.current.release().catch(() => {});
        }
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
      return;
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const nav: any = navigator;
    if (nav.wakeLock && typeof nav.wakeLock.request === "function") {
      nav.wakeLock
        .request("screen")
        .then((sentinel: any) => {
          wakeLockRef.current = sentinel;
          if (sentinel && typeof sentinel.addEventListener === "function") {
            sentinel.addEventListener("release", () => {
              wakeLockRef.current = null;
            });
          }
        })
        .catch(() => {
          wakeLockRef.current = null;
        });
    }

    return () => {
      try {
        if (wakeLockRef.current && typeof wakeLockRef.current.release === "function") {
          wakeLockRef.current.release().catch(() => {});
        }
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    };
  }, [isQrModalOpen]);

  const handleLogout = async () => {
    await signOut();
    router.replace(`/${locale}/gym`);
  };

  const handleLanguageChange = (target: "en" | "vi") => {
    if (target === locale) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("leo_language", target);
      }
    } catch {
      // ignore
    }
    router.replace(`/${target}/dashboard`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: HERO_BG }}>
        <p className="text-white/80 text-center">Setting up your profile…</p>
      </div>
    );
  }

  const isVi = locale === "vi";
  const displayName = member.full_name?.trim() || (isVi ? "bạn" : "Member");
  const greeting = isVi ? `Chào lại, ${displayName}` : `Welcome back, ${displayName}`;

  const qrPayload = `leo-member:${member.id}`;

  const memberSince = member.created_at
    ? new Date(member.created_at).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const lastCheckIn = member.last_check_in
    ? new Date(member.last_check_in).toLocaleString(isVi ? "vi-VN" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : isVi
    ? "Chưa có lượt check-in"
    : "No check-ins yet";

  const shortId = `LM-${String(member.id).slice(0, 4).toUpperCase()}`;

  // Simple time-based occupancy example.
  const hour = getLocalTimeHours();
  let gymStatusEmoji = "🟢";
  let gymStatusLabel = isVi ? "Vắng" : "Light";
  let gymStatusDetail = isVi ? "Khoảng 12 người đang leo" : "12 climbers inside";
  if (hour >= 12 && hour < 18) {
    gymStatusEmoji = "🟡";
    gymStatusLabel = isVi ? "Vừa phải" : "Moderate";
    gymStatusDetail = isVi ? "Khoảng 35 người đang leo" : "35 climbers inside";
  } else if (hour >= 18 && hour <= 22) {
    gymStatusEmoji = "🔴";
    gymStatusLabel = isVi ? "Đông" : "Busy";
    gymStatusDetail = isVi ? "Khoảng 58 người đang leo" : "58 climbers inside";
  }

  // Fake recent visits based on last_check_in or today.
  const recentVisits: string[] = [];
  const baseDate = member.last_check_in ? new Date(member.last_check_in) : new Date();
  for (let i = 0; i < 4; i += 1) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i * 2);
    recentVisits.push(
      d.toLocaleDateString(isVi ? "vi-VN" : "en-US", {
        month: "short",
        day: "numeric",
      })
    );
  }

  const totalVisits = member.total_visits ?? 0;
  const sessionsThisMonth =
    totalVisits === 0
      ? 0
      : Math.max(1, Math.min(totalVisits, 12));

  // Optional: days until a fixed "March 2026" date to keep the design feeling alive.
  const expiryDate = new Date("2026-03-31T23:59:59+07:00");
  const today = new Date();
  const diffMs = expiryDate.getTime() - today.getTime();
  const daysRemaining = diffMs > 0 ? Math.ceil(diffMs / 86400000) : 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: skyBg,
      }}
    >
      {/* HEADER */}
      <header className="w-full sticky top-0 z-20 backdrop-blur-md bg-black/15 border-b border-white/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/gym`} className="md:hidden text-white/70 text-xs hover:text-white">
              ← {isVi ? "Gym" : "Gym"}
            </Link>
            <div className="w-[120px] md:w-[160px]">
              <Logo className="w-full h-auto object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs md:text-sm rounded-full bg-white/10 px-2 py-1 border border-white/20">
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`px-2 py-0.5 rounded-full ${
                  isVi ? "bg-white text-[#0B0B0F]" : "text-white/70 hover:text-white"
                }`}
              >
                VN
              </button>
              <span className="text-white/40">|</span>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`px-2 py-0.5 rounded-full ${
                  !isVi ? "bg-white text-[#0B0B0F]" : "text-white/70 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-white/80 text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/10"
            >
              {isVi ? "Đăng xuất" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center px-4 pb-8 pt-6 md:pt-8">
        <div className="w-full max-w-3xl space-y-6 md:space-y-8">
          {/* GREETING */}
          <section>
            <h1
              className="text-2xl md:text-3xl font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
            >
              {greeting}
            </h1>
          </section>

          {/* CHECK IN */}
          <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-6 md:gap-8 items-start">
            <div className="rounded-3xl bg-black/35 border border-white/12 shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-5 md:p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase">
                  CHECK IN
                </h2>
                <span className="text-[11px] text-white/50">
                  {isVi ? "Cho quầy lễ tân" : "For front desk"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="relative rounded-3xl bg-black/40 border border-white/15 p-4 md:p-5 flex flex-col items-center justify-center shadow-[0_14px_45px_rgba(0,0,0,0.7)] hover:bg-black/35 transition-colors"
              >
                <div className="flex items-center justify-center">
                  {mounted && (
                    <QRCodeSVG
                      value={qrPayload}
                      size={240}
                      level="M"
                      bgColor="transparent"
                      fgColor="#ffffff"
                    />
                  )}
                </div>
                <p className="mt-3 text-[11px] text-white/70">
                  {isVi ? "Chạm để phóng to khi quét" : "Tap to enlarge for scanning"}
                </p>
              </button>

              <div className="mt-4 w-full flex items-center justify-between text-xs text-white/60">
                <span>{isVi ? "Lần check-in gần nhất" : "Last check-in"}</span>
                <span className="text-white/85">{lastCheckIn}</span>
              </div>
            </div>

            {/* MEMBERSHIP CARD */}
            <div className="rounded-3xl bg-white/9 border border-white/16 shadow-[0_18px_60px_rgba(0,0,0,0.45)] p-5 md:p-6 backdrop-blur-md">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-4">
                {isVi ? "THẺ THÀNH VIÊN" : "MEMBERSHIP"}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Hạng thành viên" : "Member Tier"}</span>
                  <span className="text-white font-medium">
                    {member.tier || (isVi ? "Thành viên sáng lập" : "Founder Member")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Có hiệu lực đến" : "Valid Until"}</span>
                  <span className="text-white font-medium">
                    {isVi ? "Tháng 3 2026" : "March 2026"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Mã thành viên" : "Member ID"}</span>
                  <span className="text-white font-medium">{shortId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">
                    {isVi ? "Còn lại" : "Days remaining"}
                  </span>
                  <span className="text-white font-medium">
                    {daysRemaining > 0
                      ? isVi
                        ? `${daysRemaining} ngày`
                        : `${daysRemaining} days`
                      : isVi
                      ? "Đã hết hạn (demo)"
                      : "Expired (demo)"}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
                <span>{isVi ? "Tham gia từ" : "Member since"}</span>
                <span className="text-white/85">{memberSince}</span>
              </div>
            </div>
          </section>

          {/* GYM STATUS */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-black/30 border border-white/14 p-5 md:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-3">
                {isVi ? "TÌNH TRẠNG PHÒNG GYM" : "GYM STATUS"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xl">{gymStatusEmoji}</span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {gymStatusLabel}
                  </p>
                  <p className="text-xs text-white/65">{gymStatusDetail}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-white/50">
                {isVi
                  ? "Ước lượng dựa trên khung giờ — số liệu trực tiếp sẽ sớm có."
                  : "Estimate based on time of day — live occupancy coming soon."}
              </p>
            </div>

            {/* ACTIVITY */}
            <div className="rounded-3xl bg-black/26 border border-white/14 p-5 md:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-3">
                {isVi ? "HOẠT ĐỘNG CỦA BẠN" : "YOUR ACTIVITY"}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-white/75">
                {recentVisits.map((d) => (
                  <span
                    key={d}
                    className="px-3 py-1 rounded-full bg-white/8 border border-white/15"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                <span>{isVi ? "Buổi trong tháng này" : "Sessions this month"}</span>
                <span className="text-white font-medium">
                  {sessionsThisMonth}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-white/50">
                {isVi
                  ? "Số liệu chỉ mang tính minh hoạ trong giai đoạn thử nghiệm."
                  : "Numbers are illustrative while we finalize tracking."}
              </p>
            </div>
          </section>

          {/* EVENTS */}
          <section className="rounded-3xl bg-black/26 border border-white/14 p-5 md:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase">
                {isVi ? "SỰ KIỆN SẮP TỚI" : "UPCOMING EVENTS"}
              </h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: isVi ? "Đêm thay tuyến" : "Route Setting Night",
                  date: isVi ? "12 Tháng 7" : "July 12",
                },
                {
                  title: isVi ? "Buổi leo dành cho nữ" : "Women's Climbing Session",
                  date: isVi ? "16 Tháng 7" : "July 16",
                },
                {
                  title: isVi ? "Đêm thi đấu" : "Competition Night",
                  date: isVi ? "30 Tháng 7" : "July 30",
                },
              ].map((event) => (
                <div
                  key={event.title}
                  className="flex items-center justify-between rounded-2xl bg-white/6 border border-white/14 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {event.title}
                    </p>
                    <p className="text-xs text-white/65">{event.date}</p>
                  </div>
                  <span className="text-[11px] text-white/55">
                    {isVi ? "Chi tiết sớm có" : "Details soon"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              Instagram
            </a>
            <Link href={`mailto:hello@leomay.vn`} className="hover:text-white">
              {isVi ? "Liên hệ" : "Contact"}
            </Link>
            <Link href={`/${locale}/rules`} className="hover:text-white">
              {isVi ? "Nội quy" : "Rules"}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50">
              {isVi ? "Ngôn ngữ" : "Language"}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 border border-white/20">
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`px-2 py-0.5 rounded-full ${
                  isVi ? "bg-white text-[#0B0B0F]" : "text-white/70 hover:text-white"
                }`}
              >
                VN
              </button>
              <span className="text-white/40">|</span>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`px-2 py-0.5 rounded-full ${
                  !isVi ? "bg-white text-[#0B0B0F]" : "text-white/70 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* QR FULLSCREEN MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20"
              aria-label={isVi ? "Đóng" : "Close"}
            >
              <span className="text-lg">&times;</span>
            </button>
          </div>

          <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6">
            <div className="w-[180px] mb-6">
              <Logo className="w-full h-auto object-contain" />
            </div>
            <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-2">
              CHECK IN
            </h2>
            <div className="rounded-3xl bg-black border border-white/20 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.9)]">
              {mounted && (
                <QRCodeSVG
                  value={qrPayload}
                  size={320}
                  level="M"
                  bgColor="transparent"
                  fgColor="#ffffff"
                />
              )}
            </div>
            <p className="mt-4 text-xs text-white/80 text-center">
              {isVi
                ? "Đưa mã này cho quầy lễ tân để check-in."
                : "Show this code to the front desk to check in."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

