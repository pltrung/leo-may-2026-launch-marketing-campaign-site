"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type MembershipType = "Founder Member" | "Standard" | "Day Pass";

interface AdminMember {
  id: string; // internal UUID from member_profiles
  displayId: string | null; // e.g. LM-0234
  name: string;
  email?: string | null;
  phone?: string | null;
  membershipType: MembershipType | string;
  status: "Active" | "Inactive" | "Frozen" | "Cancelled";
  validUntil: string;
  checkinsThisMonth: number;
  totalVisits: number;
  recentCheckins: { label: string }[];
}

interface NameSearchResult {
  id: string;
  displayId: string | null;
  name: string;
  membershipType: string;
}

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"id" | "name" | "qr">("id");
  const [foundMember, setFoundMember] = useState<AdminMember | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<null | "checkin" | "manual" | "undo" | "extend" | "freeze" | "cancel" | "upgrade" | "payment" | "confirm">(null);
  const [plans, setPlans] = useState<{ id: string; name: string; duration_days: number; price_vnd: number }[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPlanId, setPaymentPlanId] = useState<string>("explorer_month");
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentPlanName, setPaymentPlanName] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [recentPayments, setRecentPayments] = useState<{ id: string; plan_name: string; amount: number; created_at: string }[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberType, setNewMemberType] = useState<MembershipType>("Founder Member");
  const [gymOccupancy, setGymOccupancy] = useState(0);
  const [nameResults, setNameResults] = useState<NameSearchResult[]>([]);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const lastPaymentCountRef = React.useRef<number | null>(null);

  // Fetch plans
  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, []);

  const loadMemberById = useCallback(async (id: string) => {
    setSearchError(null);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/members?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.member) {
        setSearchError(data.error || "Member not found.");
        return;
      }
      setFoundMember(data.member as AdminMember);
      setNameResults([]);
    } catch {
      setSearchError("Unable to load member.");
    }
  }, []);

  // Fetch and poll recent payments when member found; detect new payment for auto webhook
  useEffect(() => {
    if (!foundMember?.id) {
      setRecentPayments([]);
      lastPaymentCountRef.current = null;
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/payments?member_id=${encodeURIComponent(foundMember.id)}`);
        const data = await res.json();
        const payments = (data.payments ?? []) as { id: string; plan_name: string; amount: number; created_at: string }[];
        const prevCount = lastPaymentCountRef.current;
        setRecentPayments(payments);
        if (prevCount !== null && payments.length > prevCount) {
          setPaymentReceived(true);
          loadMemberById(foundMember.id);
          setTimeout(() => setPaymentReceived(false), 8000);
        }
        lastPaymentCountRef.current = payments.length;
      } catch {
        /* ignore */
      }
    };

    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [foundMember?.id, loadMemberById]);

  // Poll real-time-ish occupancy from backend.
  useEffect(() => {
    let cancelled = false;

    const fetchOccupancy = async () => {
      try {
        const res = await fetch("/api/admin/occupancy");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === "number") {
          setGymOccupancy(data.count);
        }
      } catch {
        // ignore
      }
    };

    fetchOccupancy();
    const id = setInterval(fetchOccupancy, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleSearch = useCallback(async () => {
    setSearchError(null);
    setActionMessage(null);
    setActionError(null);
    setFoundMember(null);
    setNameResults([]);

    const raw = searchQuery.trim();
    if (!raw) {
      setSearchError("Enter a Member ID, name, or scan QR.");
      return;
    }

    let params = new URLSearchParams();

    if (searchMode === "qr" || raw.startsWith("leo-member:")) {
      const payload = raw.startsWith("leo-member:") ? raw : raw;
      const parts = payload.split(":");
      const memberId = parts.length === 2 ? parts[1] : "";
      if (!memberId) {
        setSearchError("Could not read QR payload.");
        return;
      }
      params.set("id", memberId);
    } else if (searchMode === "name") {
      params.set("name", raw);
    } else {
      // Member ID mode: assume LM-XXXX code
      params.set("code", raw);
    }

    try {
      const res = await fetch(`/api/admin/members?${params.toString()}`);
      const data = await res.json();
      if (searchMode === "name") {
        const results = (data.members as NameSearchResult[] | undefined) ?? [];
        if (!res.ok) {
          setSearchError(data.error || "Unable to search members.");
          return;
        }
        if (results.length === 0) {
          setSearchError("No members found with that name.");
          return;
        }
        setNameResults(results);
        setSearchError(null);
      } else {
        if (!res.ok || !data.member) {
          setSearchError(data.error || "Member not found.");
          return;
        }
        setFoundMember(data.member as AdminMember);
      }
    } catch {
      setSearchError("Unable to search members right now.");
    }
  }, [searchMode, searchQuery]);

  const handleScanQr = useCallback(() => {
    setSearchMode("qr");
    setSearchError(null);
    setActionMessage("Scanner ready — focus the search field and scan the member QR.");
  }, []);

  const canCheckIn = useMemo(
    () => !!foundMember && foundMember.status === "Active",
    [foundMember]
  );

  const handleCheckIn = useCallback(async () => {
    if (!foundMember) return;
    setActionLoading("checkin");
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, location: "front_desk" }),
      });
      if (!res.ok) {
        throw new Error("Failed to record check-in");
      }
      setFoundMember((prev) =>
        prev
          ? {
              ...prev,
              checkinsThisMonth: prev.checkinsThisMonth + 1,
              totalVisits: prev.totalVisits + 1,
              recentCheckins: [
                { label: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) },
                ...prev.recentCheckins,
              ].slice(0, 5),
            }
          : prev
      );
      setActionMessage("Check-in recorded.");
    } catch (e) {
      setActionError("Unable to record check-in. Please verify member ID and try again.");
    } finally {
      setActionLoading(null);
    }
  }, [foundMember]);

  const handleManualCheckIn = useCallback(async () => {
    if (!foundMember) return;
    setActionLoading("manual");
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, location: "front_desk_manual" }),
      });
      if (!res.ok) {
        throw new Error("Failed to record manual check-in");
      }
      setFoundMember((prev) =>
        prev
          ? {
              ...prev,
              checkinsThisMonth: prev.checkinsThisMonth + 1,
              totalVisits: prev.totalVisits + 1,
            }
          : prev
      );
      setActionMessage("Manual check-in recorded.");
    } catch {
      setActionError("Unable to record manual check-in.");
    } finally {
      setActionLoading(null);
    }
  }, [foundMember]);

  const handleUndoCheckIn = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("undo");
    setActionError(null);
    setActionMessage(null);
    setFoundMember((prev) =>
      prev
        ? {
            ...prev,
            checkinsThisMonth: Math.max(0, prev.checkinsThisMonth - 1),
            totalVisits: Math.max(0, prev.totalVisits - 1),
          }
        : prev
    );
    setGymOccupancy((n) => Math.max(0, n - 1));
    setActionLoading(null);
    setActionMessage("Last check-in adjusted locally.");
  }, [foundMember]);

  const updateStatus = useCallback(
    (status: AdminMember["status"], message: string) => {
      if (!foundMember) return;
      setFoundMember({ ...foundMember, status });
      setActionMessage(message);
    },
    [foundMember]
  );

  const handleExtend = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("extend");
    setActionError(null);
    setActionMessage(null);
    fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: foundMember.id, action: "extend" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.member) throw new Error(data.error || "Failed");
        setFoundMember((prev) =>
          prev
            ? {
                ...prev,
                validUntil: data.member.validUntil ?? prev.validUntil,
                status: data.member.status ?? prev.status,
              }
            : prev
        );
        setActionMessage("Membership extended by 1 month.");
      })
      .catch(() => {
        setActionError("Unable to extend membership.");
      })
      .finally(() => setActionLoading(null));
  }, [foundMember]);

  const handleFreeze = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("freeze");
    setActionError(null);
    setActionMessage(null);
    fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: foundMember.id, action: "freeze" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.member) throw new Error(data.error || "Failed");
        updateStatus("Frozen", "Membership frozen.");
      })
      .catch(() => {
        setActionError("Unable to freeze membership.");
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, updateStatus]);

  const handleCancel = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("cancel");
    setActionError(null);
    setActionMessage(null);
    fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: foundMember.id, action: "cancel" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.member) throw new Error(data.error || "Failed");
        updateStatus("Cancelled", "Membership cancelled.");
      })
      .catch(() => {
        setActionError("Unable to cancel membership.");
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, updateStatus]);

    const handleCollectPayment = useCallback(() => {
    if (!foundMember) return;
    setPaymentModalOpen(true);
    setPaymentPlanId("explorer_month");
    setPaymentQrUrl(null);
    setPaymentPlanName("");
    setPaymentPrice(0);
    fetch(`/api/admin/vietqr?plan_id=explorer_month&member_id=${encodeURIComponent(foundMember.id)}`)
      .then((r) => r.json())
      .then((d) => {
        setPaymentQrUrl(d.url ?? null);
        setPaymentPlanName(d.plan_name ?? "");
        setPaymentPrice(d.price_vnd ?? 0);
      })
      .catch(() => setPaymentQrUrl(null));
  }, [foundMember]);

  const handlePaymentPlanChange = useCallback(
    (planId: string) => {
      if (!foundMember) return;
      setPaymentPlanId(planId);
      setPaymentQrUrl(null);
      fetch(`/api/admin/vietqr?plan_id=${encodeURIComponent(planId)}&member_id=${encodeURIComponent(foundMember.id)}`)
        .then((r) => r.json())
        .then((d) => {
          setPaymentQrUrl(d.url ?? null);
          setPaymentPlanName(d.plan_name ?? "");
          setPaymentPrice(d.price_vnd ?? 0);
        })
        .catch(() => setPaymentQrUrl(null));
    },
    [foundMember]
  );

  const handleConfirmPayment = useCallback(async () => {
    if (!foundMember) return;
    setActionLoading("confirm");
    setActionError(null);
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, plan_id: paymentPlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setFoundMember((prev) =>
        prev
          ? { ...prev, validUntil: data.member?.validUntil ?? prev.validUntil }
          : prev
      );
      setRecentPayments((prev) => [
        {
          id: crypto.randomUUID(),
          plan_name: paymentPlanName,
          amount: paymentPrice,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setPaymentModalOpen(false);
      setActionMessage("Payment confirmed. Membership extended.");
    } catch (e) {
      setActionError((e as Error).message ?? "Unable to confirm payment.");
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, paymentPlanId, paymentPlanName, paymentPrice]);

  const handleUpgrade = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("upgrade");
    setActionError(null);
    setActionMessage(null);
    fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: foundMember.id, action: "upgrade" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.member) throw new Error(data.error || "Failed");
        setFoundMember((prev) =>
          prev
            ? {
                ...prev,
                membershipType: data.member.membershipType ?? prev.membershipType,
                status: data.member.status ?? prev.status,
                validUntil: data.member.validUntil ?? prev.validUntil,
              }
            : prev
        );
        setActionMessage("Membership upgraded.");
      })
      .catch(() => {
        setActionError("Unable to upgrade membership.");
      })
      .finally(() => setActionLoading(null));
  }, [foundMember]);

  const handleCreateMember = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setActionError(null);
      setActionMessage(null);
      if (!newMemberName.trim()) {
        setActionError("Name is required to create a member.");
        return;
      }
      setActionMessage("New member created (demo only).");
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPhone("");
      setNewMemberType("Founder Member");
    },
    [newMemberName]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#BEE7FF] via-[#EAF6FF] to-white">
      <header className="border-b border-white/60 bg-white/60 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1
              className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
            >
              Leo Mây Admin
            </h1>
            <p className="text-xs md:text-sm text-slate-600">Front Desk Dashboard</p>
          </div>
          <div className="flex items-center gap-4 text-xs md:text-sm text-slate-700">
            <div className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white/70 shadow-sm">
              <span className="font-medium">Gym Occupancy</span>
              <span className="ml-2 text-slate-900">
                {gymOccupancy} climber{gymOccupancy === 1 ? "" : "s"} inside
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-10">
          {/* MEMBER LOOKUP */}
          <section className="rounded-2xl bg-white/80 border border-slate-200 shadow-[0_12px_35px_rgba(15,23,42,0.07)] p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setSearchMode("id")}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      searchMode === "id"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Member ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("name")}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      searchMode === "name"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Name
                  </button>
                  <button
                    type="button"
                    onClick={handleScanQr}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      searchMode === "qr"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Scan QR
                  </button>
                </div>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-700 mb-1">
                    Search Member
                  </span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    placeholder={
                      searchMode === "name"
                        ? "Enter Member Name"
                        : searchMode === "qr"
                        ? "Scan or paste QR payload (leo-member:...)"
                        : "Enter Member ID (e.g. LM-0234)"
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                {searchError && <p className="text-xs text-red-500">{searchError}</p>}
                {actionMessage && !searchError && (
                  <p className="text-xs text-emerald-600">{actionMessage}</p>
                )}
                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                {searchMode === "name" && nameResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] text-slate-500">
                      Select a member:
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {nameResults.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => loadMemberById(m.id)}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {m.displayId ?? "No Member ID"}
                              </p>
                            </div>
                            <span className="text-[11px] text-slate-600">
                              {m.membershipType}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 md:flex-col md:gap-3">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleScanQr}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
                >
                  Scan QR
                </button>
              </div>
            </div>
          </section>

          {/* MEMBER PROFILE & ACTIONS */}
          {foundMember && (
            <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-8 items-start">
              {paymentReceived && (
                <div className="md:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm font-medium">
                  Payment received! Membership updated.
                </div>
              )}
              {/* Profile + activity */}
              <div className="space-y-4 md:space-y-6">
                <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-[0_14px_40px_rgba(15,23,42,0.08)] p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {foundMember.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {foundMember.email || foundMember.phone}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        foundMember.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : foundMember.status === "Frozen"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      {foundMember.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:text-sm">
                    <div>
                      <p className="text-slate-500">Member ID</p>
                      <p className="font-medium text-slate-900">{foundMember.displayId}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Membership</p>
                      <p className="font-medium text-slate-900">
                        {foundMember.membershipType}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Valid until</p>
                      <p className="font-medium text-slate-900">
                        {foundMember.validUntil}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Internal ID</p>
                      <p className="font-mono text-[11px] text-slate-800 break-all">
                        {foundMember.id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                    Activity
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                      <p className="text-slate-500 mb-1">Check-ins this month</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {foundMember.checkinsThisMonth}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                      <p className="text-slate-500 mb-1">Total visits</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {foundMember.totalVisits}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-[0_8px_28px_rgba(15,23,42,0.07)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                    Recent Check-ins
                  </h3>
                  <ul className="space-y-1.5 text-xs md:text-sm text-slate-800">
                    {foundMember.recentCheckins.map((c) => (
                      <li key={c.label}>{c.label}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-[0_8px_28px_rgba(15,23,42,0.07)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                    Recent Payments
                  </h3>
                  {recentPayments.length === 0 ? (
                    <p className="text-xs text-slate-500">No payments yet</p>
                  ) : (
                    <ul className="space-y-2 text-xs md:text-sm text-slate-800">
                      {recentPayments.map((p) => (
                        <li key={p.id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{p.plan_name}</span>
                            <span className="text-slate-500 ml-2">
                              {new Date(p.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <span className="font-medium">{p.amount.toLocaleString("vi-VN")} VND</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Check-in + membership controls */}
              <div className="space-y-4 md:space-y-6">
                <div className="rounded-2xl bg-slate-900 text-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.75)] p-4 md:p-6">
                  <h3 className="text-xs font-semibold tracking-[0.18em] uppercase mb-4">
                    Check-in Actions
                  </h3>
                  {!canCheckIn && foundMember?.status === "Inactive" && (
                    <p className="text-amber-300/90 text-sm mb-3">
                      Collect payment first to enable check-in.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={!canCheckIn || actionLoading === "checkin"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-400 text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {actionLoading === "checkin" ? "Checking in..." : "Check In"}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualCheckIn}
                      disabled={!canCheckIn || actionLoading === "manual"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-60"
                    >
                      {actionLoading === "manual" ? "Saving..." : "Manual Check-In"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUndoCheckIn}
                      disabled={!canCheckIn || actionLoading === "undo"}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-slate-500 text-slate-50 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {actionLoading === "undo" ? "Undoing..." : "Undo Check-In"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                    Membership Controls
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCollectPayment}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      Collect Payment
                    </button>
                    <button
                      type="button"
                      onClick={handleExtend}
                      disabled={actionLoading === "extend"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {actionLoading === "extend" ? "Extending..." : "Extend (no payment)"}
                    </button>
                    <button
                      type="button"
                      onClick={handleFreeze}
                      disabled={actionLoading === "freeze"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {actionLoading === "freeze" ? "Freezing..." : "Freeze membership"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={actionLoading === "cancel"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {actionLoading === "cancel" ? "Cancelling..." : "Cancel membership"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={actionLoading === "upgrade"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {actionLoading === "upgrade" ? "Upgrading..." : "Upgrade membership"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ADMIN TOOLS + NEW MEMBER FORM */}
          <section className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] gap-8 items-start">
            <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
              <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                Admin Tools
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  Add New Member
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  Generate Day Pass
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  View Leaderboard
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  View Gym Occupancy
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
              <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                New Member
              </h3>
              <form className="space-y-3" onSubmit={handleCreateMember}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-700">
                    Name
                    <input
                      type="text"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs md:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-xs text-slate-700">
                    Email
                    <input
                      type="email"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs md:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-slate-700">
                    Phone
                    <input
                      type="tel"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs md:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-slate-700">
                    Membership Type
                    <select
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs md:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      value={newMemberType}
                      onChange={(e) =>
                        setNewMemberType(e.target.value as MembershipType)
                      }
                    >
                      <option value="Founder Member">Founder Member</option>
                      <option value="Standard">Standard</option>
                      <option value="Day Pass">Day Pass</option>
                    </select>
                  </label>
                </div>
                <div className="pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full text-xs md:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Create Member
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* Collect Payment Modal */}
      {paymentModalOpen && foundMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Collect Payment</h3>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600">Membership plan</label>
              <select
                value={paymentPlanId}
                onChange={(e) => handlePaymentPlanChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price_vnd > 0 ? `${p.price_vnd.toLocaleString("vi-VN")} VND` : "prorated"}
                  </option>
                ))}
              </select>
            </div>
            {paymentPlanName && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium">{paymentPlanName}</span>
                  <span className="text-slate-500">Price</span>
                  <span className="font-medium">{paymentPrice.toLocaleString("vi-VN")} VND</span>
                  <span className="text-slate-500">Member ID</span>
                  <span className="font-medium">{foundMember.displayId ?? foundMember.id}</span>
                </div>
                {paymentQrUrl && (
                  <div className="flex justify-center py-2">
                    <img src={paymentQrUrl} alt="VietQR" className="w-48 h-48 object-contain bg-white rounded-lg border" />
                  </div>
                )}
                <p className="text-xs text-slate-500">Customer scans with banking app, MoMo, or ZaloPay. Confirm after payment received.</p>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-full text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={!paymentQrUrl || actionLoading === "confirm"}
                className="flex-1 px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {actionLoading === "confirm" ? "Confirming..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

