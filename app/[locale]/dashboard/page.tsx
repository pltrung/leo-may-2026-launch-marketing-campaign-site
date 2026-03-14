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
import ProfileModal from "@/components/dashboard/ProfileModal";
import PackageDetailModal, { type Plan } from "@/components/dashboard/PackageDetailModal";
import PaymentModal from "@/components/dashboard/PaymentModal";
import EventDetailModal, { type DashboardEvent } from "@/components/dashboard/EventDetailModal";
import WaiverModal from "@/components/dashboard/WaiverModal";

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

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

const DASHBOARD_EVENTS: DashboardEvent[] = [
  {
    id: "route-setting-july",
    title: "Route Setting Night",
    titleVi: "Đêm thay tuyến",
    date: "2026-07-12",
    time: "18:00",
    description: "Join us for a special evening where our setters refresh the walls. Members can try new problems as they go up.",
    descriptionVi: "Tham gia buổi tối đặc biệt khi đội setter thay đổi các tuyến leo. Thành viên có thể thử các bài leo mới ngay khi chúng được đặt lên.",
    type: "route_setting",
  },
  {
    id: "womens-july",
    title: "Women's Climbing Session",
    titleVi: "Buổi leo dành cho nữ",
    date: "2026-07-16",
    time: "16:00",
    description: "A supportive session for women climbers of all levels. Connect, learn, and climb together.",
    descriptionVi: "Buổi leo dành cho nữ với mọi trình độ. Kết nối, học hỏi và leo cùng nhau.",
    type: "womens",
  },
  {
    id: "competition-july",
    title: "Competition Night",
    titleVi: "Đêm thi đấu",
    date: "2026-07-30",
    time: "19:00",
    description: "Friendly in-house competition. Test your skills, meet other climbers, and win bragging rights.",
    descriptionVi: "Cuộc thi đấu thân thiện nội bộ. Thử thách bản thân, gặp gỡ cộng đồng leo và giành chiến thắng.",
    type: "competition",
  },
];

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
  const visitPassBarMaxRef = useRef<number>(0);
  const [gymOccupancy, setGymOccupancy] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    top: { rank: number; full_name: string; instagram_handle?: string | null; profile_photo_url?: string | null; visits: number }[];
    currentUser: { rank: number | null; visits: number; full_name: string };
  } | null>(null);
  const [leaderboardGender, setLeaderboardGender] = useState<"all" | "male" | "female">("all");
  const [passFilter, setPassFilter] = useState<"all" | "day" | "visit">("all");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<{ id: string; plan_name: string; amount: number; created_at: string }[]>([]);
  const [packageDetailPlan, setPackageDetailPlan] = useState<Plan | null>(null);
  const [packageDetailOpen, setPackageDetailOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState<string | null>(null);
  const [renewQrUrl, setRenewQrUrl] = useState<string | null>(null);
  const [renewPlanName, setRenewPlanName] = useState("");
  const [renewPrice, setRenewPrice] = useState(0);
  const [renewCurrentExpiry, setRenewCurrentExpiry] = useState<string | null>(null);
  const [renewNewExpiry, setRenewNewExpiry] = useState<string | null>(null);
  const [renewVisitsAdded, setRenewVisitsAdded] = useState<number | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  // Use consistent night gradient so EN and VN dashboard backgrounds always match
  const skyBg = "linear-gradient(180deg, #0B0B0F 0%, #0d0d14 40%, #12121a 100%)";
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalEvent, setEventModalEvent] = useState<DashboardEvent | null>(null);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep member-only gate. No redirect to /waiver; show Sign Waiver section + modal instead.
  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace(`/${locale}/gym`);
    }
  }, [mounted, loading, user, locale, router]);

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
    const genderParam = leaderboardGender === "all" ? "" : `?gender=${leaderboardGender}`;
    (async () => {
      try {
        const res = await fetch(`/api/member/leaderboard${genderParam}`, {
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
  }, [accessToken, leaderboardGender]);

  // Fetch plans
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  // Fetch payment history
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/member/payments", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .catch(() => setPayments([]));
  }, [accessToken, paymentSuccess]);

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

  const handleBuyPass = useCallback(
    (plan: Plan) => {
      if (!accessToken) return;
      setRenewPlanId(plan.id);
      setRenewPlanName(plan.name);
      setRenewPrice(plan.price_vnd);
      setRenewQrUrl(null);
      setRenewCurrentExpiry(null);
      setRenewNewExpiry(null);
      setRenewError(null);
      fetch(`/api/member/vietqr?plan_id=${plan.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.url) {
            setRenewQrUrl(d.url);
            setRenewPlanName(d.plan_name ?? plan.name);
            setRenewPrice(d.price_vnd ?? plan.price_vnd);
            setRenewCurrentExpiry(d.current_expiry ?? null);
            setRenewNewExpiry(d.new_expiry ?? null);
            setRenewVisitsAdded(d.visits_added ?? null);
            setRenewError(null);
            setIsVietQrModalOpen(true);
          } else {
            setRenewError(d.error ?? (locale === "vi" ? "Không thể tải QR." : "Failed to load QR."));
            setIsVietQrModalOpen(true);
          }
        })
        .catch(() => {
          setRenewError(locale === "vi" ? "Đã xảy ra lỗi." : "Something went wrong.");
          setIsVietQrModalOpen(true);
        });
    },
    [accessToken, locale]
  );

  const handlePayWithVnpay = useCallback(async () => {
    if (!accessToken || !renewPlanId) return;
    setVnpayLoading(true);
    try {
      const returnUrl =
        typeof window !== "undefined"
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
    } catch {
      /* ignore */
    }
    setVnpayLoading(false);
  }, [accessToken, renewPlanId, locale]);

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
        // Full page navigation to avoid auth/session race during SPA transition
        window.location.href = `/${target}/dashboard`;
      }
    } catch {
      // ignore
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 relative overflow-hidden">
        <div className="fixed inset-0" style={{ background: skyBg, zIndex: 1 }} aria-hidden />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden>
          <HeroStarfield heroTransitioning={false} />
        </div>
        <p className="relative z-10 text-white/90 text-center text-[15px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Setting up your profile…
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="relative z-10 px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Retry
        </button>
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

  const totalVisits = member.total_visits ?? 0;
  const sessionsThisMonth = totalVisits === 0 ? 0 : Math.max(1, Math.min(totalVisits, 12));

  const rawStatus = (member.membership_status as string | undefined) ?? "inactive";
  const visitsRemaining = member.visits_remaining ?? 0;
  if (visitsRemaining > 0 && visitsRemaining > visitPassBarMaxRef.current) {
    visitPassBarMaxRef.current = visitsRemaining;
  }
  const visitBarDenom = Math.max(visitPassBarMaxRef.current, 1);

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
  const hasValidDayPass = rawStatus === "active" && daysRemaining != null && daysRemaining > 0;
  const hasValidVisitPass = visitsRemaining > 0;
  const canCheckIn = hasValidDayPass || hasValidVisitPass;
  const canShowQR = member.waiver_signed && canCheckIn && !!member.profile_photo_url;
  const checkInStepsCompleted =
    (member.waiver_signed ? 1 : 0) + (canCheckIn ? 1 : 0) + (!!member.profile_photo_url ? 1 : 0);

  const statusLabel = isVi
    ? rawStatus === "frozen"
      ? "Tạm đóng băng"
      : rawStatus === "cancelled"
      ? "Đã hủy"
      : !canCheckIn
      ? "Chưa kích hoạt"
      : "Đang hoạt động"
    : rawStatus === "frozen"
    ? "Frozen"
    : rawStatus === "cancelled"
    ? "Cancelled"
    : !canCheckIn
    ? "Inactive"
    : "Active";

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
          {/* GREETING + PROFILE */}
          <section>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-3 w-full text-left transition-opacity hover:opacity-90"
            >
              {member.profile_photo_url ? (
                <img
                  src={member.profile_photo_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-lg font-semibold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1
                  className="text-[22px] font-semibold text-white tracking-tight"
                  style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
                >
                  {greeting}
                </h1>
                <p className="text-[13px] text-white/60 mt-0.5">
                  {isVi ? "Chạm để xem / cập nhật hồ sơ" : "Tap to view / update profile"}
                  {member.waiver_signed && member.waiver_signed_at && (
                    <span className="block mt-1 text-white/50 text-[12px]">
                      {isVi ? "Đã ký waiver • " : "Waiver signed • "}
                      {new Date(member.waiver_signed_at).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </button>
          </section>

          {/* CHECK-IN REQUIREMENTS NOTICE - show above waiver when any step is missing */}
          {!canShowQR && (
            <section>
              <div className="w-full rounded-[20px] px-6 py-4 text-[15px] transition-transform duration-200" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-amber-200 font-medium">
                    {checkInStepsCompleted}/3 {isVi ? "hoàn thành" : "complete"}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(checkInStepsCompleted / 3) * 100}%`,
                        background: accentColor,
                      }}
                    />
                  </div>
                </div>
                <p className="text-amber-200/95 text-[14px]">
                  {!member.waiver_signed
                    ? (isVi ? "1. Ký giấy từ chối trách nhiệm trước khi check-in." : "1. Sign the waiver first before checking in.")
                    : !canCheckIn
                    ? (isVi ? "2. Mua Day Pass hoặc gói thành viên bên dưới để check-in." : "2. Purchase a Day Pass or membership below to check in.")
                    : !member.profile_photo_url
                    ? (isVi ? "3. Thêm ảnh hồ sơ trước khi check-in. Nhấn tên của bạn ở trên để mở hồ sơ." : "3. Add a profile photo before check-in. Tap your name above to open profile.")
                    : null}
                </p>
              </div>
            </section>
          )}

          {/* SIGN WAIVER - when not yet signed */}
          {member && !member.waiver_signed && (
            <section>
              <div
                className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5"
                style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
              >
                <h2 className="text-[22px] font-semibold text-white/90 mb-2">
                  {isVi ? "Giấy từ chối trách nhiệm" : "Safety Waiver"}
                </h2>
                <p className="text-[15px] text-white/70 mb-4">
                  {isVi ? "Vui lòng đọc và ký giấy từ chối trách nhiệm trước khi sử dụng phòng gym." : "Please read and sign the safety waiver before using the gym."}
                </p>
                <button
                  type="button"
                  onClick={() => setWaiverModalOpen(true)}
                  className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium hover:opacity-90 transition-opacity"
                >
                  {isVi ? "Mở giấy từ chối" : "Open Waiver"}
                </button>
              </div>
            </section>
          )}

          {/* CHECK IN */}
          <section>
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
                onClick={() => {
                  if (!member.waiver_signed) setWaiverModalOpen(true);
                  else if (canCheckIn && !member.profile_photo_url) setProfileModalOpen(true);
                  else if (canShowQR) setIsQrModalOpen(true);
                }}
                className="relative rounded-[20px] p-6 md:p-8 flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.98] hover:-translate-y-1 disabled:cursor-default disabled:hover:translate-y-0 disabled:opacity-70"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}
                disabled={member.waiver_signed && !canCheckIn}
              >
                <div className="flex items-center justify-center min-h-[260px] min-w-[260px]">
                  {canShowQR && mounted ? (
                    <QRCodeSVG
                      value={qrPayload}
                      size={260}
                      level="M"
                      bgColor="transparent"
                      fgColor="#ffffff"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-white/50 text-center px-4">
                      {!member.waiver_signed ? (
                        <>
                          <span className="text-4xl">📝</span>
                          <p className="text-[15px] font-medium">{isVi ? "Ký giấy từ chối trách nhiệm để hiện mã QR" : "Sign the waiver to show your check-in QR code"}</p>
                        </>
                      ) : !canCheckIn ? (
                        <>
                          <span className="text-4xl">🎫</span>
                          <p className="text-[15px] font-medium">{isVi ? "Mua pass để có mã QR" : "Buy a pass for your check-in QR code"}</p>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl">📷</span>
                          <p className="text-[15px] font-medium">{isVi ? "Thêm ảnh hồ sơ để có mã QR" : "Add a profile photo for your check-in QR code"}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-4 text-[13px] text-white/70">
                  {canShowQR
                    ? (isVi ? "Chạm để phóng to khi quét" : "Tap to enlarge for scanning")
                    : !member.waiver_signed
                    ? (isVi ? "Chạm để mở giấy từ chối" : "Tap to open waiver")
                    : !canCheckIn
                    ? (isVi ? "Mua Day Pass hoặc Visit Pass bên dưới" : "Purchase a pass below")
                    : (isVi ? "Chạm để thêm ảnh hồ sơ" : "Tap to add profile photo")}
                </p>
              </button>

              <div className="mt-4 w-full flex items-center justify-between text-[13px] text-white/60">
                <span>{isVi ? "Lần check-in gần nhất" : "Last check-in"}</span>
                <span className="text-white/90">{lastCheckIn}</span>
              </div>
            </div>
          </section>

          {/* GYM STATUS */}
          <section>
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                {isVi ? "TÌNH TRẠNG PHÒNG GYM" : "GYM STATUS"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{gymStatusEmoji}</span>
                <div>
                  <p className="text-[18px] font-medium text-white">{gymStatusLabel}</p>
                  <p className="text-[15px] text-white/65">{gymStatusDetail}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-white/50">
                {isVi ? "Số người đã check-in trong 2 giờ gần nhất." : "Members who checked in within the last 2 hours."}
              </p>
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
                  <span
                    className="font-medium"
                    style={{
                      color:
                        !canCheckIn
                          ? "rgba(255,255,255,0.6)"
                          : rawStatus === "frozen"
                          ? "#f59e0b"
                          : rawStatus === "cancelled"
                          ? "#ef4444"
                          : "#22c55e",
                    }}
                  >
                    {statusLabel}
                  </span>
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
                  <span className="text-white/60">{(member.visits_remaining ?? 0) > 0 ? (isVi ? "Lượt còn lại" : "Visits remaining") : (isVi ? "Còn lại" : "Days remaining")}</span>
                  <span className="font-medium" style={{ color: (daysRemaining != null && daysRemaining > 0) || (member.visits_remaining ?? 0) > 0 ? accentColor : "rgba(255,255,255,0.9)" }}>
                    {(member.visits_remaining ?? 0) > 0
                      ? (isVi ? `${member.visits_remaining} lượt` : `${member.visits_remaining} visits`)
                      : daysRemaining != null && daysRemaining > 0
                        ? (isVi ? `${daysRemaining} ngày` : `${daysRemaining} days`)
                        : isVi ? "Không có" : "None"}
                  </span>
                </div>
                {((daysRemaining != null && daysRemaining > 0) || (member.visits_remaining ?? 0) > 0) && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: (member.visits_remaining ?? 0) > 0
                          ? `${Math.min(100, ((member.visits_remaining ?? 0) / visitBarDenom) * 100)}%`
                          : `${Math.min(100, ((daysRemaining ?? 0) / 30) * 100)}%`,
                        background: accentColor,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-[13px] text-white/70 space-y-1">
                {canCheckIn && (
                  <div className="flex items-center justify-between">
                    <span>{isVi ? "Tham gia từ" : "Member since"}</span>
                    <span className="text-white/90">{memberSince}</span>
                  </div>
                )}
                {hasValidDayPass && (
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-medium text-white/90">
                    {isVi ? "Thanh toán / gia hạn" : "Pay / Renew"}
                  </h3>
                  <div className="flex gap-1">
                    {(["all", "day", "visit"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPassFilter(f)}
                        className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-all ${
                          passFilter === f
                            ? "bg-white text-slate-900"
                            : "bg-white/10 text-white/80 hover:bg-white/15"
                        }`}
                      >
                        {f === "all" ? (isVi ? "Tất cả" : "All") : f === "day" ? (isVi ? "Thời gian" : "Day") : (isVi ? "Lượt" : "Visit")}
                      </button>
                    ))}
                  </div>
                </div>
                {(() => {
                  const hasBoughtNewbie = payments.some((pmt) => pmt.plan_name === "Newbie Class");
                  const visitsRem = member?.visits_remaining ?? 0;
                  const hasActiveVisitPass = visitsRem > 0;
                  const hasActiveDayPass = hasValidDayPass;
                  const filtered = plans.filter((p) => {
                    if (p.id === "newbie_class" && hasBoughtNewbie) return false;
                    const pt = (p as Plan & { pass_type?: string }).pass_type;
                    const isDayPlan = pt === "day" || p.id === "newbie_class";
                    const isVisitPlan = pt === "visit";
                    if (hasActiveVisitPass && isDayPlan) return false; // cannot buy day passes with active visit pass
                    if (hasActiveDayPass && !hasActiveVisitPass && isVisitPlan) return false; // cannot buy visit pass when active on day pass
                    if (passFilter === "day") return isDayPlan;
                    if (passFilter === "visit") return isVisitPlan;
                    return true;
                  });
                  return (
                <div
                  data-passes-carousel
                  className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 mb-4 scroll-smooth snap-x snap-mandatory touch-pan-x"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                >
                  {filtered.map((p) => {
                    const isNewbieClass = p.id === "newbie_class";
                    const hasBoughtNewbieClass = payments.some((pmt) => pmt.plan_name === "Newbie Class");
                    const showNewbieAura = isNewbieClass && !hasBoughtNewbieClass;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPackageDetailPlan(p);
                          setPackageDetailOpen(true);
                        }}
                        className="relative flex-shrink-0 w-[140px] text-left rounded-[18px] p-4 transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] snap-start overflow-hidden"
                        style={{
                          background: showNewbieAura ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
                          border: showNewbieAura ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.1)",
                          boxShadow: showNewbieAura ? "0 0 24px rgba(16,185,129,0.25)" : "0 4px 16px rgba(0,0,0,0.2)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {showNewbieAura && (
                          <div
                            className="absolute inset-0 pointer-events-none opacity-40"
                            style={{
                              background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(16,185,129,0.3) 0%, transparent 70%)",
                            }}
                            aria-hidden
                          />
                        )}
                        <div className="relative">
                          <p className="text-[15px] font-semibold text-white/95 line-clamp-2">{p.name}</p>
                          <p className="text-emerald-300/90 text-sm mt-2">
                            {p.price_vnd.toLocaleString("vi-VN")} VND
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                  );
                })()}
                <style>{`[data-passes-carousel]::-webkit-scrollbar { display: none; }`}</style>
                {payments.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.08]">
                    <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                      {isVi ? "Lịch sử thanh toán" : "Payment history"}
                    </p>
                    <ul className="space-y-1.5">
                      {payments.slice(0, 5).map((p) => (
                        <li key={p.id} className="flex justify-between items-center text-sm">
                          <span className="text-white/80">
                            {new Date(p.created_at).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            {p.plan_name}
                          </span>
                          <span className="text-white/90 font-medium">
                            {p.amount.toLocaleString("vi-VN")} VND
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CLIMBING ACTIVITY — Monthly streak + reward progress */}
          <section>
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <h2 className="text-[22px] font-semibold text-white/90 mb-4">
                {isVi ? "HOẠT ĐỘNG LEO" : "CLIMBING ACTIVITY"}
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-[16px] p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-[13px] text-white/60 mb-1">{isVi ? "Lượt tháng này" : "Visits this month"}</p>
                  <p className="text-2xl font-bold" style={{ color: sessionsThisMonth > 0 ? accentColor : "rgba(255,255,255,0.9)" }}>
                    {sessionsThisMonth}
                  </p>
                </div>
                <div className="rounded-[16px] p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-[13px] text-white/60 mb-1">{isVi ? "Chuỗi tháng" : "Monthly streak"}</p>
                  <p className="text-2xl font-bold text-white/90">
                    {sessionsThisMonth > 0 ? `🔥 1` : "—"}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] text-white/70 mb-2">
                  <span>{isVi ? "Tiến độ phần thưởng" : "Reward progress"}</span>
                  <span>{sessionsThisMonth} / 8 {isVi ? "lượt" : "visits"}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (sessionsThisMonth / 8) * 100)}%`, background: "linear-gradient(90deg, #7DD3FC, #22c55e)" }}
                  />
                </div>
                <p className="text-[12px] text-white/50 mt-1.5">
                  {sessionsThisMonth >= 8 ? (isVi ? "Đã đạt mốc!" : "Milestone reached!") : (isVi ? `${8 - sessionsThisMonth} lượt nữa để nhận phần thưởng` : `${8 - sessionsThisMonth} more visits to next reward`)}
                </p>
              </div>
            </div>
          </section>

          {/* EVENTS — Featured card + carousel */}
          <section
            className="rounded-[18px] p-6 transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              background: glassCard,
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)",
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
            }}
          >
            <h2 className="text-[22px] font-semibold text-white/90 mb-4">
              {isVi ? "SỰ KIỆN SẮP TỚI" : "UPCOMING EVENTS"}
            </h2>

            {/* Featured event (next upcoming) */}
            {DASHBOARD_EVENTS.length > 0 && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const upcoming = DASHBOARD_EVENTS.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
              const feat = upcoming[0] ?? DASHBOARD_EVENTS[0];
              const title = isVi && feat.titleVi ? feat.titleVi : feat.title;
              const days = daysUntil(feat.date);
              const countdownText = days <= 0 ? (isVi ? "Hôm nay" : "Today") : days === 1 ? (isVi ? "Ngày mai" : "Tomorrow") : isVi ? `${days} ngày nữa` : `${days} days away`;
              const dateStr = new Date(feat.date).toLocaleDateString(isVi ? "vi-VN" : "en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <button
                  type="button"
                  onClick={() => { setEventModalEvent(feat); setEventModalOpen(true); }}
                  className="w-full text-left rounded-[18px] p-5 mb-4 transition-all duration-200 hover:-translate-y-1 active:scale-[0.99]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(16,185,129,0.35)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[20px] font-semibold text-white">{title}</p>
                      <p className="text-[14px] text-white/70 mt-1">{dateStr} · {feat.time}</p>
                      <p className="text-[13px] text-emerald-300/90 mt-2">{countdownText}</p>
                      {feat.description && (
                        <p className="text-[13px] text-white/60 mt-2 line-clamp-2">{isVi && feat.descriptionVi ? feat.descriptionVi : feat.description}</p>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-emerald-400 shrink-0">
                      {isVi ? "Xem chi tiết" : "View Details"}
                    </span>
                  </div>
                </button>
              );
            })()}

            {/* Carousel */}
            <div className="relative -mx-1">
              <div
                data-events-carousel
                className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth snap-x snap-mandatory touch-pan-x"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
              >
                {(DASHBOARD_EVENTS.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).length > 0
                  ? DASHBOARD_EVENTS.filter((e) => e.date >= new Date().toISOString().slice(0, 10))
                  : DASHBOARD_EVENTS
                ).map((ev) => {
                  const title = isVi && ev.titleVi ? ev.titleVi : ev.title;
                  const dateStr = new Date(ev.date).toLocaleDateString(isVi ? "vi-VN" : "en-US", { day: "numeric", month: "short" });
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => { setEventModalEvent(ev); setEventModalOpen(true); }}
                      className="flex-shrink-0 w-[140px] rounded-[18px] p-4 transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] snap-start"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                      }}
                    >
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium text-emerald-300/90" style={{ background: "rgba(16,185,129,0.15)" }}>
                        {dateStr}
                      </span>
                      <p className="text-[15px] font-semibold text-white/95 mt-2 line-clamp-2">{title}</p>
                      <div className="mt-3 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400/80" style={{ background: "rgba(16,185,129,0.1)" }}>
                        {ev.type === "route_setting" && <span className="text-lg">🧗</span>}
                        {ev.type === "womens" && <span className="text-lg">♀</span>}
                        {ev.type === "competition" && <span className="text-lg">🏆</span>}
                        {ev.type === "workshop" && <span className="text-lg">📋</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <style>{`[data-events-carousel]::-webkit-scrollbar { display: none; }`}</style>
            </div>
          </section>

          {/* COMMUNITY LEADERBOARD */}
          <section>
            <div className="rounded-[20px] p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ background: glassCard, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-[22px] font-semibold text-white/90">
                  {isVi ? "BẢNG XẾP HẠNG CỘNG ĐỒNG" : "COMMUNITY LEADERBOARD"}
                </h2>
                <div className="flex gap-2">
                  {(["all", "male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setLeaderboardGender(g)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                        leaderboardGender === g
                          ? "bg-white text-slate-900"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {g === "all" ? (isVi ? "Tất cả" : "All") : g === "male" ? (isVi ? "Nam" : "Male") : (isVi ? "Nữ" : "Female")}
                    </button>
                  ))}
                </div>
              </div>
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
                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {leaderboard.top.map((entry) => {
                      const instaUrl = entry.instagram_handle
                        ? `https://www.instagram.com/${entry.instagram_handle.replace(/^@/, "")}/`
                        : null;
                      return (
                        <div
                          key={entry.rank}
                          className="flex items-center justify-between rounded-[16px] px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xl shrink-0">
                              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[18px] font-medium">{entry.full_name}</p>
                                {instaUrl && (
                                  <a
                                    href={instaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center text-white/90 hover:text-white transition-colors shrink-0"
                                    aria-label="Instagram"
                                  >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                              <p className="text-[13px] text-white/60">
                                {entry.visits} {isVi ? "lượt trong tháng này" : entry.visits === 1 ? "visit this month" : "visits this month"}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {entry.profile_photo_url ? (
                              <img
                                src={entry.profile_photo_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-base font-semibold border border-white/20">
                                {entry.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {leaderboard.currentUser && (
                    <div className="mt-2 pt-2 border-t border-white/[0.08] text-[13px] text-white/70">
                      <p>
                        {isVi ? "Vị trí của bạn: " : "Your rank: "}
                        {leaderboard.currentUser.rank != null
                          ? `#${leaderboard.currentUser.rank}`
                          : isVi
                          ? "ngoài top 20"
                          : "outside top 20"}
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

      {/* PROFILE MODAL */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        member={{
          full_name: member.full_name,
          email: member.email,
          phone: member.phone,
          profile_photo_url: member.profile_photo_url,
          id_number: member.id_number,
          date_of_birth: member.date_of_birth,
          instagram_handle: member.instagram_handle,
          gender: member.gender,
        }}
        accessToken={accessToken}
        onSaved={refresh}
        isVi={isVi}
      />

      <PackageDetailModal
        open={packageDetailOpen}
        onClose={() => { setPackageDetailOpen(false); setPackageDetailPlan(null); }}
        plan={packageDetailPlan}
        onBuyPass={() => packageDetailPlan && handleBuyPass(packageDetailPlan)}
        isVi={isVi}
        hasActivePass={canCheckIn}
        currentExpiry={member?.membership_expires_at ?? null}
      />
      <EventDetailModal
        open={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setEventModalEvent(null); }}
        event={eventModalEvent}
        isVi={isVi}
        accessToken={accessToken}
      />
      <WaiverModal
        open={waiverModalOpen}
        onClose={() => setWaiverModalOpen(false)}
        onSuccess={() => refresh()}
        locale={locale as "en" | "vi"}
        defaultFullName={member?.full_name?.trim() ?? ""}
      />
      <PaymentModal
        open={isVietQrModalOpen}
        onClose={() => { setIsVietQrModalOpen(false); setRenewQrUrl(null); setRenewError(null); }}
        planName={renewPlanName}
        priceVnd={renewPrice}
        qrUrl={renewQrUrl}
        currentExpiry={renewCurrentExpiry}
        newExpiry={renewNewExpiry}
        visitsAdded={renewVisitsAdded}
        error={renewError}
        onPayWithVnpay={handlePayWithVnpay}
        vnpayLoading={vnpayLoading}
        isVi={isVi}
      />

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

