"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { formatInGymTZ, getGymToday, getGymDateFromISO } from "@/lib/gymTimezone";

const QrScannerModal = dynamic(() => import("@/components/admin/QrScannerModal"), { ssr: false });
const BarcodeScannerModal = dynamic(() => import("@/components/admin/BarcodeScannerModal"), { ssr: false });

const ADMIN_LOCALE_KEY = "admin-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const s = localStorage.getItem(ADMIN_LOCALE_KEY);
  return s === "en" || s === "vi" ? s : "vi";
}

function getVietQrProxyUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  return `/api/vietqr-proxy?url=${encodeURIComponent(rawUrl)}`;
}

type MembershipType = "Founder Member" | "Standard" | "Day Pass";

interface WaiverRecord {
  waiver_text: string;
  signature: string | null;
  created_at: string;
  full_name: string;
}

interface AdminMember {
  id: string;
  displayId: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  membershipType: MembershipType | string;
  status: "Active" | "Inactive" | "Frozen" | "Cancelled";
  validUntil: string;
  checkinsThisMonth: number;
  totalVisits: number;
  recentCheckins: { label: string }[];
  profile_photo_url?: string | null;
  id_number?: string | null;
  date_of_birth?: string | null;
  instagram_handle?: string | null;
  gender?: string | null;
  visits_remaining?: number;
  has_active_visit_pass?: boolean;
  has_active_day_pass?: boolean;
  waiver_signed?: boolean;
  waiver_signed_at?: string | null;
  waiver?: WaiverRecord | null;
}

interface NameSearchResult {
  id: string;
  displayId: string | null;
  name: string;
  membershipType: string;
}

export default function AdminPage() {
  const { isAdmin, loading, adminFetch, signOut } = useAdminAuth();
  const [locale, setLocale] = useState<Locale>("vi");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);
  const setLocaleAndStore = useCallback((l: Locale) => {
    setLocale(l);
    if (typeof window !== "undefined") localStorage.setItem(ADMIN_LOCALE_KEY, l);
  }, []);
  const [searchMode, setSearchMode] = useState<"id" | "name" | "qr">("id");
  const [scannerIntent, setScannerIntent] = useState<"quick_checkin" | "member_lookup" | null>(null);
  const [foundMember, setFoundMember] = useState<AdminMember | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<null | "checkin" | "manual" | "undo" | "extend" | "freeze" | "cancel" | "upgrade" | "payment" | "confirm">(null);
  const [plans, setPlans] = useState<{ id: string; name: string; duration_days: number; duration_visits?: number | null; price_vnd: number; pass_type?: "newbie" | "day" | "visit" }[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentQrFullscreen, setPaymentQrFullscreen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"vietqr" | "cash">("vietqr");
  const [paymentPlanId, setPaymentPlanId] = useState<string>("month_pass");
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentPlanName, setPaymentPlanName] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [paymentCurrentExpiry, setPaymentCurrentExpiry] = useState<string | null>(null);
  const [paymentNewExpiry, setPaymentNewExpiry] = useState<string | null>(null);
  const [paymentVisitsAdded, setPaymentVisitsAdded] = useState<number | null>(null);
  const [adminPassFilter, setAdminPassFilter] = useState<"all" | "day" | "visit">("all");
  const [recentPayments, setRecentPayments] = useState<{ id: string; plan_name: string; amount: number; created_at: string }[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberType, setNewMemberType] = useState<MembershipType>("Founder Member");
  const [gymOccupancy, setGymOccupancy] = useState(0);
  const [nameResults, setNameResults] = useState<NameSearchResult[]>([]);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const lastPaymentCountRef = React.useRef<number | null>(null);
  const [toolsModal, setToolsModal] = useState<"occupancy" | "checkins" | "revenue" | "staff" | "inventory" | null>(null);
  const [staffModalTab, setStaffModalTab] = useState<"overview" | "tasks" | "attendance" | "coaching" | "routes">("overview");
  const [staffResetLoading, setStaffResetLoading] = useState(false);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<{
    label: string;
    staff: { staff_id: string; display_name: string | null; email: string | null; in_days: number }[];
  } | null>(null);
  const [checkinsData, setCheckinsData] = useState<{
    checkins: { id: string; member_name: string; member_code: string | null; timestamp: string }[];
    byDay: Record<string, { id: string; member_name: string; member_code: string | null; timestamp: string }[]>;
  } | null>(null);
  const [revenueData, setRevenueData] = useState<{
    period: string;
    total: number;
    byPlan: Record<string, number>;
    payments: { id?: string; plan_name: string; amount: number; method: string; created_at: string }[];
  } | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<"day" | "week" | "month">("day");
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [posCart, setPosCart] = useState<{ sku: string; name: string; quantity: number; price: number; variant_id?: string; image?: string | null }[]>([]);
  const [posSkuInput, setPosSkuInput] = useState("");
  const [posBarcodeScannerOpen, setPosBarcodeScannerOpen] = useState(false);
  const [posLookupResult, setPosLookupResult] = useState<{ found: boolean; product?: { name: string; image?: string | null }; variant?: { id: string; sku: string; price: number; size?: string | null }; stock_quantity?: number } | null>(null);
  const [posCheckoutLoading, setPosCheckoutLoading] = useState(false);
  const [posPaymentModalOpen, setPosPaymentModalOpen] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState<"vietqr" | "cash">("vietqr");
  const [posQrUrl, setPosQrUrl] = useState<string | null>(null);
  const [posPendingTransactionId, setPosPendingTransactionId] = useState<string | null>(null);
  const [posConfirmLoading, setPosConfirmLoading] = useState(false);
  const [memberPurchases, setMemberPurchases] = useState<{ id: string; total: number; payment_method: string; created_at: string; items: { sku: string; name: string | null; quantity: number; price: number }[] }[]>([]);
  type ProductVariant = { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number };
  type ProductWithVariants = { id: string; name: string; brand: string | null; category: string; image: string | null; variants: ProductVariant[] };
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  type InvVariant = { id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number };
  type InvProduct = { id: string; name: string; brand: string | null; category: string; image: string | null };
  const [inventoryList, setInventoryList] = useState<{ id: string; variant_id: string; quantity: number; location: string | null; variant: InvVariant | null; product: InvProduct | null }[]>([]);
  const [inventoryScannedBarcode, setInventoryScannedBarcode] = useState("");
  const [scannedVariant, setScannedVariant] = useState<{ id: string; product_id: string; sku: string; size: string | null; barcode: string | null; price: number; cost: number } | null>(null);
  const [scannedProduct, setScannedProduct] = useState<{ id: string; name: string; brand: string | null; category: string; image: string | null } | null>(null);
  const [inventoryQty, setInventoryQty] = useState("1");
  const [newProductName, setNewProductName] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<"shoes" | "chalk" | "merch" | "rental">("merch");
  const [newVariants, setNewVariants] = useState<{ size: string; barcode: string; price: string; cost: string; quantity: string }[]>([{ size: "", barcode: "", price: "", cost: "", quantity: "1" }]);
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [stockInSku, setStockInSku] = useState("");
  const [stockInQty, setStockInQty] = useState("1");
  const [stockOutSku, setStockOutSku] = useState("");
  const [stockOutQty, setStockOutQty] = useState("1");
  const [inventoryActionMessage, setInventoryActionMessage] = useState<string | null>(null);
  const [inventoryCreateError, setInventoryCreateError] = useState<string | null>(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const inventoryQtyInputRef = React.useRef<HTMLInputElement>(null);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<"all" | "shoes" | "merch">("all");
  const [productDetailProductId, setProductDetailProductId] = useState<string | null>(null);
  const [productDetailData, setProductDetailData] = useState<{ product: InvProduct; variants: (InvVariant & { stock_quantity: number })[] } | null>(null);
  const [productDetailEditProduct, setProductDetailEditProduct] = useState<{ name: string; brand: string | null; category: string; image: string | null } | null>(null);
  const [productDetailEditVariantId, setProductDetailEditVariantId] = useState<string | null>(null);
  const [productDetailEditVariant, setProductDetailEditVariant] = useState<{ sku: string; size: string | null; barcode: string | null; price: number; cost: number } | null>(null);
  const [newProductImageDataUrl, setNewProductImageDataUrl] = useState<string | null>(null);
  const newProductPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [posAddQty, setPosAddQty] = useState(1);
  const productDetailPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [adminTab, setAdminTab] = useState<"member" | "sales" | "inventory" | "operations" | "admin_tools">("member");
  type StaffTaskRow = { id: string; title: string; status: string; block?: string; start_time?: string | null; due_time?: string | null; completed_at: string | null; completer?: { display_name?: string | null; email?: string | null } | { display_name?: string | null; email?: string | null }[] | null };
  const [staffOpsData, setStaffOpsData] = useState<{
    attendance: { in: { staff_id: string; status: string; staff_profiles?: { email?: string; display_name?: string } | { email?: string; display_name?: string }[] }[]; out: { staff_id: string; status: string; staff_profiles?: { email?: string; display_name?: string } | { email?: string; display_name?: string }[] }[] };
    sessions: { id: string; start_time: string; end_time?: string; coach_id: string | null; session_type: string; staff_profiles?: { email?: string; display_name?: string } | { email?: string; display_name?: string }[] }[];
    sessionsToday?: { id: string; start_time: string; end_time?: string; coach_id: string | null; location?: string; staff_profiles?: { email?: string; display_name?: string } | { email?: string; display_name?: string }[] }[];
    zones: {
      id: string;
      name: string;
      next_reset_at: string | null;
      last_reset_at?: string | null;
      reset_frequency_days?: number;
      overdue?: boolean;
      route_age_days?: number | null;
      reset_status?: "pending" | "in_progress" | "completed" | "overdue";
      assigned_setters?: { staff_id: string; name: string }[];
    }[];
    tasks: StaffTaskRow[];
    preOpen?: StaffTaskRow[];
    during?: StaffTaskRow[];
    closing?: StaffTaskRow[];
    currentPhaseTasks?: StaffTaskRow[];
    phase?: { current_phase?: string; phase_label?: string; countdown_message?: string; minutes_until_next_phase?: number };
    gym_ready?: boolean;
    route_reset_day?: boolean;
    timeline?: { id: string; completed_at: string; task_title: string; staff_name: string }[];
    staffTaskPerformance?: { staff_id: string; display_name: string; tasks_completed: number; completion_rate_pct: number }[];
    route_setters?: { id: string; display_name?: string | null; email?: string | null }[];
    summary: { staff_in_today: number; staff_out_today: number; sessions_today: number; newbie_attendance_today?: number; zones_overdue: number; tasks_pending: number; tasks_completed?: number; tasks_overdue?: number; tasks_total?: number; pre_open_completed?: number; pre_open_total?: number; closing_overdue?: number; unassigned_sessions?: number; staff_required?: number };
  } | null>(null);

  const m = getMessages(locale).admin;

  // Fetch plans
  useEffect(() => {
    adminFetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, [adminFetch]);

  // Fetch member purchase history when member is loaded
  useEffect(() => {
    if (!foundMember?.id) {
      setMemberPurchases([]);
      return;
    }
    adminFetch(`/api/admin/members/purchases?member_id=${encodeURIComponent(foundMember.id)}`)
      .then((r) => r.json())
      .then((d) => setMemberPurchases(d.purchases ?? []))
      .catch(() => setMemberPurchases([]));
  }, [foundMember?.id, adminFetch]);

  // Fetch products for front desk and inventory
  useEffect(() => {
    if (!foundMember && toolsModal !== "inventory" && adminTab !== "inventory") return;
    adminFetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [foundMember, toolsModal, adminTab, adminFetch]);

  // Fetch inventory when inventory modal opens or category filter changes
  useEffect(() => {
    if (toolsModal !== "inventory" && adminTab !== "inventory") return;
    const url = inventoryCategoryFilter === "all" ? "/api/admin/inventory" : `/api/admin/inventory?category=${encodeURIComponent(inventoryCategoryFilter)}`;
    adminFetch(url)
      .then((r) => r.json())
      .then((d) => setInventoryList(d.inventory ?? []))
      .catch(() => setInventoryList([]));
  }, [toolsModal, adminTab, inventoryCategoryFilter, adminFetch]);

  // Load product detail when opening product detail modal
  useEffect(() => {
    if (!productDetailProductId) {
      setProductDetailData(null);
      return;
    }
    adminFetch(`/api/admin/products/${productDetailProductId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.product && d.variants) setProductDetailData({ product: d.product, variants: d.variants });
        else setProductDetailData(null);
      })
      .catch(() => setProductDetailData(null));
  }, [productDetailProductId, adminFetch]);

  const loadMemberById = useCallback(async (id: string) => {
    setSearchError(null);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await adminFetch(`/api/admin/members?id=${encodeURIComponent(id)}`);
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
  }, [adminFetch]);

  // Fetch and poll recent payments when member found; detect new payment for auto webhook
  useEffect(() => {
    if (!foundMember?.id) {
      setRecentPayments([]);
      lastPaymentCountRef.current = null;
      return;
    }

    const poll = async () => {
      try {
        const res = await adminFetch(`/api/admin/payments?member_id=${encodeURIComponent(foundMember.id)}`);
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
  }, [foundMember?.id, loadMemberById, adminFetch]);

  // Fetch check-ins when modal opens
  useEffect(() => {
    if (toolsModal !== "checkins") return;
    adminFetch("/api/admin/checkins?days=7")
      .then((r) => r.json())
      .then((d) => setCheckinsData({ checkins: d.checkins ?? [], byDay: d.byDay ?? {} }))
      .catch(() => setCheckinsData({ checkins: [], byDay: {} }));
  }, [toolsModal, adminFetch]);

  // Fetch revenue when modal opens or period changes
  useEffect(() => {
    if (toolsModal !== "revenue") return;
    adminFetch(`/api/admin/revenue?period=${revenuePeriod}`)
      .then((r) => r.json())
      .then((d) => setRevenueData(d))
      .catch(() => setRevenueData(null));
  }, [toolsModal, revenuePeriod, adminFetch]);

  // Fetch staff operations when Operations tab opens
  useEffect(() => {
    if (adminTab !== "operations") return;
    adminFetch("/api/admin/staff")
      .then((r) => r.json())
      .then((d) => setStaffOpsData(d))
      .catch(() => setStaffOpsData(null));
  }, [adminTab, adminFetch]);

  useEffect(() => {
    if (adminTab !== "operations" || staffModalTab !== "attendance") return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    adminFetch(`/api/admin/staff/attendance-summary?period=month&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setMonthlyAttendanceData({ label: d.label, staff: d.staff ?? [] }))
      .catch(() => setMonthlyAttendanceData(null));
  }, [adminTab, staffModalTab, adminFetch]);

  // Poll real-time-ish occupancy from backend.
  useEffect(() => {
    let cancelled = false;

    const fetchOccupancy = async () => {
      try {
        const res = await adminFetch("/api/admin/occupancy");
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
  }, [adminFetch]);

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

    if (raw.startsWith("leo-staff:")) {
      const staffId = raw.split(":")[1]?.trim();
      if (!staffId) {
        setSearchError("Could not read staff QR payload.");
        return;
      }
      try {
        const res = await adminFetch("/api/admin/staff/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_id: staffId }),
        });
        const data = await res.json();
        if (res.ok && data?.staff) {
          const name = (data.staff.display_name || data.staff.email) ?? "Staff";
          setActionMessage(locale === "vi" ? `Nhân viên ${name} đã chấm công.` : `${name} checked in for today.`);
          setSearchQuery("");
        } else {
          setSearchError(data?.error || (locale === "vi" ? "Chấm công thất bại." : "Staff check-in failed."));
        }
      } catch {
        setSearchError(locale === "vi" ? "Không thể chấm công." : "Unable to record staff check-in.");
      }
      return;
    }

    let params = new URLSearchParams();

    if (searchMode === "qr" || raw.startsWith("leo-member:") || raw.includes("member_id=")) {
      let memberId = "";
      if (raw.startsWith("leo-member:")) {
        const parts = raw.split(":");
        memberId = parts.length === 2 ? parts[1].trim() : "";
      } else {
        const match = raw.match(/member_id=([^&\s#]+)/);
        memberId = (match?.[1] ?? "").trim();
      }
      if (!memberId) {
        setSearchError("Could not read QR payload or URL.");
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
      const res = await adminFetch(`/api/admin/members?${params.toString()}`);
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
  }, [searchMode, searchQuery, adminFetch, locale]);

  const doPosLookup = useCallback(
    async (
      val: string
    ): Promise<{
      found: boolean;
      product?: { name: string; image?: string | null };
      variant?: { id: string; sku: string; price: number; size?: string | null };
      stock_quantity?: number;
    }> => {
      const v = val.trim();
      if (!v) {
        setPosLookupResult({ found: false });
        return { found: false };
      }
      try {
        const r = await adminFetch(`/api/admin/variants/by-barcode?barcode=${encodeURIComponent(v)}`);
        const d = await r.json();
        if (d.found && d.product && d.variant) {
          const result = {
            found: true,
            product: d.product,
            variant: { id: d.variant.id, sku: d.variant.sku, price: d.variant.price, size: d.variant.size ?? null },
            stock_quantity: d.stock_quantity ?? 0,
          };
          setPosLookupResult(result);
          return result;
        }
      } catch {
        /* ignore */
      }
      try {
        let res = await adminFetch(`/api/admin/products?sku=${encodeURIComponent(v)}`);
        let data = await res.json();
        if (!data?.product && !data?.variant) {
          res = await adminFetch(`/api/admin/products?barcode=${encodeURIComponent(v)}`);
          data = await res.json();
        }
        if (data?.product && data?.variant) {
          const stock = data.stock_quantity ?? 0;
          const result = {
            found: true,
            product: data.product,
            variant: { id: data.variant.id, sku: data.variant.sku, price: data.variant.price, size: data.variant.size ?? null },
            stock_quantity: stock,
          };
          setPosLookupResult(result);
          return result;
        }
      } catch {
        /* ignore */
      }
      setPosLookupResult({ found: false });
      return { found: false };
    },
    [adminFetch]
  );

  const handleScanQr = useCallback(() => {
    setSearchMode("qr");
    setScannerIntent("member_lookup");
    setSearchError(null);
    setScannerModalOpen(true);
  }, []);

  const handleQuickCheckInScan = useCallback(() => {
    setScannerIntent("quick_checkin");
    setSearchError(null);
    setActionError(null);
    setActionMessage(null);
    setScannerModalOpen(true);
  }, []);

  const handleQrScanned = useCallback(
    async (result: { type: "member"; raw: string; id?: string } | { type: "staff"; raw: string; id?: string }) => {
      setScannerModalOpen(false);
      setSearchError(null);
      if (result.type === "staff") {
        try {
          const res = await adminFetch("/api/admin/staff/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qr: result.raw, staff_id: result.id }),
          });
          const data = await res.json();
          if (res.ok && data?.staff) {
            const name = (data.staff.display_name || data.staff.email) ?? "Staff";
            setActionMessage(locale === "vi" ? `Nhân viên ${name} đã chấm công.` : `${name} checked in for today.`);
          } else {
            setActionError(data?.error || (locale === "vi" ? "Chấm công thất bại." : "Staff check-in failed."));
          }
        } catch {
          setActionError(locale === "vi" ? "Không thể chấm công." : "Unable to record staff check-in.");
        }
        return;
      }
      if (scannerIntent === "quick_checkin") {
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qr: result.raw, member_id: result.id, location: "turnstile" }),
          });
        if (res.ok) {
            setActionMessage(locale === "vi" ? "Đã check-in thành công." : "Check-in recorded.");
        } else {
          const data = await res.json().catch(() => ({}));
            setActionError(data?.error || "Check-in failed.");
        }
      } catch {
        setActionError("Unable to record check-in.");
      }
        return;
      }
      if (result.id) {
        loadMemberById(result.id);
      } else {
        setSearchError(locale === "vi" ? "Không đọc được ID thành viên từ QR." : "Could not read member ID from QR.");
      }
    },
    [loadMemberById, adminFetch, locale, scannerIntent]
  );

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
      setActionMessage("Check-in recorded.");
      loadMemberById(foundMember.id);
    } catch (e) {
      setActionError("Unable to record check-in. Please verify member ID and try again.");
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, loadMemberById]);

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
      setActionMessage("Manual check-in recorded.");
      loadMemberById(foundMember.id);
    } catch {
      setActionError("Unable to record manual check-in.");
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, loadMemberById]);

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
    adminFetch("/api/admin/membership", {
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
    adminFetch("/api/admin/membership", {
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
    adminFetch("/api/admin/membership", {
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
    const defaultPlan = foundMember.has_active_visit_pass
      ? "visit_5"
      : foundMember.has_active_day_pass
        ? "month_pass"
        : "month_pass";
    setPaymentPlanId(defaultPlan);
    setPaymentMethod("vietqr");
    setPaymentQrUrl(null);
    setPaymentPlanName("");
    setPaymentPrice(0);
    setPaymentCurrentExpiry(null);
    setPaymentNewExpiry(null);
    setPaymentVisitsAdded(null);
    adminFetch(`/api/admin/vietqr?plan_id=${encodeURIComponent(defaultPlan)}&member_id=${encodeURIComponent(foundMember.id)}`)
      .then((r) => r.json())
      .then((d) => {
        setPaymentQrUrl(d.url ?? null);
        setPaymentPlanName(d.plan_name ?? "");
        setPaymentPrice(d.price_vnd ?? 0);
        setPaymentCurrentExpiry(d.current_expiry ?? null);
        setPaymentNewExpiry(d.new_expiry ?? null);
        setPaymentVisitsAdded(d.visits_added ?? null);
      })
      .catch(() => setPaymentQrUrl(null));
  }, [foundMember]);

  const handlePosCheckoutCash = useCallback(async () => {
    if (!foundMember || posCart.length === 0) return;
    setPosCheckoutLoading(true);
    setActionError(null);
    try {
      const res = await adminFetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: foundMember.id,
          items: posCart.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, price: i.price, variant_id: i.variant_id })),
          payment_method: "cash",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPosCart([]);
        setPosPaymentModalOpen(false);
        setActionMessage(locale === "vi" ? "Đã ghi nhận thanh toán tiền mặt." : "Cash payment recorded.");
        adminFetch(`/api/admin/members/purchases?member_id=${encodeURIComponent(foundMember.id)}`)
          .then((r) => r.json())
          .then((d) => setMemberPurchases(d.purchases ?? []))
          .catch(() => {});
      } else {
        setActionError(data?.error || "Checkout failed.");
      }
    } catch {
      setActionError("Checkout failed.");
    } finally {
      setPosCheckoutLoading(false);
    }
  }, [foundMember, posCart, adminFetch, locale]);

  const handlePosCheckoutVietqr = useCallback(async () => {
    if (!foundMember || posCart.length === 0) return;
    setPosCheckoutLoading(true);
    setActionError(null);
    try {
      const res = await adminFetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: foundMember.id,
          items: posCart.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, price: i.price, variant_id: i.variant_id })),
          payment_method: "vietqr",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.url && data.transaction_id) {
        setPosQrUrl(data.url);
        setPosPendingTransactionId(data.transaction_id);
      } else {
        setActionError(data?.error || "Checkout failed.");
      }
    } catch {
      setActionError("Checkout failed.");
    } finally {
      setPosCheckoutLoading(false);
    }
  }, [foundMember, posCart, adminFetch]);

  const handlePosConfirmPayment = useCallback(async () => {
    if (!posPendingTransactionId) return;
    setPosConfirmLoading(true);
    setActionError(null);
    try {
      const res = await adminFetch("/api/admin/pos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: posPendingTransactionId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPosCart([]);
        setPosPaymentModalOpen(false);
        setPosQrUrl(null);
        setPosPendingTransactionId(null);
        setActionMessage(locale === "vi" ? "Đã xác nhận thanh toán VietQR." : "VietQR payment confirmed.");
        if (foundMember) {
          adminFetch(`/api/admin/members/purchases?member_id=${encodeURIComponent(foundMember.id)}`)
            .then((r) => r.json())
            .then((d) => setMemberPurchases(d.purchases ?? []))
            .catch(() => {});
        }
      } else {
        setActionError(data?.error || "Confirm failed.");
      }
    } catch {
      setActionError("Confirm failed.");
    } finally {
      setPosConfirmLoading(false);
    }
  }, [posPendingTransactionId, foundMember, adminFetch, locale]);

  const handlePaymentPlanChange = useCallback(
    (planId: string) => {
      if (!foundMember) return;
      setPaymentPlanId(planId);
      setPaymentQrUrl(null);
      setPaymentCurrentExpiry(null);
      setPaymentNewExpiry(null);
      setPaymentVisitsAdded(null);
      adminFetch(`/api/admin/vietqr?plan_id=${encodeURIComponent(planId)}&member_id=${encodeURIComponent(foundMember.id)}`)
        .then((r) => r.json())
        .then((d) => {
          setPaymentQrUrl(d.url ?? null);
          setPaymentPlanName(d.plan_name ?? "");
          setPaymentPrice(d.price_vnd ?? 0);
          setPaymentCurrentExpiry(d.current_expiry ?? null);
          setPaymentNewExpiry(d.new_expiry ?? null);
          setPaymentVisitsAdded(d.visits_added ?? null);
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
      const res = await adminFetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, plan_id: paymentPlanId, method: paymentMethod }),
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
  }, [foundMember, paymentPlanId, paymentPlanName, paymentPrice, paymentMethod]);

  const handleUpgrade = useCallback(() => {
    if (!foundMember) return;
    setActionLoading("upgrade");
    setActionError(null);
    setActionMessage(null);
    adminFetch("/api/admin/membership", {
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

  const t = getMessages(locale).admin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#BEE7FF] via-[#EAF6FF] to-white">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return <AdminLoginForm locale={locale} onLocaleChange={setLocaleAndStore} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo-white.svg" alt="Leo Mây logo" className="h-7 w-auto" />
            <div>
              <h1
                className="text-xl md:text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                {t.title}
              </h1>
              <p className="text-xs md:text-sm text-slate-300">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-200">
            <div className="flex gap-1 rounded-full border border-slate-600 bg-slate-800/80 p-0.5">
              <button
                type="button"
                onClick={() => setLocaleAndStore("en")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocaleAndStore("vi")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}
              >
                VN
              </button>
            </div>
            <div className="border border-slate-700 rounded-xl px-3 py-1.5 bg-slate-800/80 shadow-sm">
              <span className="font-medium">{t.gymOccupancy}</span>
              <span className="ml-2 text-slate-50">
                {t.climbersInside.replace("{count}", String(gymOccupancy))}
              </span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-lg border border-slate-500 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-10">
          {/* QUICK CHECK-IN */}
          <section className="rounded-2xl bg-slate-900/95 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6">
            <h3 className="text-sm font-semibold text-white mb-1">{m.quickCheckInScan}</h3>
            <p className="text-xs text-slate-400 mb-3">{m.quickCheckInScanHint}</p>
            <button
              type="button"
              onClick={handleQuickCheckInScan}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-slate-900 hover:bg-emerald-400"
            >
              {m.scanQr} — {m.quickCheckInScan}
            </button>
          </section>

          {/* STICKY TAB NAV */}
          <nav className="sticky top-0 z-20 rounded-xl p-1 mb-4 bg-white/95 border border-slate-200 shadow-md backdrop-blur-md overflow-x-auto" aria-label="Admin tabs">
            <div className="flex gap-1 min-w-max">
            {(["member", "sales", "inventory", "operations", "admin_tools"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAdminTab(tab)}
                className={`flex-none whitespace-nowrap py-2.5 px-3 rounded-lg text-[13px] font-medium transition-all ${
                  adminTab === tab ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-100 border border-transparent"
                }`}
              >
                {tab === "member" ? (locale === "vi" ? "Thành viên" : "Member") : null}
                {tab === "sales" ? (locale === "vi" ? "Bán hàng" : "Sales") : null}
                {tab === "inventory" ? m.inventoryModule : null}
                {tab === "operations" ? (locale === "vi" ? "Vận hành" : "Operations") : null}
                {tab === "admin_tools" ? (locale === "vi" ? "Công cụ" : "Admin Tools") : null}
              </button>
            ))}
            </div>
          </nav>

          {/* TAB: MEMBER */}
          {adminTab === "member" && (
          <>
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
                    {t.memberId}
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
                    {t.name}
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
                    {t.scanQr}
                  </button>
                </div>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-700 mb-1">
                    {t.searchMember}
                  </span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    placeholder={
                      searchMode === "name"
                        ? t.enterMemberName
                        : searchMode === "qr"
                        ? t.scanOrPasteQr
                        : t.enterMemberId
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
                      {t.selectMember}
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {nameResults.map((member) => (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => loadMemberById(member.id)}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900">
                                {member.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {member.displayId ?? t.noMemberId}
                              </p>
                            </div>
                            <span className="text-[11px] text-slate-600">
                              {member.membershipType}
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
                  {t.search}
                </button>
                <button
                  type="button"
                  onClick={handleScanQr}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
                >
                  {t.scanQr}
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
                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">
                          {foundMember.name}
                        </h2>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                            foundMember.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                              : foundMember.status === "Frozen"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                              : "bg-rose-500/20 text-rose-300 border border-rose-400/50"
                          }`}
                        >
                          {foundMember.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {foundMember.email || foundMember.phone}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {foundMember.profile_photo_url ? (
                        <img
                          src={foundMember.profile_photo_url}
                          alt=""
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-slate-600"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-lg font-semibold">
                          {foundMember.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:text-sm">
                    <div>
                      <p className="text-slate-400">Member ID</p>
                      <p className="font-medium text-slate-100">{foundMember.displayId}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Membership</p>
                      <p className="font-medium text-slate-100">
                        {foundMember.membershipType}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Valid until</p>
                      <p className="font-medium text-slate-100">
                        {foundMember.validUntil}
                      </p>
                    </div>
                    {foundMember.gender && (
                      <div>
                        <p className="text-slate-400">Gender</p>
                        <p className="font-medium text-slate-100">{foundMember.gender === "male" ? "Male" : "Female"}</p>
                      </div>
                    )}
                    {foundMember.instagram_handle && (
                      <div>
                        <p className="text-slate-400">Instagram</p>
                        <a
                          href={`https://www.instagram.com/${foundMember.instagram_handle.replace(/^@/, "")}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
                        >
                          @{foundMember.instagram_handle.replace(/^@/, "")}
                        </a>
                      </div>
                    )}
                    {foundMember.id_number && (
                      <div>
                        <p className="text-slate-400">Govt ID</p>
                        <p className="font-medium text-slate-100">{foundMember.id_number}</p>
                      </div>
                    )}
                    {foundMember.date_of_birth && (
                      <div>
                        <p className="text-slate-400">Date of birth</p>
                        <p className="font-medium text-slate-100">
                          {new Date(foundMember.date_of_birth).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-slate-400">Waiver Signed</p>
                      {foundMember.waiver_signed && foundMember.waiver_signed_at ? (
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-100">
                            {new Date(foundMember.waiver_signed_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          {foundMember.waiver && (
                            <button
                              type="button"
                              onClick={() => setWaiverModalOpen(true)}
                              className="text-xs font-medium text-sky-300 hover:text-sky-200 underline"
                            >
                              View waiver
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium text-slate-400">Not signed</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-400">Internal ID</p>
                      <p className="font-mono text-[11px] text-slate-300 break-all">
                        {foundMember.id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                    Activity
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                    <div className="rounded-xl bg-slate-700/50 border border-slate-600 px-3 py-3">
                      <p className="text-slate-400 mb-1">Check-ins this month</p>
                      <p className="text-lg font-semibold text-white">
                        {foundMember.checkinsThisMonth}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-700/50 border border-slate-600 px-3 py-3">
                      <p className="text-slate-400 mb-1">Total visits</p>
                      <p className="text-lg font-semibold text-white">
                        {foundMember.totalVisits}
                      </p>
                    </div>
                    {(foundMember.visits_remaining ?? 0) > 0 && (
                      <div className="col-span-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 px-3 py-3">
                        <p className="text-slate-300 mb-1">Visits remaining (check-ins left)</p>
                        <p className="text-xl font-semibold text-emerald-300">
                          {foundMember.visits_remaining} visits
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                    Recent Check-ins
                  </h3>
                  <ul className="space-y-1.5 text-xs md:text-sm text-slate-200">
                    {foundMember.recentCheckins.map((c) => (
                      <li key={c.label}>{c.label}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                    {m.payments} / {m.purchaseHistory}
                  </h3>
                  {recentPayments.length === 0 && memberPurchases.length === 0 ? (
                    <p className="text-xs text-slate-400">{m.noPaymentsInPeriod}</p>
                  ) : (
                    <ul className="space-y-2 text-xs md:text-sm text-slate-200">
                      {[
                        ...recentPayments.map((p) => ({ type: "membership" as const, id: p.id, date: p.created_at, amount: p.amount, label: p.plan_name, items: null })),
                        ...memberPurchases.map((tx) => ({ type: "retail" as const, id: tx.id, date: tx.created_at, amount: tx.total, label: "Retail", items: tx.items })),
                      ]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((entry) => (
                          <li key={`${entry.type}-${entry.id}`} className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-start">
                          <div>
                                <span className="font-medium text-slate-100">{entry.label}</span>
                            <span className="text-slate-400 ml-2">
                                  {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                              <span className="font-medium text-slate-100">{entry.amount.toLocaleString("vi-VN")} VND</span>
                            </div>
                            {entry.items && entry.items.length > 0 && (
                              <ul className="list-disc list-inside text-slate-400 ml-0.5">
                                {entry.items.map((it, j) => (
                                  <li key={j}>{it.name ?? it.sku} × {it.quantity}</li>
                                ))}
                              </ul>
                            )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Check-in + membership controls */}
              <div className="space-y-4 md:space-y-6">
                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.75)] p-4 md:p-6">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-200 uppercase mb-4">
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

                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
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
          </>
          )}

          {/* TAB: SALES */}
          {adminTab === "sales" && (
          <section className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6">
            {!foundMember ? (
              <p className="text-slate-400 text-sm">{m.salesPanelHidden}</p>
            ) : (
              <>
                <p className="text-xs text-slate-300 mb-3">{foundMember.name} — {foundMember.displayId ?? foundMember.id}</p>
                <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">{m.frontDeskSales}</h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { const p = products.find((x) => x.category === "rental"); const v = p?.variants?.[0]; const price = v?.price ?? 50000; const name = p?.name ?? "Rental Shoes"; const sku = v?.sku ?? "RENTAL_SHOES"; setPosCart((c) => [...c, { sku, name, quantity: 1, price, variant_id: v?.id, image: p?.image ?? undefined }]); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200">+ {m.shoeRental} (50,000 VND)</button>
                      <button type="button" onClick={() => { const p = products.find((x) => x.category === "chalk"); const v = p?.variants?.[0]; const price = v?.price ?? 20000; const name = p?.name ?? "Chalk (bag, return after session)"; const sku = v?.sku ?? "CHALK_BAG"; setPosCart((c) => [...c, { sku, name, quantity: 1, price, variant_id: v?.id, image: p?.image ?? undefined }]); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200">+ {m.buyChalk} (20,000 VND)</button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        placeholder={m.skuOrBarcode}
                        value={posSkuInput}
                        onChange={(e) => { setPosSkuInput(e.target.value); setPosLookupResult(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = posSkuInput.trim();
                            if (!val) return;
                            doPosLookup(val).then(() => setPosAddQty(1));
                          }
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setPosBarcodeScannerOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"
                      >
                        {m.scanBarcode}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = posSkuInput.trim();
                          if (!val) return;
                          doPosLookup(val).then(() => setPosAddQty(1));
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-700"
                      >
                        {locale === "vi" ? "Tìm / Thêm" : "Lookup / Add"}
                      </button>
                    </div>
                    {posLookupResult && (
                      <div className={`rounded-lg border p-3 text-sm ${posLookupResult.found ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/80"}`}>
                        {posLookupResult.found && posLookupResult.product && posLookupResult.variant ? (
                          <>
                            <div className="flex items-start gap-3">
                              {posLookupResult.product.image ? <img src={posLookupResult.product.image} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-slate-200" /> : <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-xs flex-shrink-0">No photo</div>}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800">{posLookupResult.product.name}</p>
                                <p className="text-slate-600 mt-0.5">
                                  {posLookupResult.variant.sku}
                                  {posLookupResult.variant.size != null ? ` — ${posLookupResult.variant.size}` : ""}
                                </p>
                                <p className="text-sm font-semibold text-slate-900 mt-0.5">{(posLookupResult.variant.price ?? 0).toLocaleString("vi-VN")} VND</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {(posLookupResult.stock_quantity ?? 0) > 0 ? `${m.inStock}: ${posLookupResult.stock_quantity}` : m.outOfStock}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <label className="text-xs text-slate-600">{m.quantity}</label>
                                  <input type="number" min={1} value={posAddQty} onChange={(e) => setPosAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-14 px-2 py-1 rounded border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const qty = Math.max(1, posAddQty);
                                      setPosCart((c) => [...c, { sku: posLookupResult.variant!.sku, name: posLookupResult.product!.name, quantity: qty, price: posLookupResult.variant!.price, variant_id: posLookupResult.variant!.id, image: posLookupResult.product!.image ?? undefined }]);
                                      setPosSkuInput("");
                                      setPosLookupResult(null);
                                      setPosAddQty(1);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                                  >
                                    {m.addToCart}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-amber-800">{m.skuOrBarcodeNotFound}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">{m.cart}</p>
                    {posCart.length === 0 ? <p className="text-xs text-slate-500">Empty</p> : (
                      <ul className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                        {posCart.map((item, i) => (
                          <li key={`${item.sku}-${i}`} className="flex items-center gap-2 text-xs text-slate-800">
                            {item.image ? <img src={item.image} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" /> : null}
                            <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                            <span className="font-medium text-slate-900">{(item.quantity * item.price).toLocaleString("vi-VN")} VND</span>
                            <button type="button" onClick={() => setPosCart((c) => c.filter((_, j) => j !== i))} className="text-red-600 hover:underline">{m.remove}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {posCart.length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-slate-900">{m.total}: {posCart.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString("vi-VN")} VND</p>
                        <button type="button" onClick={() => { setPosPaymentModalOpen(true); setPosPaymentMethod("vietqr"); setPosQrUrl(null); setPosPendingTransactionId(null); }} disabled={posCheckoutLoading} className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60">{m.checkout}</button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
          )}

          {/* TAB: INVENTORY */}
          {adminTab === "inventory" && (
          <section className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6 space-y-6">
            {inventoryActionMessage && <p className="text-sm text-emerald-600">{inventoryActionMessage}</p>}
            {inventoryCreateError && <p className="text-sm text-red-600">{inventoryCreateError}</p>}
            {/* 1) Scan Product — barcode triggers lookup or Create Product */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{m.scanProduct}</h4>
              <p className="text-xs text-slate-400 mb-2">{m.scanProductHint}</p>
              <div className="flex gap-2">
                <input
                  placeholder={m.barcode}
                  value={inventoryScannedBarcode}
                  onChange={(e) => setInventoryScannedBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const b = inventoryScannedBarcode.trim();
                      if (!b) return;
                      setInventoryCreateError(null);
                      adminFetch(`/api/admin/variants/by-barcode?barcode=${encodeURIComponent(b)}`)
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.found && d.variant && d.product) {
                            setScannedVariant(d.variant);
                            setScannedProduct(d.product);
                            setNewProductBarcode("");
                            setInventoryScannedBarcode("");
                            setTimeout(() => inventoryQtyInputRef.current?.focus(), 100);
                          } else {
                            setScannedVariant(null);
                            setScannedProduct(null);
                            setNewProductBarcode(b);
                            setNewProductCode(b);
                            setInventoryScannedBarcode("");
                          }
                        })
                        .catch(() => setInventoryCreateError("Lookup failed."));
                    }
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
                <button type="button" onClick={() => { setInventoryCreateError(null); setBarcodeScannerOpen(true); }} className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-500 bg-slate-600 text-slate-100 text-sm font-medium hover:bg-slate-500">{m.scanBarcode}</button>
              </div>
            </div>

            {/* 2) Product Info + Variant + Quantity + Stock In/Out — when barcode found */}
            {scannedVariant && scannedProduct && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.productInfo}</h4>
                <p className="text-sm font-medium text-slate-800">{scannedProduct.name}{scannedProduct.brand ? ` · ${scannedProduct.brand}` : ""} · {scannedProduct.category}</p>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.variantSize}</h4>
                <p className="text-sm text-slate-700">SKU: {scannedVariant.sku}{scannedVariant.size ? ` · Size ${scannedVariant.size}` : ""} · {m.price}: {(scannedVariant.price ?? 0).toLocaleString()} VND</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-xs font-medium text-slate-700">{m.quantity}</label>
                  <input ref={inventoryQtyInputRef} type="number" min={1} value={inventoryQty} onChange={(e) => setInventoryQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button type="button" onClick={async () => {
                    const qty = parseInt(inventoryQty, 10) || 1;
                    const res = await adminFetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: scannedVariant.id, quantity: qty }) });
                    const d = await res.json();
                    if (res.ok && d.ok) { setInventoryActionMessage(locale === "vi" ? "Đã nhập kho." : "Stock in recorded."); setInventoryQty("1"); adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? [])); setTimeout(() => setInventoryActionMessage(null), 3000); } else setInventoryCreateError(d?.error ?? "Failed");
                  }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500">{m.stockIn}</button>
                  <button type="button" onClick={async () => {
                    const qty = parseInt(inventoryQty, 10) || 1;
                    const res = await adminFetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: scannedVariant.id, quantity: qty }) });
                    const d = await res.json();
                    if (res.ok && d.ok) { setInventoryActionMessage(locale === "vi" ? "Đã xuất kho." : "Stock out recorded."); setInventoryQty("1"); adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? [])); setTimeout(() => setInventoryActionMessage(null), 3000); } else setInventoryCreateError(d?.error ?? "Failed");
                  }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500">{m.stockOut}</button>
                  <button type="button" onClick={() => { setScannedVariant(null); setScannedProduct(null); setInventoryQty("1"); }} className="text-xs text-slate-500 underline">{m.cancel}</button>
                </div>
              </div>
            )}

            {/* 3) Create Product — when barcode not found */}
            {!scannedVariant && newProductBarcode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.createProduct}</h4>
                <p className="text-xs text-slate-600">{m.createProductHint}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <input placeholder={m.barcode} value={newProductBarcode} onChange={(e) => setNewProductBarcode(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <input placeholder={m.productName} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <input placeholder={m.brand} value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <input placeholder={m.productCode} value={newProductCode} onChange={(e) => setNewProductCode(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <div className="col-span-full flex items-center gap-3">
                    <input ref={newProductPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f || !/^image\/(jpeg|png|webp)$/i.test(f.type)) return; const r = new FileReader(); r.onload = () => setNewProductImageDataUrl(r.result as string); r.readAsDataURL(f); e.target.value = ""; }} />
                    {newProductImageDataUrl ? (
                      <div className="flex items-center gap-2">
                        <img src={newProductImageDataUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                        <button type="button" onClick={() => setNewProductImageDataUrl(null)} className="text-xs text-slate-600 hover:text-red-600 underline">{locale === "vi" ? "Xóa ảnh" : "Remove photo"}</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => newProductPhotoInputRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                        {locale === "vi" ? "Chụp ảnh sản phẩm" : "Take product photo"}
                      </button>
                    )}
                  </div>
                  <select value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value as "shoes" | "chalk" | "merch" | "rental")} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400">
                    <option value="shoes">Shoes</option>
                    <option value="chalk">Chalk</option>
                    <option value="merch">Merch</option>
                    <option value="rental">Rental</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">{m.variantSizes}</p>
                  {newVariants.map((nv, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center mb-2">
                      <input placeholder="Size" value={nv.size} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, size: e.target.value } : x))} className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                      <input placeholder={m.barcode} value={nv.barcode} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, barcode: e.target.value } : x))} className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                      <input placeholder={m.price} value={nv.price} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" />
                      <input placeholder={m.cost} value={nv.cost} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, cost: e.target.value } : x))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" />
                      <input placeholder={m.quantity} value={nv.quantity} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" type="number" min="0" title={locale === "vi" ? "Số lượng nhập kho ngay" : "Initial stock (no separate Stock In needed)"} />
                      <button type="button" onClick={() => setNewVariants((v) => v.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-600 text-xs">{m.remove}</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewVariants((v) => [...v, { size: "", barcode: "", price: "", cost: "", quantity: "1" }])} className="text-xs text-slate-600 underline">{m.addSize}</button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={async () => {
                    if (!newProductName.trim() || !newProductCode.trim()) { setInventoryCreateError(locale === "vi" ? "Nhập tên và mã sản phẩm." : "Enter name and product code."); return; }
                    const variantsToCreate = newVariants.filter((v) => v.size.trim() || v.price.trim() || v.barcode.trim()).map((v) => ({ size: v.size.trim() || null, barcode: v.barcode.trim() || null, price: parseInt(v.price, 10) || 0, cost: parseInt(v.cost, 10) || 0, quantity: Math.max(0, parseInt(v.quantity, 10) || 0) }));
                    if (variantsToCreate.length === 0) { setInventoryCreateError(locale === "vi" ? "Thêm ít nhất một size/phiên bản." : "Add at least one variant."); return; }
                    setInventoryCreateError(null);
                    try {
                      let imageUrl: string | null = null;
                      if (newProductImageDataUrl) {
                        const upRes = await adminFetch("/api/admin/upload/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: newProductImageDataUrl }) });
                        const upData = await upRes.json();
                        if (upRes.ok && upData.url) imageUrl = upData.url;
                      }
                      const res = await adminFetch("/api/admin/products/with-variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newProductName.trim(), brand: newProductBrand.trim() || null, category: newProductCategory, image: imageUrl, product_code: newProductCode.trim().toUpperCase(), variants: variantsToCreate }) });
                      const d = await res.json();
                      if (res.ok && d.product) {
                        setInventoryActionMessage(locale === "vi" ? "Đã tạo sản phẩm và các phiên bản." : "Product and variants created.");
                        setNewProductName(""); setNewProductBrand(""); setNewProductCode(""); setNewProductBarcode(""); setNewProductImageDataUrl(null); setNewVariants([{ size: "", barcode: "", price: "", cost: "", quantity: "1" }]);
                        adminFetch("/api/admin/products").then((r) => r.json()).then((x) => setProducts(x.products ?? []));
                        adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                        setTimeout(() => setInventoryActionMessage(null), 3000);
                      } else setInventoryCreateError(d?.error ?? "Failed");
                    } catch (e) { setInventoryCreateError("Request failed. Run migration 031_product_variants_barcode_first.sql if needed."); }
                  }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700">{m.createProduct}</button>
                  <button type="button" onClick={() => { setNewProductBarcode(""); setNewProductName(""); setNewProductBrand(""); setNewProductCode(""); setNewProductImageDataUrl(null); setNewVariants([{ size: "", barcode: "", price: "", cost: "", quantity: "1" }]); setInventoryCreateError(null); }} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 text-slate-700">{m.cancel}</button>
                </div>
              </div>
            )}

            <BarcodeScannerModal open={barcodeScannerOpen} onClose={() => setBarcodeScannerOpen(false)} onScanned={(raw) => {
              setBarcodeScannerOpen(false);
              const b = raw.trim();
              if (!b) return;
              setInventoryCreateError(null);
              adminFetch(`/api/admin/variants/by-barcode?barcode=${encodeURIComponent(b)}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.found && d.variant && d.product) {
                    setScannedVariant(d.variant);
                    setScannedProduct(d.product);
                    setNewProductBarcode("");
                    setInventoryScannedBarcode("");
                    setTimeout(() => inventoryQtyInputRef.current?.focus(), 100);
                  } else {
                    setScannedVariant(null);
                    setScannedProduct(null);
                    setNewProductBarcode(b);
                    setNewProductCode(b);
                    setInventoryScannedBarcode("");
                  }
                })
                .catch(() => setInventoryCreateError("Lookup failed."));
            }} onError={(msg) => setInventoryCreateError(msg)} title={m.scanProduct} hint={m.scanProductHint} />

            {/* 4) View Inventory — table, filter All/Shoes/Merch only, sorted by qty*price desc */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{m.viewInventory}</h4>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(["all", "shoes", "merch"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInventoryCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${inventoryCategoryFilter === cat ? "bg-slate-600 text-white" : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80"}`}
                  >
                    {cat === "all" ? (locale === "vi" ? "Tất cả" : "All") : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              {inventoryList.length === 0 && <p className="text-sm text-slate-500">{m.loading}</p>}
              <div className="border border-slate-600 rounded-lg overflow-x-auto text-sm -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-700/80 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <th className="px-3 py-2 border-b border-slate-600">{locale === "vi" ? "Loại" : "Type"}</th>
                      <th className="px-3 py-2 border-b border-slate-600">{locale === "vi" ? "SKU / Tên / Size" : "SKU / Name / Size"}</th>
                      <th className="px-3 py-2 border-b border-slate-600 text-right">{m.quantity}</th>
                      <th className="px-3 py-2 border-b border-slate-600 text-right">{m.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...inventoryList]
                      .sort((a, b) => (b.quantity * (b.variant?.price ?? 0)) - (a.quantity * (a.variant?.price ?? 0)))
                      .map((inv) => (
                        <tr
                          key={inv.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setProductDetailProductId(inv.product?.id ?? null); setProductDetailData(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProductDetailProductId(inv.product?.id ?? null); setProductDetailData(null); } }}
                          className="hover:bg-slate-700/50 cursor-pointer border-b border-slate-600 last:border-b-0"
                        >
                          <td className="px-3 py-2 text-slate-300">{inv.product?.category === "shoes" ? (locale === "vi" ? "Giày" : "Shoes") : inv.product?.category === "merch" ? "Merch" : (inv.product?.category ? inv.product.category.charAt(0).toUpperCase() + inv.product.category.slice(1) : "—")}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              {inv.product?.image ? <img src={inv.product.image} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" /> : null}
                              <span className="text-slate-200">{(inv.variant?.sku ?? "")} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-100">{inv.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{(inv.variant?.price ?? 0).toLocaleString("vi-VN")} VND</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock In/Out — dropdown of SKUs */}
            <div className="border-t border-slate-600 pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{m.stockIn} / {m.stockOut}</h4>
              <div className="flex gap-2 flex-wrap items-center">
                <select value={stockInSku} onChange={(e) => setStockInSku(e.target.value)} className="flex-1 min-w-0 max-w-xs px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                  <option value="">{locale === "vi" ? "Chọn SKU..." : "Select SKU..."}</option>
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.variant?.barcode ?? inv.variant?.sku ?? ""}>
                      {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={stockInQty} onChange={(e) => setStockInQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" onClick={async () => { const v = stockInSku.trim(); if (!v) return; const res = await adminFetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: v, quantity: parseInt(stockInQty, 10) || 1 }) }); const d = await res.json(); if (res.ok && d.ok) { setInventoryActionMessage(locale === "vi" ? "Đã nhập kho." : "Stock in recorded."); setStockInSku(""); setStockInQty("1"); adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? [])); setTimeout(() => setInventoryActionMessage(null), 3000); } else setInventoryCreateError(d?.error ?? "Failed"); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500">{m.stockIn}</button>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <select value={stockOutSku} onChange={(e) => setStockOutSku(e.target.value)} className="flex-1 min-w-0 max-w-xs px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                  <option value="">{locale === "vi" ? "Chọn SKU..." : "Select SKU..."}</option>
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.variant?.barcode ?? inv.variant?.sku ?? ""}>
                      {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={stockOutQty} onChange={(e) => setStockOutQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" onClick={async () => { const v = stockOutSku.trim(); if (!v) return; const res = await adminFetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: v, quantity: parseInt(stockOutQty, 10) || 1 }) }); const d = await res.json(); if (res.ok && d.ok) { setInventoryActionMessage(locale === "vi" ? "Đã xuất kho." : "Stock out recorded."); setStockOutSku(""); setStockOutQty("1"); adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? [])); setTimeout(() => setInventoryActionMessage(null), 3000); } else setInventoryCreateError(d?.error ?? "Failed"); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500">{m.stockOut}</button>
              </div>
            </div>
          </section>
          )}

          {/* TAB: ADMIN TOOLS */}
          {adminTab === "admin_tools" && (
          <section className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] gap-8 items-start">
            <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-5">
              <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                {m.adminTools}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMemberForm(true);
                    setTimeout(() => document.getElementById("new-member-form")?.scrollIntoView({ behavior: "smooth" }), 50);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.addNewMember}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (foundMember) {
                      setPaymentPlanId("day_pass");
                      handlePaymentPlanChange("day_pass");
                      setPaymentModalOpen(true);
                    } else {
                      setActionError(m.searchMemberFirstDayPass);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.generateDayPass}
                </button>
                <button
                  type="button"
                  onClick={() => setToolsModal("checkins")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.recentCheckins}
                </button>
                <button
                  type="button"
                  onClick={() => setToolsModal("occupancy")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.viewGymOccupancy}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/${locale}/countdown`, "_blank")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.viewLeaderboard}
                </button>
                <button
                  type="button"
                  onClick={() => setToolsModal("revenue")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-left"
                >
                  {m.revenue}
                </button>
              </div>
            </div>

            {showNewMemberForm && (
            <div id="new-member-form" className="rounded-2xl bg-white/95 border border-slate-200 shadow-[0_10px_32px_rgba(15,23,42,0.08)] p-4 md:p-5">
              <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase mb-3">
                {m.newMember}
              </h3>
              <form className="space-y-3" onSubmit={handleCreateMember}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-700">
                    {m.name}
                    <input
                      type="text"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs md:text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-xs text-slate-700">
                    {m.email}
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
                    {m.createMember}
                  </button>
                </div>
              </form>
            </div>
            )}
          </section>
          )}

          {/* TAB: OPERATIONS (Staff Operations) */}
          {adminTab === "operations" && (
            <section className="rounded-2xl bg-white/80 border border-slate-200 shadow-[0_12px_35px_rgba(15,23,42,0.07)] p-4 md:p-6">
              <h2 className="text-lg font-semibold text-slate-900">{m.staffOperations}</h2>
              <p className="text-sm text-slate-600 mt-1">{locale === "vi" ? "Xem bảng Staff Operations phía trên." : "Staff Operations is open above."}</p>
            </section>
          )}
        </div>
      </main>

      {/* Admin Tools Modals */}
      {toolsModal === "occupancy" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{m.gymOccupancy}</h3>
              <button type="button" onClick={() => setToolsModal(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <p className="text-4xl font-bold text-slate-900">{gymOccupancy}</p>
            <p className="text-sm text-slate-500 mt-1">{m.climbersInsideLast2h}</p>
          </div>
        </div>
      )}

      {toolsModal === "checkins" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{m.recentCheckins} (7 {m.day}s)</h3>
              <button type="button" onClick={() => setToolsModal(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {!checkinsData && <p className="text-sm text-slate-500">{m.loading}</p>}
              {checkinsData && Object.keys(checkinsData.byDay).length === 0 && (
                <p className="text-sm text-slate-500">{m.noCheckins7Days}</p>
              )}
              {checkinsData && Object.entries(checkinsData.byDay)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, items]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      {formatInGymTZ(date + "T12:00:00.000Z", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((c) => (
                        <li key={(c as { id?: string }).id ?? c.timestamp} className="flex justify-between items-center text-sm py-1.5 px-3 rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-800">{c.member_name}</span>
                          <span className="text-slate-500 text-xs">
                            {formatInGymTZ(c.timestamp, { hour: "numeric", minute: "2-digit" })}
                            {c.member_code && ` • ${c.member_code}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {toolsModal === "revenue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{m.revenue}</h3>
              <button type="button" onClick={() => setToolsModal(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                {(["day", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRevenuePeriod(p)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      revenuePeriod === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {p === "day" ? m.today : p === "week" ? m.thisWeek : m.thisMonth}
                  </button>
                ))}
              </div>
              {!revenueData && <p className="text-sm text-slate-500">{m.loading}</p>}
              {revenueData && (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {revenueData.total.toLocaleString("vi-VN")} VND
                  </p>
                  {Object.keys(revenueData.byPlan).length > 0 && (
                    <div className="space-y-1.5 text-sm">
                      <p className="font-medium text-slate-600">{m.byPlan}</p>
                      {Object.entries(revenueData.byPlan).map(([plan, amt]) => (
                        <div key={plan} className="flex justify-between">
                          <span className="text-slate-700">{plan}</span>
                          <span className="font-medium">{amt.toLocaleString("vi-VN")} VND</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase mb-2">{m.payments}</p>
                    {revenueData.payments.length === 0 && (
                      <p className="text-sm text-slate-500">{m.noPaymentsInPeriod}</p>
                    )}
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {revenueData.payments.map((p) => (
                        <li key={p.id ?? p.created_at} className="flex justify-between text-xs py-1">
                          <span>{p.plan_name} — {p.method}</span>
                          <span>{p.amount.toLocaleString("vi-VN")} VND</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toolsModal === "staff" && (
        <div className={`fixed inset-0 ${adminTab === "operations" ? "z-10" : "z-50"} flex items-center justify-center ${adminTab === "operations" ? "bg-transparent p-0" : "bg-black/50 p-4"}`}>
          <div className={`bg-white rounded-2xl shadow-xl w-full max-h-[90vh] flex flex-col ${adminTab === "operations" ? "max-w-[1100px] h-[calc(100vh-96px)] mt-24" : "max-w-2xl"}`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{m.staffOperations}</h3>
              {adminTab !== "operations" && (
                <button type="button" onClick={() => setToolsModal(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
              )}
            </div>
            <div className="flex gap-1 p-2 border-b bg-slate-50 flex-wrap">
              {(["overview", "tasks", "attendance", "coaching", "routes"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setStaffModalTab(tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${staffModalTab === tab ? "bg-white shadow border border-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}>
                  {tab === "overview" ? m.staffTabOverview : tab === "tasks" ? m.staffTabTasks : tab === "attendance" ? m.staffTabAttendance : tab === "coaching" ? m.staffTabCoaching : m.staffTabRoutes}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {!staffOpsData && staffModalTab !== "attendance" && <p className="text-sm text-slate-500">{m.loading}</p>}

              {/* TAB 1 — OVERVIEW */}
              {staffModalTab === "overview" && staffOpsData && (() => {
                const sum = staffOpsData.summary;
                const req = sum.staff_required ?? 3;
                const present = sum.staff_in_today ?? 0;
                const preOpenDone = sum.pre_open_completed ?? 0;
                const preOpenTotal = sum.pre_open_total ?? 0;
                const closingOver = sum.closing_overdue ?? 0;
                const zonesOver = sum.zones_overdue ?? 0;
                const unassigned = sum.unassigned_sessions ?? 0;
                const staffStatus = present >= req ? "green" : present >= req - 1 ? "yellow" : "red";
                const preOpenStatus = preOpenTotal === 0 ? "green" : preOpenDone >= preOpenTotal ? "green" : preOpenDone >= preOpenTotal - 1 ? "yellow" : "red";
                const phase = staffOpsData.phase ?? {};
                const currentPhaseLabel = phase.phase_label ?? "Gym Open";
                const countdownMessage = phase.countdown_message ?? "";
                const currentPhaseTasks = staffOpsData.currentPhaseTasks ?? [];
                const phaseCompleted = currentPhaseTasks.filter((t: { status: string }) => t.status === "completed").length;
                const phaseTotal = currentPhaseTasks.length;
                const gymReady = staffOpsData.gym_ready === true;
                const routeResetDay = staffOpsData.route_reset_day === true;
                const sessionsToday = staffOpsData.sessionsToday ?? staffOpsData.sessions ?? [];
                const nowIso = new Date().toISOString();
                const alerts: string[] = [];
                staffOpsData.preOpen?.forEach((t: { status: string; due_time?: string | null; title: string }) => {
                  if (t.status !== "completed" && t.due_time) {
                    const due = String(t.due_time).slice(0, 5);
                    const now = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }).slice(0, 5);
                    const [dh, dm] = due.split(":").map(Number);
                    const [nh, nm] = now.split(":").map(Number);
                    const minOver = (nh * 60 + nm) - (dh * 60 + dm);
                    if (minOver > 0) alerts.push(`${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${locale === "vi" ? "phút" : "min"})`);
                  }
                });
                staffOpsData.closing?.forEach((t: { status: string; due_time?: string | null; title: string }) => {
                  if (t.status !== "completed" && t.due_time) {
                    const due = String(t.due_time).slice(0, 5);
                    const now = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }).slice(0, 5);
                    const [dh, dm] = due.split(":").map(Number);
                    const [nh, nm] = now.split(":").map(Number);
                    const minOver = (nh * 60 + nm) - (dh * 60 + dm);
                    if (minOver > 0) alerts.push(`${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${locale === "vi" ? "phút" : "min"})`);
                  }
                });
                staffOpsData.zones?.filter((z: { overdue?: boolean }) => z.overdue).forEach((z: { name: string }) => alerts.push(`${z.name} ${locale === "vi" ? "reset quá hạn" : "reset overdue"}`));
                if (unassigned > 0) alerts.push(`${unassigned} ${locale === "vi" ? "buổi coaching chưa giao" : "coaching sessions unassigned"}`);
                const staffIn = staffOpsData.attendance?.in ?? [];
                const getStaffName = (a: { staff_profiles?: { display_name?: string; email?: string } | unknown }) => {
                  const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles;
                  return ((p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email) ?? "—";
                };
                const staffIdInSessionNow = new Set<string>();
                for (const s of sessionsToday) {
                  if (!s.coach_id || !s.end_time) continue;
                  if (s.start_time <= nowIso && s.end_time >= nowIso) staffIdInSessionNow.add(s.coach_id);
                }
                const phaseTaskLabel = phase.current_phase === "pre_open" ? (locale === "vi" ? "Công việc trước mở cửa" : "Pre-Open Tasks") : phase.current_phase === "closing" ? (locale === "vi" ? "Công việc đóng cửa" : "Closing Tasks") : (locale === "vi" ? "Công việc trong giờ" : "Gym Open Tasks");
                const routeLabel = locale === "vi" ? "Reset tường" : "Route Reset";
                const coachingLabel = locale === "vi" ? "Buổi coaching" : "Coaching Session";
                return (
                  <>
                    <div className="flex justify-end">
                      <button type="button" disabled={staffResetLoading} onClick={async () => { setStaffResetLoading(true); try { const r = await adminFetch("/api/admin/staff/reset-attendance", { method: "POST" }); const d = await r.json(); if (r.ok) { setActionMessage(locale === "vi" ? "Đã xóa chấm công hôm nay." : "Today's staff attendance reset."); adminFetch("/api/admin/staff").then((res) => res.json()).then((data) => setStaffOpsData(data)).catch(() => setStaffOpsData(null)); } else setActionError(d?.error || "Failed"); } catch { setActionError("Failed"); } finally { setStaffResetLoading(false); } }} className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50">{staffResetLoading ? "…" : (locale === "vi" ? "Xóa chấm công (test)" : "Reset attendance (test)")}</button>
                    </div>
                    {/* CURRENT PHASE — top */}
                    <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{m.currentPhase}</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{currentPhaseLabel} Phase</p>
                      {countdownMessage && <p className="text-sm text-slate-600 mt-1">{countdownMessage}</p>}
                    </div>
                    {/* ROUTE RESET DAY banner */}
                    {routeResetDay && (
                      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
                        <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{m.routeResetDay}</p>
                        <p className="text-sm text-amber-800 mt-1">{m.routeResetDayBanner}</p>
                        {staffOpsData.zones?.filter((z: { overdue?: boolean; next_reset_at?: string | null }) => z.overdue || (z.next_reset_at && getGymDateFromISO(z.next_reset_at) === getGymToday())).map((z: { name: string }) => (
                          <span key={z.name} className="inline-block mt-1 mr-2 text-sm font-medium text-amber-900">{z.name}</span>
                        ))}
                      </div>
                    )}
                    {/* OPERATIONS HEALTH */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className={`rounded-lg border p-2 ${staffStatus === "green" ? "bg-emerald-50 border-emerald-200" : staffStatus === "yellow" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                        <p className="text-[11px] font-semibold text-slate-600 uppercase">{m.staffPresent}</p>
                        <p className="text-sm font-bold text-slate-800">{present} / {req}</p>
                      </div>
                      <div className={`rounded-lg border p-2 ${preOpenStatus === "green" ? "bg-emerald-50 border-emerald-200" : preOpenStatus === "yellow" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                        <p className="text-[11px] font-semibold text-slate-600 uppercase">{m.preOpenTasks}</p>
                        <p className="text-sm font-bold text-slate-800">{preOpenDone} / {preOpenTotal}</p>
                      </div>
                      <div className={`rounded-lg border p-2 ${closingOver === 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                        <p className="text-[11px] font-semibold text-slate-600 uppercase">{m.closingTasksOverdue}</p>
                        <p className="text-sm font-bold text-slate-800">{closingOver} {locale === "vi" ? "quá hạn" : "overdue"}</p>
                      </div>
                      <div className={`rounded-lg border p-2 ${zonesOver === 0 ? "bg-emerald-50 border-emerald-200" : zonesOver > 1 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                        <p className="text-[11px] font-semibold text-slate-600 uppercase">{m.routeResetsOverdue}</p>
                        <p className="text-sm font-bold text-slate-800">{zonesOver} {locale === "vi" ? "quá hạn" : "overdue"}</p>
                      </div>
                      <div className={`rounded-lg border p-2 ${unassigned === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <p className="text-[11px] font-semibold text-slate-600 uppercase">{m.unassignedCoaching}</p>
                        <p className="text-sm font-bold text-slate-800">{unassigned}</p>
                      </div>
                    </div>
                    {/* CURRENT PHASE TASK PROGRESS */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.currentPhaseTaskProgress}</h4>
                      <div className="mb-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: phaseTotal ? `${(100 * phaseCompleted) / phaseTotal}%` : "0%" }} />
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-2">{phaseCompleted} / {phaseTotal} {locale === "vi" ? "công việc đã xong" : "tasks completed"}</p>
                      <ul className="space-y-1.5 text-sm">
                        {currentPhaseTasks.map((t) => {
                          const c = Array.isArray(t.completer) ? t.completer[0] : t.completer;
                          const name = c ? (c.display_name || c.email) : null;
                          return (
                            <li key={t.id} className="flex items-center gap-2">
                              {t.status === "completed" ? <span className="text-emerald-600">✔</span> : <span className="text-amber-600">⚠</span>}
                              <span className={t.status === "completed" ? "text-slate-600" : "text-slate-800"}>{t.title}</span>
                              {t.status === "completed" && name && <span className="text-slate-500 text-xs">{locale === "vi" ? "bởi" : "by"} {name}</span>}
                              {t.status !== "completed" && <span className="text-amber-600 text-xs">{m.tasksPendingLabel}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {/* PHASE READINESS */}
                    {(phase.current_phase === "pre_open" || phase.current_phase === "gym_open") && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.phaseReadiness}</h4>
                        <p className="text-sm text-slate-600 mb-1">{locale === "vi" ? "An toàn: Kiểm tra bolt, thảm, giày thuê" : "Safety tasks: Inspect anchors, Inspect crash pads, Check rental shoes"}</p>
                        <p className={`font-semibold ${gymReady ? "text-emerald-700" : "text-red-700"}`}>{gymReady ? "🟢 " + m.gymReady : "🔴 " + m.gymNotReady}</p>
                      </div>
                    )}
                    {/* OPERATIONS ALERTS */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.operationsAlerts}</h4>
                      {alerts.length === 0 ? <p className="text-sm text-slate-600">{m.noOperationalAlerts}</p> : <ul className="space-y-1 text-sm text-amber-800">{alerts.map((a, i) => <li key={i}>⚠ {a}</li>)}</ul>}
                    </div>
                    {/* STAFF ACTIVITY FEED */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.staffActivityFeed}</h4>
                      {(!staffOpsData.timeline || staffOpsData.timeline.length === 0) ? <p className="text-sm text-slate-500">{locale === "vi" ? "Chưa có sự kiện." : "No events yet."}</p> : (
                        <ul className="space-y-1 text-sm">
                          {staffOpsData.timeline.map((e: { id: string; completed_at: string; staff_name: string; task_title: string }) => (
                            <li key={e.id} className="text-slate-700">
                              {formatInGymTZ(e.completed_at, { hour: "2-digit", minute: "2-digit" })} — {e.staff_name} {locale === "vi" ? "hoàn thành" : "completed"} {e.task_title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {/* STAFF FOCUS PANEL */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.staffFocusPanel}</h4>
                      {staffIn.length === 0 ? <p className="text-sm text-slate-500">—</p> : (
                        <ul className="space-y-1 text-sm">
                          {staffIn.map((a: { staff_id: string; staff_profiles?: unknown }) => {
                            const name = getStaffName(a as { staff_profiles?: { display_name?: string; email?: string } | unknown });
                            const focus = staffIdInSessionNow.has(a.staff_id) ? coachingLabel : routeResetDay ? routeLabel : phaseTaskLabel;
                            return <li key={a.staff_id} className="text-slate-700"><span className="font-medium">{name}</span> → {focus}</li>;
                          })}
                        </ul>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* TAB 2 — TASKS */}
              {staffModalTab === "tasks" && staffOpsData && (() => {
                const preOpen = staffOpsData.preOpen ?? staffOpsData.tasks.filter((t) => t.block === "pre_open");
                const during = staffOpsData.during ?? staffOpsData.tasks.filter((t) => t.block === "during_hours");
                const closing = staffOpsData.closing ?? staffOpsData.tasks.filter((t) => t.block === "closing");
                const allByPhase: { phase: string; phaseLabel: string; tasks: typeof preOpen }[] = [
                  { phase: "pre_open", phaseLabel: m.preOpenSection, tasks: preOpen },
                  { phase: "during_hours", phaseLabel: m.duringHoursSection, tasks: during },
                  { phase: "closing", phaseLabel: m.closingSection, tasks: closing },
                ];
                const nowHHMM = () => { const t = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }); return t.slice(0, 5); };
                const isOverdue = (t: { status: string; due_time?: string | null }) => {
                  if (t.status === "completed") return false;
                  const due = t.due_time ? String(t.due_time).slice(0, 5) : null;
                  if (!due) return false;
                  const [dh, dm] = due.split(":").map(Number);
                  const [nh, nm] = nowHHMM().split(":").map(Number);
                  return (nh * 60 + nm) > (dh * 60 + dm);
                };
                return (
                  <>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase"><th className="px-3 py-2">{locale === "vi" ? "Công việc" : "Task Name"}</th><th className="px-3 py-2">{m.phaseColumn}</th><th className="px-3 py-2">{locale === "vi" ? "Trạng thái" : "Status"}</th><th className="px-3 py-2">{m.completedBy}</th><th className="px-3 py-2">{m.completionTime}</th></tr></thead>
                        <tbody>
                          {allByPhase.flatMap(({ phaseLabel, tasks: phaseTasks }) =>
                            phaseTasks.map((t) => {
                              const c = Array.isArray(t.completer) ? t.completer[0] : t.completer;
                              const name = c ? (c.display_name || c.email) : null;
                              const overdue = isOverdue(t);
                              const statusText = t.status === "completed" ? m.done : overdue ? m.overdue : m.pending;
                              const statusColor = t.status === "completed" ? "text-emerald-700" : overdue ? "text-red-700" : "text-amber-700";
                              return (
                                <tr key={t.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2 font-medium text-slate-800">{t.title}</td>
                                  <td className="px-3 py-2 text-slate-600">{phaseLabel}</td>
                                  <td className={`px-3 py-2 font-medium ${statusColor}`}>{statusText}</td>
                                  <td className="px-3 py-2 text-slate-600">{name ?? "—"}</td>
                                  <td className="px-3 py-2 text-slate-600">{t.completed_at ? formatInGymTZ(t.completed_at, { hour: "numeric", minute: "2-digit" }) : "—"}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {staffOpsData.staffTaskPerformance && staffOpsData.staffTaskPerformance.length > 0 && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.staffTaskPerformance}</h4>
                        <ul className="space-y-2 text-sm">
                          {staffOpsData.staffTaskPerformance.map((s: { staff_id: string; display_name: string; tasks_completed: number; completion_rate_pct: number }) => (
                            <li key={s.staff_id} className="flex justify-between items-center"><span className="font-medium text-slate-800">{s.display_name}</span><span className="text-slate-600">{m.tasksCompletedCount}: {s.tasks_completed} · {s.completion_rate_pct}% {m.completionRate}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* TAB 3 — ATTENDANCE */}
              {staffModalTab === "attendance" && (
                <>
                  {staffOpsData && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.todaysAttendance}</h4>
                      <p className="text-sm text-slate-700 mb-1"><strong>IN:</strong> {staffOpsData.attendance.in.map((a: { staff_profiles?: { display_name?: string; email?: string } | unknown }) => { const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles; return ((p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email) ?? "—"; }).join(", ") || "—"}</p>
                      <p className="text-sm text-slate-700"><strong>NOT IN:</strong> {staffOpsData.attendance.out.map((a: { staff_profiles?: { display_name?: string; email?: string } | unknown }) => { const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles; return ((p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email) ?? "—"; }).join(", ") || "—"}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.monthlyAttendanceSection}</h4>
                    <p className="text-sm font-medium text-slate-700 mb-2">{m.currentMonth}: {monthlyAttendanceData?.label ?? "—"}</p>
                    {!monthlyAttendanceData && <p className="text-sm text-slate-500">{m.loading}</p>}
                    {monthlyAttendanceData && monthlyAttendanceData.staff.length === 0 && <p className="text-sm text-slate-500">{m.noSessions}</p>}
                    {monthlyAttendanceData && monthlyAttendanceData.staff.length > 0 && (
                      <ul className="space-y-2">
                        {monthlyAttendanceData.staff.map((s) => (
                          <li key={s.staff_id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-white border border-slate-100">
                            <span className="font-medium text-slate-800">{(s.display_name || s.email) ?? s.staff_id}</span>
                            <span className="text-slate-600 font-medium">{s.in_days} {m.inDays}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {/* TAB 4 — COACHING */}
              {staffModalTab === "coaching" && staffOpsData && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg border border-slate-200 p-2 text-center"><p className="text-[11px] text-slate-500 uppercase">{m.totalSessionsToday}</p><p className="font-bold text-slate-800">{(staffOpsData.sessionsToday ?? staffOpsData.sessions).length}</p></div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center"><p className="text-[11px] text-slate-600 uppercase">{m.assignedSessions}</p><p className="font-bold text-slate-800">{(staffOpsData.sessionsToday ?? staffOpsData.sessions).filter((s: { coach_id: string | null }) => s.coach_id).length}</p></div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-center"><p className="text-[11px] text-slate-600 uppercase">{m.unassignedSessions}</p><p className="font-bold text-slate-800">{staffOpsData.summary.unassigned_sessions ?? 0}</p></div>
                  </div>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase"><th className="px-3 py-2">{m.time}</th><th className="px-3 py-2">{m.wallArea}</th><th className="px-3 py-2">{m.coachAssigned}</th><th className="px-3 py-2">{locale === "vi" ? "Trạng thái" : "Status"}</th></tr></thead>
                      <tbody>
                        {((staffOpsData.sessionsToday ?? staffOpsData.sessions) as { id: string; start_time: string; coach_id: string | null; location?: string; staff_profiles?: { display_name?: string; email?: string } | unknown }[]).map((s) => {
                          const p = Array.isArray(s.staff_profiles) ? s.staff_profiles[0] : s.staff_profiles;
                          const name = (p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email;
                          return (
                            <tr key={s.id} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-800">{new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td><td className="px-3 py-2 text-slate-700">{s.location ?? "—"}</td><td className="px-3 py-2">{s.coach_id ? (name ?? m.assigned) : "—"}</td><td className="px-3 py-2">{s.coach_id ? <span className="text-emerald-700">{m.assigned}</span> : <span className="text-amber-700">⚠ {m.unassigned}</span>}</td></tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* TAB 5 — ROUTES */}
              {staffModalTab === "routes" && staffOpsData && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                        <th className="px-3 py-2">{m.wallZone}</th>
                        <th className="px-3 py-2">{m.nextResetDate}</th>
                        <th className="px-3 py-2">{locale === "vi" ? "Route age" : "Route age"}</th>
                        <th className="px-3 py-2">{locale === "vi" ? "Setters today" : "Setters today"}</th>
                        <th className="px-3 py-2">{locale === "vi" ? "Trạng thái" : "Status"}</th>
                        <th className="px-3 py-2 w-40">{locale === "vi" ? "Hành động" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffOpsData.zones.map((z) => {
                        const setters = (z.assigned_setters ?? []).map((s) => s.name).join(", ");
                        const age = typeof z.route_age_days === "number" ? z.route_age_days : null;
                        const status = z.reset_status ?? (setters ? "in_progress" : "pending");
                        return (
                          <tr key={z.id} className={`border-t border-slate-100 ${status === "overdue" ? "bg-red-50" : ""}`}>
                            <td className="px-3 py-2 font-medium text-slate-800">{z.name}</td>
                            <td className="px-3 py-2 text-slate-700">{z.next_reset_at ? new Date(z.next_reset_at).toLocaleDateString() : "—"}</td>
                            <td className="px-3 py-2 text-slate-700">{age === null ? "—" : `${age}d`}</td>
                            <td className="px-3 py-2 text-slate-700">{setters || "—"}</td>
                            <td className="px-3 py-2">
                              {status === "completed" ? (
                                <span className="text-emerald-700 font-semibold">Completed</span>
                              ) : status === "overdue" ? (
                                <span className="text-red-700 font-semibold">⚠ {m.overdue}</span>
                              ) : status === "in_progress" ? (
                                <span className="text-amber-700 font-semibold">In Progress</span>
                              ) : (
                                <span className="text-slate-600 font-semibold">Pending</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2 flex-wrap">
                                <details className="relative">
                                  <summary className="list-none cursor-pointer px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium">
                                    {locale === "vi" ? "Assign" : "Assign"}
                                  </summary>
                                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10">
                                    <p className="text-[11px] text-slate-500 uppercase font-semibold mb-2">{locale === "vi" ? "Setters" : "Setters"}</p>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {(staffOpsData.route_setters ?? []).map((p) => {
                                        const label = p.display_name || p.email || p.id;
                                        const checked = (z.assigned_setters ?? []).some((s) => s.staff_id === p.id);
                                        return (
                                          <label key={p.id} className="flex items-center gap-2 text-sm text-slate-800">
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={async (e) => {
                                                const nextIds = new Set((z.assigned_setters ?? []).map((s) => s.staff_id));
                                                if (e.target.checked) nextIds.add(p.id);
                                                else nextIds.delete(p.id);
                                                const res = await adminFetch(`/api/admin/routes/zones/${z.id}/assignments`, {
                                                  method: "PUT",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({ staff_ids: Array.from(nextIds) }),
                                                });
                                                const d = await res.json();
                                                if (res.ok && d?.ok) {
                                                  setStaffOpsData((prev) => prev ? ({
                                                    ...prev,
                                                    zones: prev.zones.map((zz) => (zz.id === z.id ? { ...zz, assigned_setters: d.assigned_setters } : zz)),
                                                  }) : prev);
                                                }
                                              }}
                                            />
                                            <span className="truncate">{label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </details>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await adminFetch(`/api/admin/routes/zones/${z.id}/reset`, { method: "POST" });
                                    const d = await res.json();
                                    if (res.ok && d?.ok) {
                                      adminFetch("/api/admin/staff").then((r) => r.json()).then((x) => setStaffOpsData(x));
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs font-medium hover:bg-slate-600"
                                >
                                  {m.markResetComplete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toolsModal === "inventory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{m.inventoryModule}</h3>
              <button type="button" onClick={() => setToolsModal(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-6">
              {inventoryActionMessage && <p className="text-sm text-emerald-600">{inventoryActionMessage}</p>}
              {inventoryCreateError && <p className="text-sm text-red-600">{inventoryCreateError}</p>}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.viewInventory}</h4>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(["all", "shoes", "merch"] as const).map((cat) => (
                    <button key={cat} type="button" onClick={() => setInventoryCategoryFilter(cat)} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${inventoryCategoryFilter === cat ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"}`}>
                      {cat === "all" ? (locale === "vi" ? "Tất cả" : "All") : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                {inventoryList.length === 0 && <p className="text-sm text-slate-500">{m.loading}</p>}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="px-3 py-2 border-b border-slate-200">{locale === "vi" ? "Loại" : "Type"}</th>
                        <th className="px-3 py-2 border-b border-slate-200">{locale === "vi" ? "SKU / Tên / Size" : "SKU / Name / Size"}</th>
                        <th className="px-3 py-2 border-b border-slate-200 text-right">{m.quantity}</th>
                        <th className="px-3 py-2 border-b border-slate-200 text-right">{m.price}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...inventoryList]
                        .sort((a, b) => (b.quantity * (b.variant?.price ?? 0)) - (a.quantity * (a.variant?.price ?? 0)))
                        .map((inv) => (
                          <tr
                            key={inv.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setToolsModal(null); setProductDetailProductId(inv.product?.id ?? null); setProductDetailData(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setToolsModal(null); setProductDetailProductId(inv.product?.id ?? null); setProductDetailData(null); } }}
                            className="hover:bg-slate-50 cursor-pointer border-b border-slate-200 last:border-b-0"
                          >
                            <td className="px-3 py-2 text-slate-700">{inv.product?.category === "shoes" ? (locale === "vi" ? "Giày" : "Shoes") : inv.product?.category === "merch" ? "Merch" : (inv.product?.category ? inv.product.category.charAt(0).toUpperCase() + inv.product.category.slice(1) : "—")}</td>
                            <td className="px-3 py-2">
                              <span className="flex items-center gap-2">
                                {inv.product?.image ? <img src={inv.product.image} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" /> : null}
                                <span>{(inv.variant?.sku ?? "")} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{inv.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{(inv.variant?.price ?? 0).toLocaleString("vi-VN")} VND</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-slate-600">Use the Inventory tab for scan-first workflow and creating products with variants. Click a row to view or edit product details.</p>
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.stockIn}</h4>
                <div className="flex gap-2 flex-wrap items-center">
                  <select value={stockInSku} onChange={(e) => setStockInSku(e.target.value)} className="flex-1 min-w-0 max-w-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400">
                    <option value="">{locale === "vi" ? "Chọn SKU..." : "Select SKU..."}</option>
                    {inventoryList.map((inv) => (
                      <option key={inv.id} value={inv.variant?.barcode ?? inv.variant?.sku ?? ""}>
                        {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={stockInQty} onChange={(e) => setStockInQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button
                    type="button"
                    onClick={async () => {
                      const v = stockInSku.trim();
                      if (!v) return;
                      const res = await adminFetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: v, quantity: parseInt(stockInQty, 10) || 1 }) });
                      const d = await res.json();
                      if (res.ok && d.ok) {
                        setInventoryActionMessage(locale === "vi" ? "Đã nhập kho." : "Stock in recorded.");
                        setStockInSku(""); setStockInQty("1");
                        adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                        setTimeout(() => setInventoryActionMessage(null), 3000);
                      } else setInventoryCreateError(d?.error ?? "Failed");
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {m.stockIn}
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{m.stockOut}</h4>
                <div className="flex gap-2 flex-wrap items-center">
                  <select value={stockOutSku} onChange={(e) => setStockOutSku(e.target.value)} className="flex-1 min-w-0 max-w-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400">
                    <option value="">{locale === "vi" ? "Chọn SKU..." : "Select SKU..."}</option>
                    {inventoryList.map((inv) => (
                      <option key={inv.id} value={inv.variant?.barcode ?? inv.variant?.sku ?? ""}>
                        {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={stockOutQty} onChange={(e) => setStockOutQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button
                    type="button"
                    onClick={async () => {
                      const v = stockOutSku.trim();
                      if (!v) return;
                      const res = await adminFetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: v, quantity: parseInt(stockOutQty, 10) || 1 }) });
                      const d = await res.json();
                      if (res.ok && d.ok) {
                        setInventoryActionMessage(locale === "vi" ? "Đã xuất kho." : "Stock out recorded.");
                        setStockOutSku(""); setStockOutQty("1");
                        adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                        setTimeout(() => setInventoryActionMessage(null), 3000);
                      } else setInventoryCreateError(d?.error ?? "Failed");
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500"
                  >
                    {m.stockOut}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product / Variant Detail Modal */}
      {productDetailProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-white">{locale === "vi" ? "Chi tiết sản phẩm" : "Product details"}</h3>
              <button type="button" onClick={() => { setProductDetailProductId(null); setProductDetailEditProduct(null); setProductDetailEditVariantId(null); setProductDetailEditVariant(null); }} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {!productDetailData ? (
                <p className="text-slate-400">{m.loading}</p>
              ) : (
                <>
                  {/* Product section */}
                  <div className="rounded-lg border border-slate-600 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.productName}</h4>
                    {productDetailEditProduct ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <input value={productDetailEditProduct.name} onChange={(e) => setProductDetailEditProduct((p) => p ? { ...p, name: e.target.value } : null)} className="px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white" placeholder={m.productName} />
                        <input value={productDetailEditProduct.brand ?? ""} onChange={(e) => setProductDetailEditProduct((p) => p ? { ...p, brand: e.target.value || null } : null)} className="px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white" placeholder={m.brand} />
                        <select value={productDetailEditProduct.category} onChange={(e) => setProductDetailEditProduct((p) => p ? { ...p, category: e.target.value } : null)} className="px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white">
                          <option value="shoes">Shoes</option><option value="chalk">Chalk</option><option value="merch">Merch</option><option value="rental">Rental</option>
                        </select>
                        <div className="col-span-full flex items-center gap-3">
                          {productDetailEditProduct.image && <img src={productDetailEditProduct.image} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-600" />}
                          <input ref={productDetailPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !productDetailProductId || !productDetailEditProduct) return; const reader = new FileReader(); reader.onload = async () => { const dataUrl = reader.result as string; try { const res = await adminFetch("/api/admin/upload/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl }) }); const d = await res.json(); if (res.ok && d.url) setProductDetailEditProduct((p) => p ? { ...p, image: d.url } : null); } catch { /* ignore */ } }; reader.readAsDataURL(f); e.target.value = ""; }} />
                          <button type="button" onClick={() => productDetailPhotoInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-slate-500 text-slate-300 text-xs hover:bg-slate-700">{locale === "vi" ? "Chụp ảnh" : "Take photo"}</button>
                        </div>
                        <div className="col-span-full flex gap-2">
                          <button type="button" onClick={async () => { if (!productDetailEditProduct || !productDetailProductId) return; const res = await adminFetch(`/api/admin/products/${productDetailProductId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productDetailEditProduct) }); if (res.ok) { const r = await adminFetch(`/api/admin/products/${productDetailProductId}`).then((x) => x.json()); if (r.product && r.variants) setProductDetailData({ product: r.product, variants: r.variants }); setProductDetailEditProduct(null); const url = inventoryCategoryFilter === "all" ? "/api/admin/inventory" : `/api/admin/inventory?category=${inventoryCategoryFilter}`; adminFetch(url).then((x) => x.json()).then((d) => setInventoryList(d.inventory ?? [])); } }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white">{locale === "vi" ? "Lưu" : "Save"}</button>
                          <button type="button" onClick={() => setProductDetailEditProduct(null)} className="px-3 py-1.5 rounded-lg text-sm border border-slate-500 text-slate-300">{m.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {productDetailData.product.image ? <img src={productDetailData.product.image} alt="" className="w-16 h-16 object-cover rounded-lg" /> : (
                          <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-slate-500 text-xs">{locale === "vi" ? "Chưa có ảnh" : "No photo"}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">{productDetailData.product.name}</p>
                          <p className="text-sm text-slate-400">{productDetailData.product.brand ?? ""} · {productDetailData.product.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" id="product-detail-photo-view" onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !productDetailProductId) return; const reader = new FileReader(); reader.onload = async () => { const dataUrl = reader.result as string; try { const res = await adminFetch("/api/admin/upload/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl }) }); const d = await res.json(); if (res.ok && d.url) { await adminFetch(`/api/admin/products/${productDetailProductId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: d.url }) }); const r = await adminFetch(`/api/admin/products/${productDetailProductId}`).then((x) => x.json()); if (r.product && r.variants) setProductDetailData({ product: r.product, variants: r.variants }); const url = inventoryCategoryFilter === "all" ? "/api/admin/inventory" : `/api/admin/inventory?category=${inventoryCategoryFilter}`; adminFetch(url).then((x) => x.json()).then((data) => setInventoryList(data.inventory ?? [])); } } catch { /* ignore */ } }; reader.readAsDataURL(f); e.target.value = ""; }} />
                          <button type="button" onClick={() => document.getElementById("product-detail-photo-view")?.click()} className="text-xs text-amber-400 hover:underline">{productDetailData.product.image ? (locale === "vi" ? "Đổi ảnh" : "Change photo") : (locale === "vi" ? "Chụp ảnh" : "Take photo")}</button>
                          <button type="button" onClick={() => setProductDetailEditProduct({ name: productDetailData.product.name, brand: productDetailData.product.brand, category: productDetailData.product.category, image: productDetailData.product.image })} className="text-xs text-amber-400 hover:underline">{locale === "vi" ? "Sửa" : "Edit"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Variants */}
                  <div className="rounded-lg border border-slate-600 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.variantSizes}</h4>
                    {productDetailData.variants.map((v) => (
                      <div key={v.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-slate-600 last:border-0">
                        {productDetailEditVariantId === v.id && productDetailEditVariant ? (
                          <>
                            <input value={productDetailEditVariant.sku} onChange={(e) => setProductDetailEditVariant((x) => x ? { ...x, sku: e.target.value } : null)} className="w-24 px-2 py-1 rounded border border-slate-500 bg-slate-700 text-white text-sm" placeholder="SKU" />
                            <input value={productDetailEditVariant.size ?? ""} onChange={(e) => setProductDetailEditVariant((x) => x ? { ...x, size: e.target.value || null } : null)} className="w-16 px-2 py-1 rounded border border-slate-500 bg-slate-700 text-white text-sm" placeholder="Size" />
                            <input value={productDetailEditVariant.barcode ?? ""} onChange={(e) => setProductDetailEditVariant((x) => x ? { ...x, barcode: e.target.value || null } : null)} className="w-28 px-2 py-1 rounded border border-slate-500 bg-slate-700 text-white text-sm" placeholder="Barcode" />
                            <input type="number" value={productDetailEditVariant.price} onChange={(e) => setProductDetailEditVariant((x) => x ? { ...x, price: parseInt(e.target.value, 10) || 0 } : null)} className="w-20 px-2 py-1 rounded border border-slate-500 bg-slate-700 text-white text-sm" />
                            <input type="number" value={productDetailEditVariant.cost} onChange={(e) => setProductDetailEditVariant((x) => x ? { ...x, cost: parseInt(e.target.value, 10) || 0 } : null)} className="w-20 px-2 py-1 rounded border border-slate-500 bg-slate-700 text-white text-sm" />
                            <button type="button" onClick={async () => { if (!productDetailEditVariant) return; const res = await adminFetch(`/api/admin/variants/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productDetailEditVariant) }); if (res.ok) { const r = await adminFetch(`/api/admin/products/${productDetailProductId}`).then((x) => x.json()); if (r.product && r.variants) setProductDetailData({ product: r.product, variants: r.variants }); setProductDetailEditVariantId(null); setProductDetailEditVariant(null); const url = inventoryCategoryFilter === "all" ? "/api/admin/inventory" : `/api/admin/inventory?category=${inventoryCategoryFilter}`; adminFetch(url).then((x) => x.json()).then((d) => setInventoryList(d.inventory ?? [])); } }} className="px-2 py-1 rounded text-xs bg-emerald-600 text-white">{locale === "vi" ? "Lưu" : "Save"}</button>
                            <button type="button" onClick={() => { setProductDetailEditVariantId(null); setProductDetailEditVariant(null); }} className="px-2 py-1 rounded text-xs border border-slate-500 text-slate-400">{m.cancel}</button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-white">{v.sku}</span>
                            {v.size && <span className="text-slate-400 text-sm">size {v.size}</span>}
                            <span className="text-slate-400 text-sm">{(v.price ?? 0).toLocaleString("vi-VN")} VND</span>
                            <span className="text-slate-500 text-xs">qty: {v.stock_quantity ?? 0}</span>
                            <button type="button" onClick={() => { setProductDetailEditVariantId(v.id); setProductDetailEditVariant({ sku: v.sku, size: v.size, barcode: v.barcode, price: v.price, cost: v.cost }); }} className="text-xs text-amber-400 hover:underline">{locale === "vi" ? "Sửa" : "Edit"}</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiver View Modal */}
      {waiverModalOpen && foundMember?.waiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{m.signedWaiver} — {foundMember.name}</h3>
              <button
                type="button"
                onClick={() => setWaiverModalOpen(false)}
                className="text-slate-500 hover:text-slate-700 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {foundMember.waiver.waiver_text.split("\n\n").map((block, idx) => (
                  <p key={idx} className="mb-3">{block.trim()}</p>
                ))}
              </div>
              <div className="pt-4 mt-6 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Signature</p>
                <div className="min-h-[80px] p-4 border border-slate-200 rounded-lg bg-white">
                  {foundMember.waiver.signature?.startsWith("data:image") ? (
                    <img
                      src={foundMember.waiver.signature}
                      alt="Signature"
                      className="max-w-[280px] max-h-[100px] object-contain object-left invert"
                    />
                  ) : (foundMember.waiver.signature || foundMember.waiver.full_name) ? (
                    <p className="font-medium text-slate-900 text-lg" style={{ fontFamily: "cursive, serif" }}>
                      {foundMember.waiver.signature || foundMember.waiver.full_name}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic text-sm">No signature on file</p>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{foundMember.waiver.full_name}</span>
                  <span>
                    Signed on {new Date(foundMember.waiver.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Payment Modal */}
      {posPaymentModalOpen && foundMember && posCart.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">{m.checkout}</h3>
            <p className="text-sm text-slate-600">
              {m.total}: {posCart.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString("vi-VN")} VND
            </p>
            {!posQrUrl ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePosCheckoutCash}
                  disabled={posCheckoutLoading}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {posCheckoutLoading ? "..." : m.payCash}
                </button>
                <button
                  type="button"
                  onClick={handlePosCheckoutVietqr}
                  disabled={posCheckoutLoading}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  {posCheckoutLoading ? "..." : m.payWithVietqr}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{m.payWithVietqr}</p>
                <div className="flex justify-center">
                  <img src={getVietQrProxyUrl(posQrUrl) ?? posQrUrl} alt="VietQR" className="w-48 h-48 object-contain border border-slate-200 rounded-lg" />
                </div>
                <button
                  type="button"
                  onClick={handlePosConfirmPayment}
                  disabled={posConfirmLoading}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {posConfirmLoading ? "..." : m.confirmPosPayment}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPosPaymentModalOpen(false);
                setPosQrUrl(null);
                setPosPendingTransactionId(null);
              }}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {m.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {paymentModalOpen && foundMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Collect Payment</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-slate-600">Membership plan</label>
                <div className="flex gap-1">
                  {(["all", "day", "visit"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdminPassFilter(f)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        adminPassFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f === "all" ? "All" : f === "day" ? "Day" : "Visit"}
                    </button>
                  ))}
                </div>
              </div>
              <select
                value={paymentPlanId}
                onChange={(e) => handlePaymentPlanChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
              >
                {plans
                  .filter((p) => {
                    const isDayPlan = p.pass_type === "day" || p.id === "newbie_class";
                    const isVisitPlan = p.pass_type === "visit";
                    if (foundMember?.has_active_visit_pass && isDayPlan) return false;
                    if (foundMember?.has_active_day_pass && !foundMember?.has_active_visit_pass && isVisitPlan) return false;
                    if (adminPassFilter === "day") return isDayPlan;
                    if (adminPassFilter === "visit") return isVisitPlan;
                    return true;
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price_vnd > 0 ? `${p.price_vnd.toLocaleString("vi-VN")} VND` : "prorated"}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600">Payment method</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("vietqr")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    paymentMethod === "vietqr" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  VietQR / Bank
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    paymentMethod === "cash" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Cash
                </button>
              </div>
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
                  {(paymentCurrentExpiry || paymentNewExpiry || paymentVisitsAdded) && (
                    <>
                      <span className="text-slate-500">Current expiry</span>
                      <span className="font-medium">
                        {paymentCurrentExpiry
                          ? new Date(paymentCurrentExpiry).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      <span className="text-slate-500">{paymentVisitsAdded ? "Adds visits" : "After purchase"}</span>
                      <span className="font-medium text-emerald-600">
                        {paymentVisitsAdded != null
                          ? `+${paymentVisitsAdded} visits`
                          : paymentNewExpiry
                            ? new Date(paymentNewExpiry).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                      </span>
                    </>
                  )}
                </div>
                {paymentMethod === "vietqr" && paymentQrUrl && (
                  <div className="flex flex-col items-center py-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentQrFullscreen(true)}
                      className="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 transition-colors min-w-[192px] min-h-[192px] flex items-center justify-center bg-slate-50"
                    >
                      <img src={getVietQrProxyUrl(paymentQrUrl) ?? undefined} alt="VietQR" className="w-48 h-48 object-contain bg-white rounded" />
                    </button>
                    <p className="text-[11px] text-slate-500">Tap to enlarge</p>
                  </div>
                )}
                {paymentMethod === "cash" && (
                  <p className="text-sm text-slate-600 py-2">Collect {paymentPrice.toLocaleString("vi-VN")} VND in cash. Confirm when received.</p>
                )}
                {paymentMethod === "vietqr" && (
                  <p className="text-xs text-slate-500">Customer scans with banking app, MoMo, or ZaloPay. Confirm after payment received.</p>
                )}
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
                disabled={(!paymentPlanName || (paymentMethod === "vietqr" && !paymentQrUrl)) || actionLoading === "confirm"}
                className="flex-1 px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {actionLoading === "confirm" ? "Confirming..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VietQR fullscreen */}
      {paymentQrFullscreen && paymentQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setPaymentQrFullscreen(false)}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 text-xl"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="flex flex-col items-center px-6">
            <p className="text-white font-medium mb-2">{paymentPlanName} — {paymentPrice.toLocaleString("vi-VN")} VND</p>
            <div className="rounded-2xl bg-white p-4">
              <img src={getVietQrProxyUrl(paymentQrUrl) ?? undefined} alt="VietQR" className="w-72 h-72 object-contain" />
            </div>
            <p className="mt-4 text-sm text-white/80">Scan with banking app, MoMo, or ZaloPay</p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal — camera-based scan */}
      <QrScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScanned={handleQrScanned}
        onError={(msg) => {
          setSearchError(msg);
          setScannerModalOpen(false);
        }}
      />

      {/* POS barcode scanner — Sales tab: scan SKU to lookup product and add to cart */}
      <BarcodeScannerModal
        readerId="pos-barcode-reader"
        open={posBarcodeScannerOpen}
        onClose={() => setPosBarcodeScannerOpen(false)}
        onScanned={(raw) => {
          setPosBarcodeScannerOpen(false);
          const b = raw.trim();
          if (b) {
            setPosSkuInput(b);
            doPosLookup(b);
          }
        }}
        title={locale === "vi" ? "Quét mã vạch" : "Scan barcode"}
        hint={locale === "vi" ? "Quét mã vạch sản phẩm để tìm SKU và giá." : "Scan product barcode to find SKU and price."}
      />
    </div>
  );
}

