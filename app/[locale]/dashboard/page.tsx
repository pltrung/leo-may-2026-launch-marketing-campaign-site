"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { useLocale } from "@/components/LocaleProvider";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";

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
  const { user, member, loading, accessToken, signOut } = useMemberAuth();

  const [mounted, setMounted] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
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
    ? expiry.toLocaleDateString(isVi ? "vi-VN" : "en-US", { month: "short", year: "numeric" })
    : isVi
    ? "Chưa thiết lập"
    : "Not set";
  const daysRemaining =
    expiry && expiry.getTime() > Date.now()
      ? Math.ceil((expiry.getTime() - Date.now()) / 86400000)
      : null;
  const isActive = rawStatus === "active" && daysRemaining != null && daysRemaining > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0B0B0F 0%, #12121a 40%, #1a1a2e 100%)",
      }}
    >
      {/* HEADER */}
      <header className="w-full sticky top-0 z-20 backdrop-blur-md bg-black/15 border-b border-white/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 md:h-11">
              <Logo className="h-full w-auto object-contain" />
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
      <main className="flex-1 flex flex-col items-center px-4 pb-10 pt-6 md:pt-10">
        <div className="w-full max-w-3xl space-y-12">
          {/* TOP LOGO */}
          <section className="flex justify-center">
            <div className="w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,260px)]">
              <Logo className="w-full h-auto object-contain" />
            </div>
          </section>
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
          <section>
            <div className="rounded-3xl bg-black/35 border border-white/12 shadow-[0_22px_70px_rgba(0,0,0,0.65)] px-6 py-7 md:px-7 md:py-8 flex flex-col items-center">
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
          </section>

          {/* MEMBERSHIP + PAYMENT + FREEZE */}
          <section>
            <div className="rounded-3xl bg-white/9 border border-white/16 shadow-[0_18px_60px_rgba(0,0,0,0.45)] p-5 md:p-6 backdrop-blur-md">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-4">
                {isVi ? "THẺ THÀNH VIÊN" : "MEMBERSHIP"}
              </h2>
              <div className="space-y-3 text-sm">
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
                  <span className="text-white font-medium">
                    {daysRemaining != null && daysRemaining > 0 ? (isVi ? `${daysRemaining} ngày` : `${daysRemaining} days`) : isVi ? "Không có" : "None"}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span>{isVi ? "Tham gia từ" : "Member since"}</span>
                  <span className="text-white/90">{memberSince}</span>
                </div>
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
                <p className="text-[11px] text-white/65 font-mono break-all pt-1">
                  {isVi ? "ID nội bộ:" : "Internal ID:"} {member.id}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                  {isVi ? "Thanh toán / gia hạn" : "Pay / Renew"}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_month"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_month`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "explorer_month" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "until_end_of_year" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Until end of year
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("day_pass"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=day_pass`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "day_pass" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Day Pass — 300,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_month"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_month`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "explorer_month" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Explorer Monthly — 900,000 VND
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!accessToken) return; setRenewPlanId("explorer_year"); setRenewQrUrl(null); fetch(`/api/member/vietqr?plan_id=explorer_year`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((d) => { setRenewQrUrl(d.url ?? null); setRenewPlanName(d.plan_name ?? ""); setRenewPrice(d.price_vnd ?? 0); }).catch(() => setRenewQrUrl(null)); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${renewPlanId === "explorer_year" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
                      >
                        Explorer Yearly — 9,000,000 VND
                      </button>
                    </>
                  )}
                </div>
                {renewQrUrl && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-white/70">{renewPlanName} — {renewPrice.toLocaleString("vi-VN")} VND</p>
                    <div className="flex justify-center">
                      <img src={renewQrUrl} alt="VietQR" className="w-40 h-40 object-contain bg-white rounded-xl p-2" />
                    </div>
                    <p className="text-[11px] text-white/60">
                      {isVi ? "Quét mã bằng ứng dụng ngân hàng, MoMo hoặc ZaloPay. Thanh toán xong, mang biên lai cho quầy lễ tân." : "Scan with banking app, MoMo, or ZaloPay. Show receipt to front desk after payment."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* GYM STATUS + ACTIVITY */}
          <section className="grid md:grid-cols-2 gap-8">
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
                  ? "Số người đã check-in trong 2 giờ gần nhất."
                  : "Members who checked in within the last 2 hours."}
              </p>
              <div className="mt-4 pt-3 border-t border-white/12">
                <p className="text-xs font-semibold text-white/80 mb-2">
                  {isVi ? "Hoạt động gần đây" : "Recent activity"}
                </p>
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
                <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                  <span>{isVi ? "Buổi trong tháng này" : "Sessions this month"}</span>
                  <span className="text-white font-medium">
                    {sessionsThisMonth}
                  </span>
                </div>
              </div>
            </div>

            {/* CLOUD ASCENSION (placeholder, only if >= 5 check-ins) */}
            {totalVisits >= 5 && (
              <div className="rounded-3xl bg-black/26 border border-white/14 p-5 md:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
                <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-3">
                  {isVi ? "CLOUD ASCENSION" : "CLOUD ASCENSION"}
                </h2>
                <p className="text-xs text-white/70 mb-3">
                  {isVi
                    ? "Khu vực gamification sẽ xuất hiện ở đây để phản ánh hành trình leo núi của bạn."
                    : "A future gamification area will appear here to reflect your climbing journey."}
                </p>
                <p className="text-xs text-white/60">
                  {isVi
                    ? `Bạn đã có ${totalVisits} lượt check-in. Sau khi hệ thống hoàn thiện, cấp bậc và phần thưởng sẽ được hiển thị tại đây.`
                    : `You have ${totalVisits} check-ins so far. Once finalized, levels and rewards will be displayed here.`}
                </p>
              </div>
            )}
          </section>

          {/* COMMUNITY LEADERBOARD */}
          <section>
            <div className="rounded-3xl bg-black/26 border border-white/14 p-5 md:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
              <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-3">
                {isVi ? "BẢNG XẾP HẠNG CỘNG ĐỒNG" : "COMMUNITY LEADERBOARD"}
              </h2>
              {!leaderboard && (
                <p className="text-xs text-white/60">{isVi ? "Đang tải…" : "Loading…"}</p>
              )}
              {leaderboard && leaderboard.top.length === 0 && (
                <p className="text-xs text-white/70">
                  {isVi ? "Chưa có dữ liệu cho tháng này." : "No leaderboard data for this month yet."}
                </p>
              )}
              {leaderboard && leaderboard.top.length > 0 && (
                <div className="space-y-3 text-xs text-white">
                  <div className="space-y-1">
                    {leaderboard.top.slice(0, 3).map((entry) => (
                      <div
                        key={entry.rank}
                        className="flex items-center justify-between rounded-2xl bg-white/6 border border-white/20 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{entry.full_name}</p>
                            <p className="text-[11px] text-white/60">
                              {entry.visits} {isVi ? "lượt trong tháng này" : entry.visits === 1 ? "visit this month" : "visits this month"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {leaderboard.currentUser && (
                    <div className="mt-2 pt-2 border-t border-white/15 text-[11px] text-white/70">
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
          <div className="text-[10px] text-white/50">
            © Leo Mây {new Date().getFullYear()}
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

