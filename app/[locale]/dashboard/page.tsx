"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { useLocale } from "@/components/LocaleProvider";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { HERO_BG } from "@/lib/heroConstants";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

function safeDate(d: string | null | undefined, locale: "vi-VN" | "en-US", opts?: Intl.DateTimeFormatOptions): string {
  if (!d || typeof d !== "string") return "—";
  const p = new Date(d);
  if (Number.isNaN(p.getTime())) return "—";
  return p.toLocaleDateString(locale, opts ?? { month: "short", year: "numeric" });
}
function safeDateTime(d: string | null | undefined, locale: "vi-VN" | "en-US"): string {
  if (!d || typeof d !== "string") return "—";
  const p = new Date(d);
  if (Number.isNaN(p.getTime())) return "—";
  return p.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

export default function DashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, member, loading, accessToken, signOut, refresh } = useMemberAuth();

  const [mounted, setMounted] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const wakeLockRef = useRef<any | null>(null);
  const [gymOccupancy, setGymOccupancy] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    top: { rank: number; full_name: string; visits: number }[];
    currentUser: { rank: number | null; visits: number; full_name: string };
  } | null>(null);
  const [renewPlanId, setRenewPlanId] = useState<string | null>(null);
  const [renewQrUrl, setRenewQrUrl] = useState<string | null>(null);
  const [renewPlanName, setRenewPlanName] = useState("");
  const [renewPrice, setRenewPrice] = useState(0);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [skyBg, setSkyBg] = useState<string>(() => getSkyTheme(getLocalTimeHours()).bgGradient);

  useEffect(() => {
    const update = () => setSkyBg(getSkyTheme(getLocalTimeHours()).bgGradient);
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

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

  // Clean VNPay return params from URL when returning from VNPay
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const vnp = u.searchParams.get("vnp_ResponseCode");
    if (vnp == null) return;
    u.searchParams.forEach((_, k) => {
      if (k.startsWith("vnp_")) u.searchParams.delete(k);
    });
    const clean = u.pathname + (u.search || "");
    if (clean !== window.location.pathname + window.location.search) {
      router.replace(clean, { scroll: false });
    }
  }, [router]);

  // Fetch occupancy (no auth required)
  useEffect(() => {
    let cancelled = false;
    const f = async () => {
      try {
        const res = await fetch("/api/admin/occupancy");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === "number") setGymOccupancy(data.count);
      } catch {
        /* ignore */
      }
    };
    f();
    const id = setInterval(f, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Fetch leaderboard via API (no client Supabase)
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/member/leaderboard", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled || !data) return;
        if (data.top && Array.isArray(data.top) && data.currentUser) {
          setLeaderboard({ top: data.top, currentUser: data.currentUser });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  // Subscribe to payments realtime for this member
  useEffect(() => {
    if (!member?.id) return;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel("payments-for-member")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          setPaymentSuccess(true);
          refresh();
          setTimeout(() => setPaymentSuccess(false), 8000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [member?.id, refresh]);

  const handleFreeze = useCallback(async () => {
    if (!accessToken) return;
    setFreezeLoading(true);
    try {
      const res = await fetch("/api/member/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "freeze" }),
      });
      if (!res.ok) throw new Error("Failed");
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setFreezeLoading(false);
    }
  }, [accessToken]);

  const handleUnfreeze = useCallback(async () => {
    if (!accessToken) return;
    setFreezeLoading(true);
    try {
      const res = await fetch("/api/member/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "unfreeze" }),
      });
      if (!res.ok) throw new Error("Failed");
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setFreezeLoading(false);
    }
  }, [accessToken]);

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
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.href = `/${locale}/gym`;
    } else {
      router.replace(`/${locale}/gym`);
    }
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

  const glassCard = "rgba(0,0,0,0.4)";
  const accentColor = "#7DD3FC";

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0" style={{ background: skyBg, zIndex: 1 }} aria-hidden />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden>
          <HeroStarfield heroTransitioning={false} />
        </div>
        <p className="relative z-10 text-white/80 text-[15px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Loading…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed inset-0" style={{ background: skyBg, zIndex: 1 }} aria-hidden />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden>
          <HeroStarfield heroTransitioning={false} />
        </div>
        <p className="relative z-10 text-white/90 text-center text-[15px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Setting up your profile…</p>
      </div>
    );
  }

  const isVi = locale === "vi";
  const displayName = member.full_name?.trim() || (isVi ? "bạn" : "Member");
  const greeting = isVi ? `Chào lại, ${displayName}` : `Welcome back, ${displayName}`;

  const qrPayload = `leo-member:${member.id}`;

  const memberSince = safeDate(member.created_at, isVi ? "vi-VN" : "en-US");
  const lastCheckIn = member.last_checkin
    ? safeDateTime(member.last_checkin, isVi ? "vi-VN" : "en-US")
    : isVi
    ? "Chưa có lượt check-in"
    : "No check-ins yet";

  const shortId = member.member_code ?? `LM-${String(member.id).slice(0, 4).toUpperCase()}`;

  // Real occupancy from API
  let gymStatusEmoji = "🟢";
  let gymStatusLabel = isVi ? "Vắng" : "Light";
  let gymStatusDetail =
    gymOccupancy != null
      ? `${gymOccupancy} ${isVi ? "người đang leo" : "climbers inside"}`
      : isVi
      ? "Đang tải dữ liệu phòng gym…"
      : "Loading gym status…";
  if (gymOccupancy != null) {
    if (gymOccupancy >= 25 && gymOccupancy < 50) {
      gymStatusEmoji = "🟡";
      gymStatusLabel = isVi ? "Vừa phải" : "Moderate";
    } else if (gymOccupancy >= 50) {
      gymStatusEmoji = "🔴";
      gymStatusLabel = isVi ? "Đông" : "Busy";
    }
  }

  const baseDate =
    member.last_checkin && typeof member.last_checkin === "string"
      ? (() => {
          const p = new Date(member.last_checkin);
          return Number.isNaN(p.getTime()) ? new Date() : p;
        })()
      : new Date();
  const recentVisits: string[] = [];
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
  const sessionsThisMonth = totalVisits === 0 ? 0 : Math.max(1, Math.min(totalVisits, 12));

  const rawStatus = (member.membership_status as string | undefined) ?? "active";
  const statusLabel = isVi
    ? rawStatus === "frozen"
      ? "Tạm đóng băng"
      : rawStatus === "cancelled"
      ? "Đã hủy"
      : "Đang hoạt động"
    : rawStatus === "frozen"
    ? "Frozen"
    : rawStatus === "cancelled"
    ? "Cancelled"
    : "Active";

  let expiry: Date | null = null;
  if (member.membership_expires_at && typeof member.membership_expires_at === "string") {
    const p = new Date(member.membership_expires_at);
    expiry = Number.isNaN(p.getTime()) ? null : p;
  }
  const validUntilLabel = expiry
    ? expiry.toLocaleDateString(isVi ? "vi-VN" : "en-US", { day: "numeric", month: "short", year: "numeric" })
    : isVi
    ? "Chưa thiết lập"
    : "Not set";
  const daysRemaining =
    expiry && expiry.getTime() > Date.now()
      ? Math.ceil((expiry.getTime() - Date.now()) / 86400000)
      : null;
  const isActive = rawStatus === "active" && daysRemaining != null && daysRemaining > 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* 1) Sky gradient — bottom layer (time-of-day) */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: skyBg, zIndex: 1 }} aria-hidden />
      {/* 2) Starfield (twinkle, drift, shooting stars) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 2, width: "100%", height: "100%", minWidth: "100vw", minHeight: "100dvh" }}
        aria-hidden
      >
        <HeroStarfield heroTransitioning={false} />
      </div>
      {/* 3) Content scrim — darkens lower area so cards stay readable on bright sky (day/sunset) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%)",
        }}
        aria-hidden
      />
      {/* HEADER */}
      <header className="w-full sticky top-0 z-20 backdrop-blur-xl border-b border-white/[0.12]" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="max-w-[720px] mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 md:h-11">
              <Logo className="h-full w-auto object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[13px] rounded-full px-2 py-1 transition-transform duration-150" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`px-3 py-1 rounded-full transition-transform duration-150 active:scale-95 ${
                  isVi ? "bg-white text-[#0B0F14]" : "text-white/70 hover:text-white"
                }`}
              >
                VN
              </button>
              <span className="text-white/40">|</span>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`px-3 py-1 rounded-full transition-transform duration-150 active:scale-95 ${
                  !isVi ? "bg-white text-[#0B0F14]" : "text-white/70 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-white/80 text-[13px] px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-transform duration-150 active:scale-95"
            >
              {isVi ? "Đăng xuất" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center px-4 pb-10 pt-6 md:pt-10 relative" style={{ zIndex: 10 }}>
        {paymentSuccess && (
          <div className="w-full max-w-[720px] mb-6 rounded-[20px] px-6 py-4 flex flex-col gap-1 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            <p className="text-[18px] font-medium text-emerald-200">
              {isVi ? "Thanh toán thành công" : "Payment Successful"}
            </p>
            <p className="text-[15px] text-emerald-100/90">
              {isVi ? "Thẻ thành viên đã được gia hạn" : "Membership Extended"}
            </p>
          </div>
        )}
        <div className="w-full max-w-[720px] flex flex-col gap-12">
          {/* TOP LOGO */}
          <section className="flex justify-center">
            <div className="w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,260px)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              <Logo className="w-full h-auto object-contain" />
            </div>
          </section>
          {/* GREETING */}
          <section>
            <h1
              className="text-[22px] font-semibold text-white tracking-tight"
              style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
            >
              {greeting}
            </h1>
          </section>

          {/* CHECK IN */}
          <section>
            {!isActive && (
              <div className="w-full mb-4 rounded-[20px] px-6 py-4 text-[15px] text-amber-200 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                {isVi
                  ? "Mua Day Pass hoặc gói thành viên bên dưới để check-in."
                  : "Purchase a Day Pass or membership below to check in."}
              </div>
            )}
            <div className="relative rounded-[20px] p-6 flex flex-col items-center transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              {/* Radial glow behind QR card */}
              <div className="absolute inset-0 rounded-[20px] pointer-events-none opacity-60" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(125,211,252,0.08) 0%, transparent 70%)" }} aria-hidden />
              <div className="relative w-full flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-semibold text-white/90 tracking-wide">
                  CHECK IN
                </h2>
                <span className="text-[13px] text-white/50">
                  {isVi ? "Cho quầy lễ tân" : "For front desk"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="relative rounded-[20px] p-6 md:p-8 flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.98] hover:-translate-y-1"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}
              >
                <div className="flex items-center justify-center">
                  {mounted && (
                    <QRCodeSVG
                      value={qrPayload}
                      size={260}
                      level="M"
                      bgColor="transparent"
                      fgColor="#ffffff"
                    />
                  )}
                </div>
                <p className="mt-4 text-[13px] text-white/70">
                  {isVi ? "Chạm để phóng to khi quét" : "Tap to enlarge for scanning"}
                </p>
              </button>

              <div className="mt-4 w-full flex items-center justify-between text-[13px] text-white/60">
                <span>{isVi ? "Lần check-in gần nhất" : "Last check-in"}</span>
                <span className="text-white/90">{lastCheckIn}</span>
              </div>
            </div>
          </section>

          {/* MEMBERSHIP + PAYMENT + FREEZE */}
          <section>
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                {isVi ? "THẺ THÀNH VIÊN" : "MEMBERSHIP"}
              </h2>
              <div className="space-y-3 text-[15px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Hạng thành viên" : "Member Tier"}</span>
                  <span className="text-white font-medium">
                    {member.tier?.trim() || (isVi ? "Thành viên sáng lập" : "Founder Member")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Trạng thái" : "Status"}</span>
                  <span className="text-white font-medium">{statusLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Có hiệu lực đến" : "Valid Until"}</span>
                  <span className="text-white font-medium">{validUntilLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Mã thành viên" : "Member ID"}</span>
                  <span className="text-white font-medium">{shortId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{isVi ? "Còn lại" : "Days remaining"}</span>
                  <span className="font-medium" style={{ color: daysRemaining != null && daysRemaining > 0 ? accentColor : "rgba(255,255,255,0.9)" }}>
                    {daysRemaining != null && daysRemaining > 0 ? (isVi ? `${daysRemaining} ngày` : `${daysRemaining} days`) : isVi ? "Không có" : "None"}
                  </span>
                </div>
                {daysRemaining != null && daysRemaining > 0 && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (daysRemaining / 30) * 100)}%`, background: accentColor }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-[13px] text-white/70 space-y-1">
                {isActive && (
                  <div className="flex items-center justify-between">
                    <span>{isVi ? "Tham gia từ" : "Member since"}</span>
                    <span className="text-white/90">{memberSince}</span>
                  </div>
                )}
                {rawStatus === "active" && isActive && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleFreeze}
                      disabled={freezeLoading}
                      className="text-amber-300/90 hover:text-amber-300 text-[11px] underline disabled:opacity-60"
                    >
                      {freezeLoading ? (isVi ? "Đang xử lý…" : "Processing…") : isVi ? "Tạm đóng băng thẻ" : "Freeze membership"}
                    </button>
                  </div>
                )}
                {rawStatus === "frozen" && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleUnfreeze}
                      disabled={freezeLoading}
                      className="text-emerald-300/90 hover:text-emerald-300 text-[11px] underline disabled:opacity-60"
                    >
                      {freezeLoading ? (isVi ? "Đang xử lý…" : "Processing…") : isVi ? "Mở thẻ trở lại" : "Unfreeze membership"}
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-white/65 font-mono break-all pt-1">
                  {isVi ? "ID nội bộ:" : "Internal ID:"} {member.id}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08]">
                <h3 className="text-[18px] font-medium text-white/90 mb-4">
                  {isVi ? "Thanh toán / gia hạn" : "Pay / Renew"}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_month"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_month`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-transform duration-150 active:scale-95 ${renewPlanId === "explorer_month" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Extend Monthly — 900,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_year"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_year`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "explorer_year" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Extend Yearly — 9,000,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("until_end_of_year"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=until_end_of_year`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-transform duration-150 active:scale-95 ${renewPlanId === "until_end_of_year" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Until end of year
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("day_pass"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=day_pass`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-transform duration-150 active:scale-95 ${renewPlanId === "day_pass" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Day Pass — 300,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_month"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_month`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-transform duration-150 active:scale-95 ${renewPlanId === "explorer_month" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Explorer Monthly — 900,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_year"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_year`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-transform duration-150 active:scale-95 ${renewPlanId === "explorer_year" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Explorer Yearly — 9,000,000 VND
                      </button>
                    </>
                  )}
                </div>
                {renewQrUrl && (
                  <div className="space-y-4 pt-2">
                    <p className="text-[15px] text-white/80">{renewPlanName} — {renewPrice.toLocaleString("vi-VN")} VND</p>
                    <div className="relative rounded-[20px] p-6 flex flex-col items-center transition-transform duration-200 hover:-translate-y-0.5" style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.7)", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                      <div className="absolute inset-0 rounded-[20px] pointer-events-none opacity-50" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(125,211,252,0.06) 0%, transparent 70%)" }} aria-hidden />
                      <button
                        type="button"
                        onClick={() => setIsVietQrModalOpen(true)}
                        className="relative flex justify-center w-full rounded-[16px] p-4 transition-all duration-200 active:scale-[0.98] hover:opacity-90"
                      >
                        <img src={renewQrUrl} alt="VietQR" className="w-48 h-48 object-contain bg-white rounded-xl p-3" />
                      </button>
                    </div>
                    <p className="text-[13px] text-white/60">
                      {isVi ? "Chạm mã để phóng to. Quét bằng ứng dụng ngân hàng, MoMo hoặc ZaloPay." : "Tap to enlarge. Scan with banking app, MoMo, or ZaloPay."}
                    </p>
                    <button
                      type="button"
                      disabled={vnpayLoading || !renewPlanId}
                      className="w-full mt-2 py-3 rounded-[16px] text-[15px] font-medium text-white hover:bg-white/20 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      onClick={async () => {
                        if (!accessToken || !renewPlanId) return;
                        setVnpayLoading(true);
                        try {
                          const returnUrl = typeof window !== "undefined"
                            ? `${window.location.origin}/${locale}/dashboard`
                            : undefined;
                          const qs = new URLSearchParams({ plan_id: renewPlanId });
                          if (returnUrl) qs.set("return_url", returnUrl);
                          const r = await fetch(`/api/member/vnpay?${qs}`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                          });
                          const d = await r.json();
                          if (r.ok && d?.url) {
                            window.location.href = d.url;
                            return;
                          }
                          setVnpayLoading(false);
                        } catch {
                          setVnpayLoading(false);
                        }
                      }}
                    >
                      {vnpayLoading ? (isVi ? "Đang chuyển hướng..." : "Redirecting...") : (isVi ? "Thanh toán qua VNPay" : "Pay with VNPay")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* GYM STATUS + ACTIVITY */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                {isVi ? "TÌNH TRẠNG PHÒNG GYM" : "GYM STATUS"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{gymStatusEmoji}</span>
                <div>
                  <p className="text-[18px] font-medium text-white">
                    {gymStatusLabel}
                  </p>
                  <p className="text-[15px] text-white/65">{gymStatusDetail}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-white/50">
                {isVi
                  ? "Số người đã check-in trong 2 giờ gần nhất."
                  : "Members who checked in within the last 2 hours."}
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <p className="text-[15px] font-medium text-white/90 mb-2">
                  {isVi ? "Hoạt động gần đây" : "Recent activity"}
                </p>
                <div className="flex flex-wrap gap-2 text-[13px] text-white/75">
                  {recentVisits.map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 rounded-full bg-white/8 border border-white/15"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[13px] text-white/70">
                  <span>{isVi ? "Buổi trong tháng này" : "Sessions this month"}</span>
                  <span className="font-medium" style={{ color: sessionsThisMonth > 0 ? accentColor : "rgba(255,255,255,0.9)" }}>
                    {sessionsThisMonth}
                  </span>
                </div>
              </div>
            </div>

            {/* CLOUD ASCENSION (placeholder, only if >= 5 check-ins) */}
            {totalVisits >= 5 && (
              <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                  {isVi ? "CLOUD ASCENSION" : "CLOUD ASCENSION"}
                </h2>
                <p className="text-[15px] text-white/70 mb-3">
                  {isVi
                    ? "Khu vực gamification sẽ xuất hiện ở đây để phản ánh hành trình leo núi của bạn."
                    : "A future gamification area will appear here to reflect your climbing journey."}
                </p>
                <p className="text-[13px] text-white/60">
                  {isVi
                    ? `Bạn đã có ${totalVisits} lượt check-in. Sau khi hệ thống hoàn thiện, cấp bậc và phần thưởng sẽ được hiển thị tại đây.`
                    : `You have ${totalVisits} check-ins so far. Once finalized, levels and rewards will be displayed here.`}
                </p>
              </div>
            )}
          </section>

          {/* COMMUNITY LEADERBOARD */}
          <section>
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                {isVi ? "BẢNG XẾP HẠNG CỘNG ĐỒNG" : "COMMUNITY LEADERBOARD"}
              </h2>
              {!leaderboard && (
                <p className="text-[15px] text-white/60">{isVi ? "Đang tải…" : "Loading…"}</p>
              )}
              {leaderboard && leaderboard.top.length === 0 && (
                <p className="text-[15px] text-white/70">
                  {isVi ? "Chưa có dữ liệu cho tháng này." : "No leaderboard data for this month yet."}
                </p>
              )}
              {leaderboard && leaderboard.top.length > 0 && (
                <div className="space-y-3 text-[15px] text-white">
                  <div className="space-y-2">
                    {leaderboard.top.slice(0, 3).map((entry) => (
                      <div
                        key={entry.rank}
                        className="flex items-center justify-between rounded-[16px] px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                          </span>
                          <div>
                            <p className="text-[18px] font-medium">{entry.full_name}</p>
                            <p className="text-[13px] text-white/60">
                              {entry.visits} {isVi ? "lượt trong tháng này" : entry.visits === 1 ? "visit this month" : "visits this month"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {leaderboard.currentUser && (
                    <div className="mt-2 pt-2 border-t border-white/[0.08] text-[13px] text-white/70">
                      <p>
                        {isVi ? "Vị trí của bạn: " : "Your rank: "}
                        {leaderboard.currentUser.rank != null
                          ? `#${leaderboard.currentUser.rank}`
                          : isVi
                          ? "ngoài top 5"
                          : "outside top 5"}
                      </p>
                      <p>
                        {isVi ? "Lượt trong tháng này: " : "Visits this month: "}
                        {leaderboard.currentUser.visits}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* EVENTS */}
          <section className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[22px] font-semibold text-white/90">
                {isVi ? "SỰ KIỆN SẮP TỚI" : "UPCOMING EVENTS"}
              </h2>
            </div>
            <div className="space-y-2">
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
                  className="flex items-center justify-between rounded-[16px] px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                >
                  <div>
                    <p className="text-[18px] font-medium text-white">
                      {event.title}
                    </p>
                    <p className="text-[13px] text-white/65">{event.date}</p>
                  </div>
                  <span className="text-[13px] text-white/55">
                    {isVi ? "Chi tiết sớm có" : "Details soon"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-white/[0.12] backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="max-w-[720px] mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-[13px] text-white/70">
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
          <div className="text-[10px] text-white/50">
            © Leo Mây {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* VIETQR PAYMENT FULLSCREEN MODAL */}
      {isVietQrModalOpen && renewQrUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setIsVietQrModalOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20"
              aria-label={isVi ? "Đóng" : "Close"}
            >
              <span className="text-lg">&times;</span>
            </button>
          </div>
          <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6">
            <div className="w-[180px] mb-4">
              <Logo className="w-full h-auto object-contain" />
            </div>
            <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-2">
              {isVi ? "THANH TOÁN" : "PAYMENT"}
            </h2>
            <p className="text-xs text-white/70 mb-4">{renewPlanName} — {renewPrice.toLocaleString("vi-VN")} VND</p>
            <div className="rounded-2xl bg-white p-4">
              <img src={renewQrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
            </div>
            <p className="mt-4 text-xs text-white/80 text-center">
              {isVi ? "Quét bằng ứng dụng ngân hàng, MoMo hoặc ZaloPay." : "Scan with banking app, MoMo, or ZaloPay."}
            </p>
          </div>
        </div>
      )}

      {/* QR FULLSCREEN MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-xl">
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

