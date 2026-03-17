"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getMessages } from "@/lib/messages";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { Locale } from "@/lib/i18n";
import { formatInGymTZ, getGymToday, getGymDateFromISO, getCurrentPhase } from "@/lib/gymTimezone";
import { parseCccdPipeDelimited } from "@/lib/vnEidQr";

const QrScannerModal = dynamic(() => import("@/components/admin/QrScannerModal"), { ssr: false });
const BarcodeScannerModal = dynamic(() => import("@/components/admin/BarcodeScannerModal"), { ssr: false });
const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), { ssr: false });
const EidQrScannerModal = dynamic(() => import("@/components/dashboard/EidQrScannerModal"), { ssr: false });
const AnalyticsCharts = dynamic(() => import("@/components/admin/AnalyticsCharts"), { ssr: false });

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
  const {
    session,
    loading,
    adminFetch,
    signOut,
    hasAccess,
    role,
    staffId,
    canAccessFrontDeskFull,
    canAccessFrontDeskLimited,
    canAccessOperations,
    canAccessManagement,
    canDoPos,
    canDoMembershipModify,
    canDoPaymentConfirm,
    canDoCheckIn,
    canAccessInventory,
    canAccessAdminTools,
    canAccessAnalytics,
    phase,
    staffDisplayName,
    staffProfile,
    refreshMe,
    meFetched,
  } = useAdminAuth();
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
  const [adminArea, setAdminArea] = useState<"front_desk" | "operations" | "management" | "staff" | "analytics">("front_desk");
  const hasInitializedAdminArea = useRef(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminProfileDisplayName, setAdminProfileDisplayName] = useState("");
  const [adminProfileEditing, setAdminProfileEditing] = useState(false);
  const [adminProfileSaving, setAdminProfileSaving] = useState(false);
  const [adminProfileIdNumber, setAdminProfileIdNumber] = useState("");
  const [adminProfileDateOfBirth, setAdminProfileDateOfBirth] = useState("");
  const [adminProfileGender, setAdminProfileGender] = useState<"male" | "female" | "">("");
  const [adminProfileAddress, setAdminProfileAddress] = useState("");
  const [adminProfileCccdScanPending, setAdminProfileCccdScanPending] = useState(false);
  const [adminProfileEidScannerOpen, setAdminProfileEidScannerOpen] = useState(false);
  const [adminProfileSaveError, setAdminProfileSaveError] = useState<string | null>(null);
  const [profileModalVerifiedFromCccd, setProfileModalVerifiedFromCccd] = useState(false);
  const [profileAttendanceStats, setProfileAttendanceStats] = useState<{ checkins_this_month: number; on_time_count: number; on_time_100: boolean } | null>(null);
  const [frontDeskTab, setFrontDeskTab] = useState<"checkin" | "member">("checkin");
  const [memberProfileSubTab, setMemberProfileSubTab] = useState<"summary" | "membership" | "sales" | "history">("summary");
  const [managementTab, setManagementTab] = useState<"inventory" | "admin_tools">("inventory");
  const [staffModalTab, setStaffModalTab] = useState<"overview" | "tasks" | "attendance" | "coaching" | "routes">("overview");
  const [staffResetLoading, setStaffResetLoading] = useState(false);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [auditLogEntries, setAuditLogEntries] = useState<{ id: string; action_type: string; entity_id: string | null; created_at: string; actor: { display_name: string | null; email: string | null } | null }[] | null>(null);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogVisible, setAuditLogVisible] = useState(false);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<{
    label: string;
    staff: { staff_id: string; display_name: string | null; email: string | null; in_days: number }[];
  } | null>(null);
  const [checkinsData, setCheckinsData] = useState<{
    checkins: { id: string; member_name: string; member_code: string | null; timestamp: string }[];
    byDay: Record<string, { id: string; member_name: string; member_code: string | null; timestamp: string }[]>;
  } | null>(null);
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
  const [scannedStockQuantity, setScannedStockQuantity] = useState<number>(0);
  const [scannedOtherSizesInStock, setScannedOtherSizesInStock] = useState<{ variant_id: string; sku: string; size: string | null; price: number; quantity: number }[]>([]);
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
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [productDetailProductId, setProductDetailProductId] = useState<string | null>(null);
  const [productDetailData, setProductDetailData] = useState<{ product: InvProduct; variants: (InvVariant & { stock_quantity: number })[] } | null>(null);
  const [productDetailEditProduct, setProductDetailEditProduct] = useState<{ name: string; brand: string | null; category: string; image: string | null } | null>(null);
  const [productDetailEditVariantId, setProductDetailEditVariantId] = useState<string | null>(null);
  const [productDetailEditVariant, setProductDetailEditVariant] = useState<{ sku: string; size: string | null; barcode: string | null; price: number; cost: number } | null>(null);
  const [newProductImageDataUrl, setNewProductImageDataUrl] = useState<string | null>(null);
  const newProductPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [posAddQty, setPosAddQty] = useState(1);
  const productDetailPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [staffSalesSummary, setStaffSalesSummary] = useState<{ sales_today: number; commission_today: number } | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [assigningSessionId, setAssigningSessionId] = useState<string | null>(null);
  const [staffQrToken, setStaffQrToken] = useState<string | null>(null);
  const [staffCheckInSuccess, setStaffCheckInSuccess] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "revenue" | "members" | "retention" | "behavior" | "funnel" | "operations" | "staff">("overview");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"day" | "week" | "month" | "custom">("month");
  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analyticsMemberType, setAnalyticsMemberType] = useState<"all" | "member" | "newbie" | "casual">("all");
  const [analyticsActivity, setAnalyticsActivity] = useState<"all" | "active" | "inactive">("all");
  const [analyticsActivityLevel, setAnalyticsActivityLevel] = useState<"all" | "highly_active" | "moderate" | "low_activity" | "inactive">("all");
  const [analyticsData, setAnalyticsData] = useState<{
    filters?: { period: string; since: string; until: string; member_type: string; activity: string; activity_level?: string };
    overview?: { total_revenue: number; total_members: number; active_members: number; total_visits: number };
    revenue?: { total: number; by_category: Record<string, number>; over_time: { date: string; total: number }[]; arpu: number; revenue_per_visit: number };
    members?: {
      total: number;
      active: number;
      inactive: number;
      new_over_time: { date: string; count: number }[];
      churn_rate: number;
      avg_visits_per_member: number;
      membership_distribution?: { by_plan: Record<string, { count: number; pct: number; active_count: number }>; trend: { plan: string; prev_pct: number; current_pct: number }[] };
      member_health?: { active: number; at_risk: number; inactive: number; expiring_soon: number; by_plan: Record<string, { active: number; at_risk: number; inactive: number; expiring_soon: number }> };
      newbie_conversion_funnel?: { purchased_count: number; return_7_days_pct: number; return_30_days_pct: number; converted_to_membership_pct: number };
      activity_segmentation?: { highly_active: number; moderate: number; low_activity: number; inactive: number };
      action_insights?: { type: string; label_en: string; label_vi: string; count: number; recommendation_en: string; recommendation_vi: string }[];
    };
    retention?: { day1: number; day7: number; day30: number; newbie_purchased_pct: number; newbie_return_7_pct: number; newbie_return_30_pct: number };
    behavior?: { dau: { date: string; count: number }[]; wau: number; mau: number; peak_hours: { hour: number; count: number }[] };
    funnel?: { first_visit_to_purchase: number; newbie_to_return: number; return_to_membership: number };
    operations?: { tasks_completed: number; tasks_overdue: number; completion_rate: number; route_resets_overdue: number; coaching_completed: number; coaching_missed: number };
    staff?: { staff_id: string; display_name: string; email: string; role: string; sales: number; commission: number; tasks_completed: number; attendance_days: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [opsOverviewExpanded, setOpsOverviewExpanded] = useState(false);
  const [staffSubTab, setStaffSubTab] = useState<"routes" | "coaching">("routes");
  const [staffAttendanceLoading, setStaffAttendanceLoading] = useState(false);
  const [staffCompletedTasksExpanded, setStaffCompletedTasksExpanded] = useState(false);
  const [shiftCheckInAttendance, setShiftCheckInAttendance] = useState<{ date: string; status: string } | null>(null);
  const [shiftCheckInQrToken, setShiftCheckInQrToken] = useState<string | null>(null);
  const [shiftCheckInLoading, setShiftCheckInLoading] = useState(false);
  const [adminQrModalVariant, setAdminQrModalVariant] = useState<"shift" | "staff" | null>(null);
  // Derived for data-loading: when in Front Desk we need member/sales data when on those tabs; Operations/Management drive inventory and staff ops
  const isInventoryActive = adminArea === "management" && managementTab === "inventory";
  const isOperationsActive = adminArea === "operations";
  const isStaffAreaActive = adminArea === "staff";
  const isCheckinActive = adminArea === "front_desk" && frontDeskTab === "checkin";
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
    ready_to_close?: boolean;
    route_reset_day?: boolean;
    timeline?: { id: string; completed_at: string; task_title: string; staff_name: string }[];
    staffTaskPerformance?: { staff_id: string; display_name: string; tasks_completed: number; completion_rate_pct: number }[];
    route_setters?: { id: string; display_name?: string | null; email?: string | null }[];
    summary: { staff_in_today: number; staff_out_today: number; staff_total?: number; sessions_today: number; newbie_attendance_today?: number; zones_overdue: number; tasks_pending: number; tasks_completed?: number; tasks_overdue?: number; tasks_total?: number; pre_open_completed?: number; pre_open_total?: number; closing_overdue?: number; unassigned_sessions?: number; staff_required?: number };
  } | null>(null);

  const m = getMessages(locale).admin;

  // Fetch plans
  useEffect(() => {
    adminFetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
  }, [adminFetch]);

  // Reset member profile sub-tab when loading a new member
  useEffect(() => {
    if (foundMember) setMemberProfileSubTab("summary");
  }, [foundMember?.id]);

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

  // Staff commission summary (My Sales Today / My Commission)
  useEffect(() => {
    if (!staffId) {
      setStaffSalesSummary(null);
      return;
    }
    adminFetch("/api/admin/me/sales-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && typeof d.sales_today === "number" && typeof d.commission_today === "number" ? setStaffSalesSummary({ sales_today: d.sales_today, commission_today: d.commission_today }) : setStaffSalesSummary(null)))
      .catch(() => setStaffSalesSummary(null));
  }, [staffId, adminFetch]);

  // When role loads, set initial area to first allowed (staff → Staff tab, admin/frontdesk → Front Desk). Then ensure current area stays allowed.
  useEffect(() => {
    if (role === null) {
      hasInitializedAdminArea.current = false;
      return;
    }
    if (!meFetched) return;
    const allowed: ("front_desk" | "operations" | "management" | "staff" | "analytics")[] = [];
    if (role === "staff") {
      allowed.push("staff");
      if (canAccessFrontDeskLimited) allowed.push("front_desk");
    } else {
      if (canAccessFrontDeskFull || canAccessFrontDeskLimited) allowed.push("front_desk");
      if (canAccessOperations) allowed.push("operations");
    }
    if (canAccessManagement) allowed.push("management");
    if (canAccessAnalytics) allowed.push("analytics");
    if (allowed.length === 0) return;
    if (!hasInitializedAdminArea.current) {
      setAdminArea(allowed[0]);
      hasInitializedAdminArea.current = true;
    } else if (!allowed.includes(adminArea)) {
      setAdminArea(allowed[0]);
    }
    if (adminArea === "front_desk" && meFetched && !canDoCheckIn && frontDeskTab === "checkin") setFrontDeskTab("member");
    if (!canDoMembershipModify && memberProfileSubTab === "membership") setMemberProfileSubTab("summary");
    if (adminArea === "management" && !canAccessAdminTools && managementTab !== "inventory") setManagementTab("inventory");
  }, [role, canAccessFrontDeskFull, canAccessFrontDeskLimited, canAccessOperations, canAccessManagement, canAccessAnalytics, adminArea, canDoCheckIn, frontDeskTab, canDoMembershipModify, memberProfileSubTab, canAccessAdminTools, managementTab, meFetched]);

  // Fetch products for front desk sales and management inventory
  useEffect(() => {
    const needProducts = foundMember || isInventoryActive;
    if (!needProducts) return;
    adminFetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [foundMember, adminArea, frontDeskTab, isInventoryActive, adminFetch]);

  // Fetch inventory when Management → Inventory tab is active
  useEffect(() => {
    if (!isInventoryActive) return;
    const url = inventoryCategoryFilter === "all" ? "/api/admin/inventory" : `/api/admin/inventory?category=${encodeURIComponent(inventoryCategoryFilter)}`;
    adminFetch(url)
      .then((r) => r.json())
      .then((d) => setInventoryList(d.inventory ?? []))
      .catch(() => setInventoryList([]));
  }, [isInventoryActive, inventoryCategoryFilter, adminFetch]);

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
    // Only clear action feedback when switching to a different member so success messages (e.g. check-in recorded) stay visible after refresh
    if (id !== foundMember?.id) {
      setActionError(null);
      setActionMessage(null);
    }
    try {
      const res = await adminFetch(`/api/admin/members?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.member) {
        setSearchError(data.error || m.memberNotFound);
        return;
      }
      setFoundMember(data.member as AdminMember);
      setNameResults([]);
    } catch {
      setSearchError(m.unableToLoadMember);
    }
  }, [adminFetch, m, foundMember?.id]);

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

  // Fetch check-ins when Front Desk → Check-in tab is active
  useEffect(() => {
    if (!isCheckinActive) return;
    adminFetch("/api/admin/checkins?days=7")
      .then((r) => r.json())
      .then((d) => setCheckinsData({ checkins: d.checkins ?? [], byDay: d.byDay ?? {} }))
      .catch(() => setCheckinsData({ checkins: [], byDay: {} }));
  }, [isCheckinActive, adminFetch]);

  // Fetch staff operations when Operations area is active, or when admin (so top operations overview bar has data)
  useEffect(() => {
    if (!canAccessOperations && !isStaffAreaActive) return;
    adminFetch("/api/admin/staff")
      .then((r) => r.json())
      .then((d) => setStaffOpsData(d))
      .catch(() => setStaffOpsData(null));
  }, [canAccessOperations, isStaffAreaActive, adminFetch]);

  // Refresh operations overview for admin every 60s so top bar stays current
  useEffect(() => {
    if (!canAccessOperations) return;
    const id = setInterval(() => {
      adminFetch("/api/admin/staff")
        .then((r) => r.json())
        .then((d) => setStaffOpsData(d))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [canAccessOperations, adminFetch]);

  // Fetch analytics when Analytics area is active
  useEffect(() => {
    if (adminArea !== "analytics" || !canAccessAnalytics) return;
    setAnalyticsLoading(true);
    const params = new URLSearchParams();
    params.set("period", analyticsPeriod === "custom" ? "month" : analyticsPeriod);
    if (analyticsPeriod === "custom" && analyticsFrom && analyticsTo) {
      params.set("from", analyticsFrom);
      params.set("to", analyticsTo);
    }
    params.set("member_type", analyticsMemberType);
    params.set("activity", analyticsActivity);
    params.set("activity_level", analyticsActivityLevel);
    adminFetch(`/api/admin/analytics?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setAnalyticsData(d); setAnalyticsLoading(false); })
      .catch(() => { setAnalyticsData(null); setAnalyticsLoading(false); });
  }, [adminArea, canAccessAnalytics, analyticsPeriod, analyticsFrom, analyticsTo, analyticsMemberType, analyticsActivity, analyticsActivityLevel, adminFetch]);

  useEffect(() => {
    if (!isOperationsActive || staffModalTab !== "attendance") return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    adminFetch(`/api/admin/staff/attendance-summary?period=month&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setMonthlyAttendanceData({ label: d.label, staff: d.staff ?? [] }))
      .catch(() => setMonthlyAttendanceData(null));
  }, [isOperationsActive, staffModalTab, adminFetch]);

  // Staff tab: fetch QR token when not checked in today (for front desk to scan)
  useEffect(() => {
    if (!isStaffAreaActive || !staffId || !staffOpsData) {
      setStaffQrToken(null);
      return;
    }
    const myAtt = (staffOpsData as { myAttendance?: { date: string; status: string } | null }).myAttendance;
    const today = getGymToday();
    if (myAtt && myAtt.date === today) {
      setStaffQrToken(null);
      return;
    }
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const res = await adminFetch("/api/admin/staff/qr-token");
        const data = await res.json();
        if (!cancelled && res.ok && data?.token) setStaffQrToken(data.token);
      } catch {
        if (!cancelled) setStaffQrToken(null);
      }
    };
    fetchToken();
    const id = window.setInterval(fetchToken, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isStaffAreaActive, staffId, staffOpsData, adminFetch]);

  // Realtime: when front desk scans staff QR, staff_attendance updates → show success and refetch
  useEffect(() => {
    if (!isStaffAreaActive || !staffId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`admin-staff-attendance-${staffId}`).on("postgres_changes", { event: "*", schema: "public", table: "staff_attendance", filter: `staff_id=eq.${staffId}` }, () => {
      setStaffCheckInSuccess(true);
      setTimeout(() => setStaffCheckInSuccess(false), 15000);
      adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaffAreaActive, staffId, adminFetch]);

  // Fetch my-attendance when staffId set (so staff see attendance/commission above nav; frontdesk see shift block on Front Desk tab)
  useEffect(() => {
    if (!staffId) {
      setShiftCheckInAttendance(null);
      return;
    }
    adminFetch("/api/admin/staff/my-attendance")
      .then((r) => r.json())
      .then((d) => setShiftCheckInAttendance(d.attendance ?? null))
      .catch(() => setShiftCheckInAttendance(null));
  }, [staffId, adminFetch]);

  // QR token for shift check-in when not checked in today (Front Desk tab or Staff tab)
  useEffect(() => {
    if (!staffId) {
      setShiftCheckInQrToken(null);
      return;
    }
    const today = getGymToday();
    if (shiftCheckInAttendance && shiftCheckInAttendance.date === today) {
      setShiftCheckInQrToken(null);
      return;
    }
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const res = await adminFetch("/api/admin/staff/qr-token");
        const data = await res.json();
        if (!cancelled && res.ok && data?.token) setShiftCheckInQrToken(data.token);
      } catch {
        if (!cancelled) setShiftCheckInQrToken(null);
      }
    };
    fetchToken();
    const id = window.setInterval(fetchToken, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [staffId, shiftCheckInAttendance, adminFetch]);

  // Realtime: when staffId, refetch my-attendance when staff_attendance changes (e.g. front desk scanned our QR)
  useEffect(() => {
    if (!staffId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`admin-frontdesk-attendance-${staffId}`).on("postgres_changes", { event: "*", schema: "public", table: "staff_attendance", filter: `staff_id=eq.${staffId}` }, () => {
      adminFetch("/api/admin/staff/my-attendance").then((r) => r.json()).then((d) => setShiftCheckInAttendance(d.attendance ?? null));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [staffId, adminFetch]);

  // When profile modal opens, sync staff profile form state from staffProfile; then fetch full profile (id_number, etc.) when migration 040 applied.
  useEffect(() => {
    if (!profileModalOpen || !staffProfile) return;
    setAdminProfileDisplayName(staffProfile.display_name ?? (role === "frontdesk" ? "Front Desk" : session?.user?.email?.split("@")[0] ?? ""));
    setAdminProfileIdNumber(staffProfile.id_number ?? "");
    setAdminProfileDateOfBirth(staffProfile.date_of_birth ? staffProfile.date_of_birth.slice(0, 10) : "");
    setAdminProfileGender(staffProfile.gender === "male" || staffProfile.gender === "female" ? staffProfile.gender : "");
    setAdminProfileAddress(staffProfile.address ?? "");
    setAdminProfileCccdScanPending(false);
    setAdminProfileSaveError(null);
    setProfileModalVerifiedFromCccd(!!staffProfile.id_verified_from_cccd);
    if (staffId || role === "staff" || role === "frontdesk") {
      adminFetch("/api/admin/staff/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.staff) {
            const s = d.staff;
            setAdminProfileIdNumber(s.id_number ?? "");
            setAdminProfileDateOfBirth(s.date_of_birth ? String(s.date_of_birth).slice(0, 10) : "");
            setAdminProfileGender(s.gender === "male" || s.gender === "female" ? s.gender : "");
            setAdminProfileAddress(s.address ?? "");
            setProfileModalVerifiedFromCccd(!!s.id_verified_from_cccd);
          }
        })
        .catch(() => {});
    }
  }, [profileModalOpen, staffProfile, session?.user?.email, staffId, role, adminFetch]);

  // When profile modal opens and user is staff/frontdesk, fetch my attendance stats for the month (check-ins, on-time %).
  useEffect(() => {
    if (!profileModalOpen) {
      setProfileAttendanceStats(null);
      return;
    }
    if (!staffId && role !== "staff" && role !== "frontdesk") return;
    adminFetch("/api/admin/staff/my-attendance-stats")
      .then((r) => r.json())
      .then((d) => setProfileAttendanceStats({
        checkins_this_month: d.checkins_this_month ?? 0,
        on_time_count: d.on_time_count ?? 0,
        on_time_100: !!d.on_time_100,
      }))
      .catch(() => setProfileAttendanceStats(null));
  }, [profileModalOpen, staffId, role, adminFetch]);

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
      setSearchError(m.enterMemberIdNameOrScan);
      return;
    }

    if (raw.startsWith("leo-staff:")) {
      const staffId = raw.split(":")[1]?.trim();
      if (!staffId) {
        setSearchError(m.couldNotReadStaffQr);
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
          setActionMessage(m.staffCheckinSuccess.replace("{name}", name));
          setSearchQuery("");
        } else {
          setSearchError(data?.error || m.staffCheckinFailed);
        }
      } catch {
        setSearchError(m.unableToRecordStaffCheckin);
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
        setSearchError(m.couldNotReadQrPayload);
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
          setSearchError(data.error || m.unableToSearchMembers);
          return;
        }
        if (results.length === 0) {
          setSearchError(m.noMembersFound);
          return;
        }
        setNameResults(results);
        setSearchError(null);
      } else {
        if (!res.ok || !data.member) {
          setSearchError(data.error || m.memberNotFound);
          return;
        }
        setFoundMember(data.member as AdminMember);
      }
    } catch {
      setSearchError(m.unableToSearchMembersRightNow);
    }
  }, [searchMode, searchQuery, adminFetch, locale, m]);

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
            setActionMessage(m.staffCheckinSuccess.replace("{name}", name));
          } else {
            setActionError(data?.error || m.staffCheckinFailed);
          }
        } catch {
          setActionError(m.unableToRecordStaffCheckin);
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
            setActionMessage(m.checkinRecorded);
        } else {
          const data = await res.json().catch(() => ({}));
            setActionError(data?.error || m.checkinFailed);
        }
      } catch {
        setActionError(m.unableToRecordCheckin);
      }
        return;
      }
      if (result.id) {
        loadMemberById(result.id);
      } else {
        setSearchError(m.noMemberIdFromQr);
      }
    },
    [loadMemberById, adminFetch, scannerIntent, m]
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
      const res = await adminFetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, location: "front_desk" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to record check-in");
      }
      setActionMessage(m.checkinRecorded);
      loadMemberById(foundMember.id);
    } catch (e) {
      setActionError((e as Error).message ?? m.unableToRecordCheckinVerify);
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, loadMemberById, m, adminFetch]);

  const handleManualCheckIn = useCallback(async () => {
    if (!foundMember) return;
    setActionLoading("manual");
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await adminFetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: foundMember.id, location: "front_desk_manual" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to record manual check-in");
      }
      setActionMessage(m.manualCheckinRecorded);
      loadMemberById(foundMember.id);
    } catch {
      setActionError(m.unableToRecordManualCheckin);
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, loadMemberById, m, adminFetch]);

  const handleUndoCheckIn = useCallback(() => {
    if (!foundMember) return;
    if (!window.confirm(`${m.areYouSure}\n\n${m.confirmUndoCheckIn}`)) return;
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
    setActionMessage(m.lastCheckinAdjusted);
  }, [foundMember, m]);

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
        setActionMessage(m.membershipExtended);
      })
      .catch(() => {
        setActionError(m.unableToExtend);
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, m]);

  const handleFreeze = useCallback(() => {
    if (!foundMember) return;
    if (!window.confirm(`${m.areYouSure}\n\n${m.confirmFreeze}`)) return;
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
        updateStatus("Frozen", m.membershipFrozen);
      })
      .catch(() => {
        setActionError(m.unableToFreeze);
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, updateStatus, m]);

  const handleCancel = useCallback(() => {
    if (!foundMember) return;
    if (!window.confirm(`${m.areYouSure}\n\n${m.confirmCancel}`)) return;
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
        updateStatus("Cancelled", m.membershipCancelled);
      })
      .catch(() => {
        setActionError(m.unableToCancel);
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, updateStatus, m]);

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
        setActionMessage(m.cashPaymentRecorded);
        adminFetch(`/api/admin/members/purchases?member_id=${encodeURIComponent(foundMember.id)}`)
          .then((r) => r.json())
          .then((d) => setMemberPurchases(d.purchases ?? []))
          .catch(() => {});
        if (staffId) {
          adminFetch("/api/admin/me/sales-summary").then((r) => (r.ok ? r.json() : null)).then((d) => d && typeof d.sales_today === "number" && setStaffSalesSummary({ sales_today: d.sales_today, commission_today: d.commission_today ?? 0 }));
        }
      } else {
        setActionError(data?.error || m.checkoutFailed);
      }
    } catch {
      setActionError(m.checkoutFailed);
    } finally {
      setPosCheckoutLoading(false);
    }
  }, [foundMember, posCart, staffId, adminFetch, locale, m]);

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
        setActionError(data?.error || m.checkoutFailed);
      }
    } catch {
      setActionError(m.checkoutFailed);
    } finally {
      setPosCheckoutLoading(false);
    }
  }, [foundMember, posCart, adminFetch, m]);

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
        setActionMessage(m.vietQrConfirmed);
        if (foundMember) {
          adminFetch(`/api/admin/members/purchases?member_id=${encodeURIComponent(foundMember.id)}`)
            .then((r) => r.json())
            .then((d) => setMemberPurchases(d.purchases ?? []))
            .catch(() => {});
        }
        if (staffId) {
          adminFetch("/api/admin/me/sales-summary").then((r) => (r.ok ? r.json() : null)).then((d) => d && typeof d.sales_today === "number" && setStaffSalesSummary({ sales_today: d.sales_today, commission_today: d.commission_today ?? 0 }));
        }
      } else {
        setActionError(data?.error || m.confirmFailed);
      }
    } catch {
      setActionError(m.confirmFailed);
    } finally {
      setPosConfirmLoading(false);
    }
  }, [posPendingTransactionId, foundMember, staffId, adminFetch, locale, m]);

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
      setActionMessage(m.paymentConfirmedExtended);
    } catch (e) {
      setActionError((e as Error).message ?? m.unableToConfirmPayment);
    } finally {
      setActionLoading(null);
    }
  }, [foundMember, paymentPlanId, paymentPlanName, paymentPrice, paymentMethod, m]);

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
        setActionMessage(m.membershipUpgraded);
      })
      .catch(() => {
        setActionError(m.unableToUpgrade);
      })
      .finally(() => setActionLoading(null));
  }, [foundMember, m]);

  const handleCreateMember = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setActionError(null);
      setActionMessage(null);
      if (!newMemberName.trim()) {
        setActionError(m.nameRequiredToCreateMember);
        return;
      }
      setActionMessage(m.newMemberCreatedDemo);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPhone("");
      setNewMemberType("Founder Member");
    },
    [newMemberName, m]
  );

  const t = getMessages(locale).admin;
  const dashboardSubtitle = role === "admin" ? t.subtitleAdmin : role === "frontdesk" ? t.subtitleFrontDesk : t.subtitleStaff;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#BEE7FF] via-[#EAF6FF] to-white">
        <p className="text-slate-600">{m.loading}</p>
      </div>
    );
  }
  if (loading || (session && role === null && !meFetched)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">{m.loading}</p>
      </div>
    );
  }
  if (session && role === null && meFetched) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
        <p className="text-slate-300 text-center mb-4">
          {locale === "vi"
            ? "Tài khoản của bạn chưa có quyền truy cập bảng điều khiển. Nếu bạn là Front Desk hoặc Staff, hãy nhờ admin thêm bạn (chạy script seed cho frontdesk001)."
            : "Your account does not have access to the admin dashboard. If you are Front Desk or Staff, ask an admin to add you (run the seed script for frontdesk001)."}
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="px-4 py-2 rounded-lg bg-slate-600 text-slate-200 hover:bg-slate-500"
        >
          {t.logout}
        </button>
      </div>
    );
  }
  if (!hasAccess) {
    return <AdminLoginForm locale={locale} onLocaleChange={setLocaleAndStore} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur shrink-0">
        {/* Compact header: one row on mobile (logo+title+utils), second row = status line */}
        <div className="max-w-[1100px] mx-auto px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-white.svg" alt="Leo Mây logo" className="h-6 w-auto shrink-0 md:h-7" />
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-base md:text-2xl font-bold text-white tracking-tight truncate" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>{t.title}</h1>
                <p className="text-[10px] md:text-sm text-slate-300">{dashboardSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {phase && (
                <span className="hidden sm:inline-flex border border-amber-500/50 rounded-lg px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-semibold md:text-xs" title={phase.countdown_message}>{phase.phase_label}</span>
              )}
              <div className="border border-slate-700 rounded-lg px-1.5 py-0.5 bg-slate-800/80 text-[10px] md:text-xs text-slate-200">
                <span className="text-slate-400">{t.gymOccupancy}</span> <span className="font-medium text-slate-50">{gymOccupancy}</span>
              </div>
              <div className="flex gap-0.5 rounded-full border border-slate-600 bg-slate-800/80 p-0.5">
                <button type="button" onClick={() => setLocaleAndStore("en")} className={`px-2 py-0.5 rounded-full text-[10px] font-medium md:px-3 md:py-1 md:text-xs ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}>EN</button>
                <button type="button" onClick={() => setLocaleAndStore("vi")} className={`px-2 py-0.5 rounded-full text-[10px] font-medium md:px-3 md:py-1 md:text-xs ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}>VN</button>
              </div>
              <button type="button" onClick={() => { setProfileModalOpen(true); setAdminProfileDisplayName(staffDisplayName ?? (role === "frontdesk" ? "Front Desk" : session?.user?.email?.split("@")[0] ?? "")); setAdminProfileEditing(false); }} className="px-2 py-0.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-[10px] md:text-xs md:px-3 md:py-1" title={staffDisplayName ? `${staffDisplayName} · ${t.profileTab}` : t.profileTab}>
                {(role === "staff" || role === "frontdesk") && (staffDisplayName || (role === "frontdesk" ? "Front Desk" : null) || session?.user?.email) ? ((staffDisplayName || (role === "frontdesk" ? "Front Desk" : "") || session?.user?.email?.split("@")[0]) ?? "") : t.profileTab}
              </button>
              <button type="button" onClick={() => signOut()} className="px-2 py-0.5 rounded-lg border border-slate-500 text-slate-200 hover:bg-slate-700 hover:text-white text-[10px] md:text-xs md:px-3 md:py-1">
                {t.logout}
              </button>
            </div>
          </div>
          {/* Second row only on smallest screens (phase not in first row below sm) */}
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
            {phase && (
              <span className="inline-flex border border-amber-500/50 rounded-lg px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-semibold" title={phase.countdown_message}>{phase.phase_label}</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="max-w-[1100px] mx-auto px-3 py-3 md:px-4 md:py-6 space-y-2 md:space-y-4">
          {/* For staff and frontdesk: compact "You're checked in" bar above nav (only when checked in today) */}
          {(role === "staff" || role === "frontdesk") && staffId != null && (() => {
            const today = getGymToday();
            const hasShiftToday = shiftCheckInAttendance != null && shiftCheckInAttendance.date === today;
            const isShiftIn = hasShiftToday && shiftCheckInAttendance!.status === "IN";
            if (!isShiftIn) return null;
            const staffMsg = getMessages(locale).staff;
            return (
              <div className="flex flex-wrap items-center gap-2 md:gap-4 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 md:p-3">
                <p className="text-slate-200 text-xs md:text-sm"><span className="text-emerald-400 font-medium">{staffMsg.youAreCheckedIn}</span></p>
                {staffSalesSummary != null && (
                  <>
                    <span className="text-slate-500">|</span>
                    <span className="text-[10px] md:text-xs text-slate-400">{locale === "vi" ? "Doanh số" : "Sales"}: <span className="font-semibold text-white">{(staffSalesSummary.sales_today ?? 0).toLocaleString("vi-VN")}</span></span>
                    <span className="text-[10px] md:text-xs text-slate-400">{locale === "vi" ? "Hoa hồng" : "Commission"}: <span className="font-semibold text-white">{(staffSalesSummary.commission_today ?? 0).toLocaleString("vi-VN")}</span> VND</span>
                  </>
                )}
              </div>
            );
          })()}

          {/* Operations overview — admin only: compact summary, expand for full details */}
          {canAccessOperations && (() => {
            const sum = staffOpsData?.summary;
            if (!sum) return <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 md:p-3"><p className="text-xs md:text-sm text-slate-500">{m.loading}</p></div>;
            const req = sum.staff_required ?? 3;
            const present = sum.staff_in_today ?? 0;
            const totalStaff = sum.staff_total ?? req;
            const unassigned = sum.unassigned_sessions ?? 0;
            const staffStatus = present >= req ? "green" : present >= req - 1 ? "yellow" : "red";
            const alerts: string[] = [];
            const tz = "America/Los_Angeles";
            const nowStr = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: tz }).slice(0, 5);
            const [nh, nm] = nowStr.split(":").map(Number);
            const nowMins = nh * 60 + nm;
            (staffOpsData?.preOpen ?? []).forEach((t: { status: string; due_time?: string | null; title: string }) => {
              if (t.status !== "completed" && t.due_time) {
                const [dh, dm] = String(t.due_time).slice(0, 5).split(":").map(Number);
                const minOver = nowMins - (dh * 60 + dm);
                if (minOver > 0) alerts.push(`${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${locale === "vi" ? "phút" : "min"})`);
              }
            });
            (staffOpsData?.closing ?? []).forEach((t: { status: string; due_time?: string | null; title: string }) => {
              if (t.status !== "completed" && t.due_time) {
                const [dh, dm] = String(t.due_time).slice(0, 5).split(":").map(Number);
                const minOver = nowMins - (dh * 60 + dm);
                if (minOver > 0) alerts.push(`${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${locale === "vi" ? "phút" : "min"})`);
              }
            });
            (staffOpsData?.zones ?? []).filter((z: { overdue?: boolean }) => z.overdue).forEach((z: { name: string }) =>
              alerts.push(`${z.name} ${locale === "vi" ? "reset quá hạn" : "reset overdue"}`),
            );
            if (unassigned > 0) alerts.push(`${unassigned} ${locale === "vi" ? "buổi coaching chưa giao" : "coaching sessions unassigned"}`);
            const gymReady = staffOpsData?.phase?.current_phase === "closing" ? staffOpsData?.ready_to_close === true : staffOpsData?.gym_ready === true;
            const summaryLine = alerts.length === 0 ? (locale === "vi" ? "Không có sự cố hôm nay" : "No issues today") : `${alerts.length} ${locale === "vi" ? "cảnh báo" : "alerts"}`;
            return (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button type="button" onClick={() => setOpsOverviewExpanded(!opsOverviewExpanded)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-2 text-left">
                  <span className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider ${alerts.length === 0 ? "text-emerald-700" : "text-amber-800"}`}>
                    {locale === "vi" ? "Vận hành" : "Operations"}: {summaryLine}
                  </span>
                  <span className="text-slate-400 text-xs shrink-0">{opsOverviewExpanded ? "▲" : "▼"} {locale === "vi" ? "Chi tiết" : "Details"}</span>
                </button>
                {opsOverviewExpanded && (
                  <div className="border-t border-slate-100 px-2.5 py-2 md:px-3 md:py-3 space-y-2">
                    <div className="flex flex-wrap gap-2 md:gap-4">
                      <div className={`rounded border px-2 py-1 min-w-0 ${staffStatus === "green" ? "bg-emerald-50 border-emerald-200" : staffStatus === "yellow" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase">{m.staffPresent}</p>
                        <p className="text-xs font-bold text-slate-800">{present} / {totalStaff}</p>
                      </div>
                      <div className={`rounded border px-2 py-1 min-w-0 ${gymReady ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase">{locale === "vi" ? "Gym" : "Gym"}</p>
                        <p className="text-xs font-bold text-slate-800">{gymReady ? (locale === "vi" ? "Sẵn sàng" : "Ready") : (locale === "vi" ? "Chưa sẵn sàng" : "Not ready")}</p>
                      </div>
                      <div className={`rounded border px-2 py-1 flex-1 min-w-0 ${alerts.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase">{m.operationsAlerts}</p>
                        {alerts.length === 0 ? <p className="text-xs text-slate-700">{m.noOperationalAlerts}</p> : <ul className="list-disc list-inside text-[10px] text-slate-700">{alerts.slice(0, 5).map((a) => <li key={a}>{a}</li>)}</ul>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* MAIN AREA NAV: Front Desk | Operations | Management — high priority, directly below header */}
          {(() => {
            const allowedAreas: ("front_desk" | "operations" | "management" | "staff" | "analytics")[] = [];
            if (role === "staff") {
              allowedAreas.push("staff");
              if (canAccessFrontDeskLimited) allowedAreas.push("front_desk");
            } else {
              if (canAccessFrontDeskFull || canAccessFrontDeskLimited) allowedAreas.push("front_desk");
              if (canAccessOperations) allowedAreas.push("operations");
            }
            if (canAccessManagement) allowedAreas.push("management");
            if (canAccessAnalytics) allowedAreas.push("analytics");
            return (
          <nav className="sticky top-0 z-20 rounded-lg md:rounded-xl p-1 mb-2 md:mb-4 bg-white/95 border border-slate-200 shadow-md backdrop-blur-md overflow-x-auto" aria-label="Admin areas">
            <div className="flex gap-1 min-w-max">
              {allowedAreas.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setAdminArea(area)}
                  className={`flex-none whitespace-nowrap py-2 px-3 md:py-2.5 rounded-md md:rounded-lg text-sm font-semibold md:text-[13px] md:font-medium transition-all ${
                    adminArea === area ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  {area === "front_desk" ? (locale === "vi" ? "Quầy lễ tân" : "Front Desk") : null}
                  {area === "operations" ? (locale === "vi" ? "Vận hành" : "Operations") : null}
                  {area === "management" ? (locale === "vi" ? "Quản lý" : "Management") : null}
                  {area === "staff" ? (locale === "vi" ? "Nhân sự / Ca làm" : "Staff") : null}
                  {area === "analytics" ? (locale === "vi" ? "Phân tích" : "Analytics") : null}
                </button>
              ))}
            </div>
          </nav>
            );
          })()}

          {/* Shift check-in — compact on mobile */}
          {adminArea === "front_desk" && staffId != null && (() => {
            const today = getGymToday();
            const hasShiftToday = shiftCheckInAttendance != null && shiftCheckInAttendance.date === today;
            const isShiftIn = hasShiftToday && shiftCheckInAttendance!.status === "IN";
            const staffMsg = getMessages(locale).staff;
            return (
              <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 md:p-4">
                <h3 className="text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1 md:mb-3">{staffMsg.dailyAttendance}</h3>
                {!hasShiftToday && (
                  <>
                    <p className="text-slate-200 text-xs md:text-sm mb-1">{staffMsg.checkInAtFrontDesk}</p>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <button type="button" onClick={() => shiftCheckInQrToken && setAdminQrModalVariant("shift")} className="rounded bg-white p-1.5 inline-block hover:ring-2 ring-emerald-400 focus:outline-none focus:ring-2 ring-emerald-400" title={locale === "vi" ? "Phóng to mã QR" : "Enlarge QR"}>
                        {shiftCheckInQrToken ? <QRCodeSVG value={shiftCheckInQrToken} size={80} level="M" /> : <span className="text-slate-500 text-xs">{m.loading}</span>}
                      </button>
                      <button type="button" disabled={shiftCheckInLoading} onClick={async () => { setShiftCheckInLoading(true); try { await adminFetch("/api/admin/staff/my-attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "NOT_IN" }) }); adminFetch("/api/admin/staff/my-attendance").then((r) => r.json()).then((d) => setShiftCheckInAttendance(d.attendance ?? null)); } finally { setShiftCheckInLoading(false); } }} className="py-1.5 px-3 rounded-lg text-xs md:text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50">{staffMsg.notWorkingToday}</button>
                    </div>
                  </>
                )}
                {hasShiftToday && !isShiftIn && <p className="text-slate-400 text-xs md:text-sm">{staffMsg.youAreMarkedNotWorking}</p>}
                {hasShiftToday && isShiftIn && <p className="text-slate-200 text-xs md:text-sm"><span className="text-emerald-400 font-medium">{staffMsg.youAreCheckedIn}</span></p>}
              </div>
            );
          })()}

          {/* Frontdesk commission — compact bar */}
          {staffId != null && role !== "staff" && staffSalesSummary != null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-4">
              <span className="text-[10px] md:text-xs text-emerald-800">{locale === "vi" ? "Doanh số" : "Sales"}: <span className="font-bold text-emerald-900">{(staffSalesSummary.sales_today ?? 0).toLocaleString("vi-VN")}</span></span>
              <span className="text-[10px] md:text-xs text-emerald-800">{locale === "vi" ? "Hoa hồng" : "Commission"}: <span className="font-bold text-emerald-900">{(staffSalesSummary.commission_today ?? 0).toLocaleString("vi-VN")}</span> VND</span>
            </div>
          )}

          {/* FRONT DESK sub-tabs: Check-in | Member — secondary hierarchy (smaller) */}
          {adminArea === "front_desk" && (
            <nav className="rounded-lg md:rounded-xl p-0.5 mb-2 md:mb-4 bg-slate-100 border border-slate-200 overflow-x-auto" aria-label="Front desk tabs">
              <div className="flex gap-0.5 min-w-max">
                {canDoCheckIn && (
                  <button
                    type="button"
                    onClick={() => setFrontDeskTab("checkin")}
                    className={`flex-none whitespace-nowrap py-1.5 px-2.5 md:py-2 md:px-3 rounded-md text-xs md:text-sm font-medium ${
                      frontDeskTab === "checkin" ? "bg-white shadow border border-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {locale === "vi" ? "Check-in" : "Check-in"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFrontDeskTab("member")}
                  className={`flex-none whitespace-nowrap py-1.5 px-2.5 md:py-2 md:px-3 rounded-md text-xs md:text-sm font-medium ${
                    frontDeskTab === "member" ? "bg-white shadow border border-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {locale === "vi" ? "Thành viên" : "Member"}
                </button>
              </div>
            </nav>
          )}

          {/* FRONT DESK → Check-in: quick check-in primary, occupancy, recent check-ins */}
          {adminArea === "front_desk" && frontDeskTab === "checkin" && (
            <section className="space-y-3 md:space-y-6">
              {/* Primary CTA: Quick Check-In — prominent, less padding on mobile */}
              <div className="rounded-xl md:rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-500/20 to-slate-800/95 shadow-lg p-3 md:p-7 ring-2 ring-emerald-400/30">
                <h2 className="text-sm md:text-lg font-bold text-white mb-0.5">{m.scanToCheckIn}</h2>
                <p className="text-[10px] md:text-sm text-slate-300 mb-2 md:mb-4">{m.quickCheckInScanHint}</p>
                <button type="button" onClick={handleQuickCheckInScan} className="w-full sm:w-auto min-w-0 sm:min-w-[200px] px-4 py-3 md:px-6 md:py-4 rounded-xl text-sm md:text-base font-bold bg-emerald-500 text-slate-900 hover:bg-emerald-400 active:scale-[0.98] transition shadow-lg shadow-emerald-900/30">
                  {m.scanToCheckIn}
                </button>
              </div>
              <div className="rounded-xl md:rounded-2xl bg-slate-900/95 border border-slate-700 p-3 md:p-6">
                <h3 className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{m.gymOccupancy}</h3>
                <p className="text-2xl md:text-3xl font-bold text-white">{gymOccupancy}</p>
                <p className="text-xs md:text-sm text-slate-400 mt-0.5">{m.climbersInsideLast2h}</p>
              </div>
              <div className="rounded-xl md:rounded-2xl bg-white border border-slate-200 p-3 md:p-6">
                <h3 className="text-xs md:text-sm font-semibold text-slate-900 mb-2 md:mb-3">{m.recentCheckins} (7 {m.day}s)</h3>
                {!checkinsData && <p className="text-sm text-slate-500">{m.loading}</p>}
                {checkinsData && Object.keys(checkinsData.byDay).length === 0 && <p className="text-sm text-slate-500">{m.noCheckins7Days}</p>}
                {checkinsData && Object.keys(checkinsData.byDay).length > 0 && (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto">
                    {Object.entries(checkinsData.byDay).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
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
                )}
              </div>
            </section>
          )}

          {/* FRONT DESK → Member tab (lookup + profile) */}
          {adminArea === "front_desk" && frontDeskTab === "member" && (
          <>
          {/* MEMBER LOOKUP */}
          <section className="rounded-xl md:rounded-2xl bg-white/80 border border-slate-200 shadow-sm p-3 md:p-6">
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
            <section className="space-y-4">
              {paymentReceived && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm font-medium">
                  Payment received! Membership updated.
                </div>
              )}
              {actionMessage && (
                <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/50 px-4 py-3 text-emerald-200 text-sm font-medium">
                  {actionMessage}
                </div>
              )}
              {actionError && (
                <div className="rounded-xl bg-rose-500/20 border border-rose-400/50 px-4 py-3 text-rose-200 text-sm font-medium">
                  {actionError}
                </div>
              )}
              {/* Member header: always visible */}
              <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6">
                <div className="flex items-center gap-4">
                  {foundMember.profile_photo_url ? (
                    <img src={foundMember.profile_photo_url} alt="" className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-lg font-semibold shrink-0">{foundMember.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white truncate">{foundMember.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${foundMember.status === "Active" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50" : foundMember.status === "Frozen" ? "bg-amber-500/20 text-amber-300 border border-amber-400/50" : "bg-rose-500/20 text-rose-300 border border-rose-400/50"}`}>
                        {foundMember.status === "Active" ? m.statusActive : foundMember.status === "Inactive" ? m.statusInactive : foundMember.status === "Frozen" ? m.statusFrozen : m.statusCancelled}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{foundMember.email || foundMember.phone}</p>
                    <p className="text-xs text-slate-500 mt-1"><span className="text-slate-400">{t.memberId}:</span> <span className="font-medium text-slate-200">{foundMember.displayId}</span></p>
                  </div>
                </div>
              </div>

              {/* Sub-tabs (staff: no membership tab) */}
              <nav className="flex gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700 overflow-x-auto" aria-label="Member sections">
                {(["summary", "membership", "sales", "history"] as const)
                  .filter((tab) => tab !== "membership" || canDoMembershipModify)
                  .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMemberProfileSubTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 ${memberProfileSubTab === tab ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}
                  >
                    {tab === "summary" ? m.memberTabSummary : tab === "membership" ? m.memberTabMembership : tab === "sales" ? m.memberTabSales : m.memberTabHistory}
                  </button>
                ))}
              </nav>

              {/* Tab content */}
              {memberProfileSubTab === "summary" && (
                <div className="space-y-4 md:space-y-6">
                  <div className="rounded-2xl bg-slate-800/90 border border-slate-700 p-4 md:p-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Profile</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:text-sm">
                      <div><p className="text-slate-400">{m.membershipLabel}</p><p className="font-medium text-slate-100">{foundMember.membershipType === "Founder Member" ? m.founderMember : foundMember.membershipType === "Standard" ? m.standard : foundMember.membershipType === "Day Pass" ? m.dayPass : foundMember.membershipType}</p></div>
                      <div><p className="text-slate-400">{m.validUntil}</p><p className="font-medium text-slate-100">{foundMember.validUntil}</p></div>
                      {foundMember.gender && <div><p className="text-slate-400">{m.genderLabel}</p><p className="font-medium text-slate-100">{foundMember.gender === "male" ? m.male : m.female}</p></div>}
                      {foundMember.instagram_handle && <div><p className="text-slate-400">Instagram</p><a href={`https://www.instagram.com/${foundMember.instagram_handle.replace(/^@/, "")}/`} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-300 hover:underline">@{foundMember.instagram_handle.replace(/^@/, "")}</a></div>}
                      {foundMember.id_number && <div><p className="text-slate-400">{m.govtId}</p><p className="font-medium text-slate-100">{foundMember.id_number}</p></div>}
                      {foundMember.date_of_birth && <div><p className="text-slate-400">{m.dateOfBirth}</p><p className="font-medium text-slate-100">{new Date(foundMember.date_of_birth).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</p></div>}
                      <div className="col-span-2">
                        <p className="text-slate-400">{m.waiverSigned}</p>
                        {foundMember.waiver_signed && foundMember.waiver_signed_at ? (
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-100">
                              {new Date(foundMember.waiver_signed_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                            {foundMember.waiver && (
                              <button type="button" onClick={() => setWaiverModalOpen(true)} className="text-xs font-medium text-sky-300 hover:underline">{m.viewWaiver}</button>
                            )}
                          </div>
                        ) : (
                          <p className="font-medium text-slate-400">{m.notSigned}</p>
                        )}
                      </div>
                      <div><p className="text-slate-400">{m.internalId}</p><p className="font-mono text-[11px] text-slate-300 break-all">{foundMember.id}</p></div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                    {m.activity}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                    <div className="rounded-xl bg-slate-700/50 border border-slate-600 px-3 py-3">
                      <p className="text-slate-400 mb-1">{m.checkinsThisMonth}</p>
                      <p className="text-lg font-semibold text-white">
                        {foundMember.checkinsThisMonth}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-700/50 border border-slate-600 px-3 py-3">
                      <p className="text-slate-400 mb-1">{m.totalVisits}</p>
                      <p className="text-lg font-semibold text-white">
                        {foundMember.totalVisits}
                      </p>
                    </div>
                    {(foundMember.visits_remaining ?? 0) > 0 && (
                      <div className="col-span-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 px-3 py-3">
                        <p className="text-slate-300 mb-1">{m.visitsRemaining}</p>
                        <p className="text-xl font-semibold text-emerald-300">
                          {foundMember.visits_remaining} {m.visitsLabel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.7)] p-4 md:p-5">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-3">
                    {m.recentCheckins}
                  </h3>
                  <ul className="space-y-1.5 text-xs md:text-sm text-slate-200">
                    {foundMember.recentCheckins.map((c) => (
                      <li key={c.label}>{c.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
              )}

              {memberProfileSubTab === "history" && (
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
                        ...memberPurchases.map((tx) => ({ type: "retail" as const, id: tx.id, date: tx.created_at, amount: tx.total, label: m.retail, items: tx.items })),
                      ]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((entry) => (
                          <li key={`${entry.type}-${entry.id}`} className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-slate-100">{entry.label}</span>
                                <span className="text-slate-400 ml-2">
                                  {new Date(entry.date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
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
              )}

              {memberProfileSubTab === "membership" && canDoMembershipModify && (
              <div className="space-y-4 md:space-y-6">
                <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.75)] p-4 md:p-6">
                  <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-200 uppercase mb-4">
                    {m.checkInActions}
                  </h3>
                  {!canCheckIn && foundMember?.status === "Inactive" && (
                    <p className="text-amber-300/90 text-sm mb-3">
                      {m.collectPaymentFirst}
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
                    {m.membershipControls}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCollectPayment}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {m.collectPayment}
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
                      {actionLoading === "freeze" ? m.freezing : m.freezeMembership}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={actionLoading === "cancel"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {actionLoading === "cancel" ? m.cancelling : m.cancelMembership}
                    </button>
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={actionLoading === "upgrade"}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {actionLoading === "upgrade" ? m.upgrading : m.upgradeMembership}
                    </button>
                  </div>
                </div>
              </div>
              )}

              {memberProfileSubTab === "sales" && (
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
                            {posLookupResult.product.image ? <img src={posLookupResult.product.image} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-slate-200" /> : <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-xs flex-shrink-0">{m.noPhoto}</div>}
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
                  {posCart.length === 0 ? <p className="text-xs text-slate-500">{m.empty}</p> : (
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
              )}
            </section>
          )}
          </>
          )}

          {/* MANAGEMENT: inner tabs (admin: all; frontdesk: Inventory only) */}
          {adminArea === "management" && (
            <nav className="rounded-xl p-1 mb-4 bg-slate-100 border border-slate-200 overflow-x-auto" aria-label="Management tabs">
              <div className="flex gap-1 min-w-max">
                {([
                  ...(canAccessInventory ? ["inventory" as const] : []),
                  ...(canAccessAdminTools ? ["admin_tools" as const] : []),
                ]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setManagementTab(tab)}
                    className={`flex-none whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium ${
                      managementTab === tab ? "bg-white shadow border border-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab === "inventory" ? m.inventoryModule : null}
                    {tab === "admin_tools" ? (locale === "vi" ? "Công cụ" : "Admin Tools") : null}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* MANAGEMENT → Inventory tab */}
          {adminArea === "management" && managementTab === "inventory" && (
          <section className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-6 space-y-6">
            {inventoryActionMessage && <p className="text-sm text-emerald-600">{inventoryActionMessage}</p>}
            {inventoryCreateError && (
              <div className="space-y-1">
                <p className="text-sm text-red-400 font-medium">{inventoryCreateError}</p>
                {/031|migration|relation|column.*does not exist/i.test(inventoryCreateError) && (
                  <p className="text-xs text-slate-400">Apply migration 031 in Supabase Dashboard → SQL Editor (run <code className="text-slate-300">supabase/migrations/031_product_variants_barcode_first.sql</code>), then try again.</p>
                )}
              </div>
            )}
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
                            setScannedStockQuantity(typeof d.stock_quantity === "number" ? d.stock_quantity : 0);
                            setScannedOtherSizesInStock(Array.isArray(d.other_sizes_in_stock) ? d.other_sizes_in_stock : []);
                            setNewProductBarcode("");
                            setInventoryScannedBarcode("");
                            setTimeout(() => inventoryQtyInputRef.current?.focus(), 100);
                          } else {
                            setScannedVariant(null);
                            setScannedProduct(null);
                            setScannedStockQuantity(0);
                            setScannedOtherSizesInStock([]);
                            setNewProductBarcode(b);
                            setNewProductCode(b);
                            setNewVariants((v) => v.length ? [{ ...v[0], barcode: b }, ...v.slice(1)] : [{ size: "", barcode: b, price: "", cost: "", quantity: "1" }]);
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
                <p className={`text-sm font-medium ${scannedStockQuantity > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {scannedStockQuantity > 0
                    ? (locale === "vi" ? `Còn ${scannedStockQuantity} trong kho` : `${scannedStockQuantity} in stock`)
                    : (locale === "vi" ? "Hết hàng (size này)" : "Out of stock (this size)")}
                </p>
                {scannedOtherSizesInStock.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{locale === "vi" ? "Cùng model, size khác còn hàng" : "Same model, other sizes in stock"}</p>
                    <ul className="flex flex-wrap gap-2">
                      {scannedOtherSizesInStock.map((s) => (
                        <li key={s.variant_id} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {s.size ? (locale === "vi" ? `Size ${s.size}` : `Size ${s.size}`) : s.sku} — {s.quantity} {locale === "vi" ? "cái" : "in stock"} · {(s.price ?? 0).toLocaleString("vi-VN")} VND
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-xs font-medium text-slate-700">{m.quantity}</label>
                  <input ref={inventoryQtyInputRef} type="number" min={1} value={inventoryQty} onChange={(e) => setInventoryQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border-2 border-slate-500 bg-slate-800 text-slate-100 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button type="button" onClick={async () => {
                    const qty = parseInt(inventoryQty, 10) || 1;
                    const res = await adminFetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: scannedVariant.id, quantity: qty }) });
                    const d = await res.json();
                    if (res.ok && d.ok) {
                      setInventoryActionMessage(locale === "vi" ? "Đã nhập kho." : "Stock in recorded."); setInventoryQty("1");
                      adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                      if (scannedVariant.barcode) { adminFetch(`/api/admin/variants/by-barcode?barcode=${encodeURIComponent(scannedVariant.barcode)}`).then((r) => r.json()).then((data) => { if (data.found && typeof data.stock_quantity === "number") { setScannedStockQuantity(data.stock_quantity); setScannedOtherSizesInStock(Array.isArray(data.other_sizes_in_stock) ? data.other_sizes_in_stock : []); } }); }
                      setTimeout(() => setInventoryActionMessage(null), 3000);
                    } else setInventoryCreateError(d?.error ?? "Failed");
                  }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500">{m.stockIn}</button>
                  <button type="button" onClick={async () => {
                    if (!window.confirm(`${m.areYouSure}\n\n${m.confirmStockOut}`)) return;
                    const qty = parseInt(inventoryQty, 10) || 1;
                    const res = await adminFetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: scannedVariant.id, quantity: qty }) });
                    const d = await res.json();
                    if (res.ok && d.ok) {
                      setInventoryActionMessage(locale === "vi" ? "Đã xuất kho." : "Stock out recorded."); setInventoryQty("1");
                      adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                      if (scannedVariant.barcode) { adminFetch(`/api/admin/variants/by-barcode?barcode=${encodeURIComponent(scannedVariant.barcode)}`).then((r) => r.json()).then((data) => { if (data.found && typeof data.stock_quantity === "number") { setScannedStockQuantity(data.stock_quantity); setScannedOtherSizesInStock(Array.isArray(data.other_sizes_in_stock) ? data.other_sizes_in_stock : []); } }); }
                      setTimeout(() => setInventoryActionMessage(null), 3000);
                    } else setInventoryCreateError(d?.error ?? "Failed");
                  }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500">{m.stockOut}</button>
                  <button type="button" onClick={() => { setScannedVariant(null); setScannedProduct(null); setScannedStockQuantity(0); setScannedOtherSizesInStock([]); setInventoryQty("1"); }} className="text-xs text-slate-500 underline">{m.cancel}</button>
                </div>
              </div>
            )}

            {/* 3) Create Product — when barcode not found */}
            {!scannedVariant && newProductBarcode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.createProduct}</h4>
                <p className="text-xs text-slate-600">{m.createProductHint}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <input placeholder={m.barcode} value={newProductBarcode} onChange={(e) => { const v = e.target.value; setNewProductBarcode(v); setNewVariants((prev) => prev.length ? [{ ...prev[0], barcode: v }, ...prev.slice(1)] : prev); }} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" title={locale === "vi" ? "Mã vạch dùng chung (tự điền từ quét); sửa ở đây sẽ cập nhật size đầu tiên" : "Barcode (auto-filled from scan); edit here updates first variant"} />
                  <input placeholder={m.productName} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <input placeholder={m.brand} value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <input placeholder={m.productCode} value={newProductCode} onChange={(e) => setNewProductCode(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                  <div className="col-span-full flex items-center gap-3">
                    <input ref={newProductPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f || !/^image\/(jpeg|png|webp)$/i.test(f.type)) return; const r = new FileReader(); r.onload = () => { const dataUrl = r.result as string; if (dataUrl) setNewProductImageDataUrl(dataUrl); }; r.readAsDataURL(f); e.target.value = ""; }} />
                    {newProductImageDataUrl ? (
                      <div className="flex items-center gap-2">
                        <img key={newProductImageDataUrl} src={newProductImageDataUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
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
                      {idx === 0 ? (
                        <span className="flex-1 min-w-[80px] px-2 py-1.5 text-xs text-slate-500 italic" title={locale === "vi" ? "Dùng mã vạch ở trên" : "Uses barcode above"}>{locale === "vi" ? "(mã vạch ở trên)" : "(barcode above)"}</span>
                      ) : (
                        <input placeholder={m.barcode} value={nv.barcode} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, barcode: e.target.value } : x))} className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400" />
                      )}
                      <input placeholder={m.price} value={nv.price} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" />
                      <input placeholder={m.cost} value={nv.cost} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, cost: e.target.value } : x))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" />
                      <input placeholder={m.quantity} value={nv.quantity} onChange={(e) => setNewVariants((v) => v.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className="w-14 px-2 py-1.5 rounded-lg border-2 border-slate-400 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" min="0" title={locale === "vi" ? "Số lượng nhập kho ngay" : "Initial stock (no separate Stock In needed)"} />
                      <button type="button" onClick={() => setNewVariants((v) => v.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-600 text-xs">{m.remove}</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewVariants((v) => [...v, { size: "", barcode: "", price: "", cost: "", quantity: "1" }])} className="text-xs text-slate-600 underline">{m.addSize}</button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={async () => {
                    if (!newProductName.trim() || !newProductCode.trim()) { setInventoryCreateError(locale === "vi" ? "Nhập tên và mã sản phẩm." : "Enter name and product code."); return; }
                    const variantsToCreate = newVariants.filter((v, i) => v.size.trim() || v.price.trim() || v.barcode.trim() || (i === 0 && newProductBarcode.trim())).map((v, i) => ({ size: v.size.trim() || null, barcode: (i === 0 ? newProductBarcode.trim() : v.barcode.trim()) || null, price: parseInt(v.price, 10) || 0, cost: parseInt(v.cost, 10) || 0, quantity: Math.max(0, parseInt(v.quantity, 10) || 0) }));
                    if (variantsToCreate.length === 0) { setInventoryCreateError(locale === "vi" ? "Thêm ít nhất một size/phiên bản." : "Add at least one variant."); return; }
                    setInventoryCreateError(null);
                    try {
                      let imageUrl: string | null = null;
                      if (newProductImageDataUrl) {
                        const upRes = await adminFetch("/api/admin/upload/product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: newProductImageDataUrl }) });
                        const upText = await upRes.text();
                        let upData: { url?: string; error?: string } = {};
                        try { upData = upText ? JSON.parse(upText) : {}; } catch {
                          setInventoryCreateError(upRes.status === 413 || /request entity too large|body.*large/i.test(upText) ? "Image too large. Use a smaller photo (e.g. under 1–2 MB) or compress it." : `Upload failed (${upRes.status}): ${upText.slice(0, 120)}`);
                          return;
                        }
                        if (upRes.ok && upData.url) imageUrl = upData.url;
                        else if (!upRes.ok) { setInventoryCreateError((upData?.error ?? upText.slice(0, 150)) || `Upload failed ${upRes.status}`); return; }
                      }
                      const res = await adminFetch("/api/admin/products/with-variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newProductName.trim(), brand: newProductBrand.trim() || null, category: newProductCategory, image: imageUrl, product_code: newProductCode.trim().toUpperCase(), variants: variantsToCreate }) });
                      const text = await res.text();
                      let d: { product?: unknown; error?: string };
                      try { d = text ? JSON.parse(text) : {}; } catch { d = {}; setInventoryCreateError(res.ok ? "Invalid response" : `Error ${res.status}: ${text.slice(0, 200)}`); return; }
                      if (res.ok && d.product) {
                        setInventoryActionMessage(locale === "vi" ? "Đã tạo sản phẩm và các phiên bản." : "Product and variants created.");
                        setNewProductName(""); setNewProductBrand(""); setNewProductCode(""); setNewProductBarcode(""); setNewProductImageDataUrl(null); setNewVariants([{ size: "", barcode: "", price: "", cost: "", quantity: "1" }]);
                        adminFetch("/api/admin/products").then((r) => r.json()).then((x) => setProducts(x.products ?? []));
                        adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? []));
                        setTimeout(() => setInventoryActionMessage(null), 3000);
                      } else {
                        const errMsg = d?.error ?? `Request failed (${res.status})`;
                        setInventoryCreateError(errMsg);
                        if (!res.ok) console.error("[Create product] API error:", res.status, errMsg, text.slice(0, 300));
                      }
                    } catch (e) {
                      const err = e instanceof Error ? e.message : String(e);
                      setInventoryCreateError(err);
                      console.error("[Create product] Exception:", e);
                    }
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
                    setScannedStockQuantity(typeof d.stock_quantity === "number" ? d.stock_quantity : 0);
                    setScannedOtherSizesInStock(Array.isArray(d.other_sizes_in_stock) ? d.other_sizes_in_stock : []);
                    setNewProductBarcode("");
                    setInventoryScannedBarcode("");
                    setTimeout(() => inventoryQtyInputRef.current?.focus(), 100);
                  } else {
                    setScannedVariant(null);
                    setScannedProduct(null);
                    setScannedStockQuantity(0);
                    setScannedOtherSizesInStock([]);
                    setNewProductBarcode(b);
                    setNewProductCode(b);
                    setNewVariants((v) => v.length ? [{ ...v[0], barcode: b }, ...v.slice(1)] : [{ size: "", barcode: b, price: "", cost: "", quantity: "1" }]);
                    setInventoryScannedBarcode("");
                  }
                })
                .catch(() => setInventoryCreateError("Lookup failed."));
            }} onError={(msg) => setInventoryCreateError(msg)} title={m.scanProduct} hint={m.scanProductHint} />

            {/* 4) View Inventory — table, filter All/Shoes/Merch, search, sorted by qty*price desc */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{m.viewInventory}</h4>
              <div className="flex flex-wrap gap-2 mb-2 items-center">
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
                <input
                  type="search"
                  placeholder={locale === "vi" ? "Tìm SKU, tên, thương hiệu..." : "Search SKU, name, brand..."}
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-slate-100 placeholder-slate-400 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
              {inventoryList.length === 0 && <p className="text-sm text-slate-500">{m.loading}</p>}
              <div className="border border-slate-600 rounded-lg overflow-x-auto text-sm -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-700/80 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <th className="px-3 py-2 border-b border-slate-600">{locale === "vi" ? "Loại" : "Type"}</th>
                      <th className="px-3 py-2 border-b border-slate-600">{locale === "vi" ? "SKU / Tên / Thương hiệu / Size" : "SKU / Name / Brand / Size"}</th>
                      <th className="px-3 py-2 border-b border-slate-600 text-right">{m.quantity}</th>
                      <th className="px-3 py-2 border-b border-slate-600 text-right">{m.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...inventoryList]
                      .filter((inv) => {
                        if (!inventorySearchQuery.trim()) return true;
                        const q = inventorySearchQuery.trim().toLowerCase();
                        const sku = (inv.variant?.sku ?? "").toLowerCase();
                        const name = (inv.product?.name ?? "").toLowerCase();
                        const brand = (inv.product?.brand ?? "").toLowerCase();
                        return sku.includes(q) || name.includes(q) || brand.includes(q);
                      })
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
                              <span className="text-slate-200">{(inv.variant?.sku ?? "")} — {inv.product?.name ?? ""}{inv.product?.brand ? ` · ${inv.product.brand}` : ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}</span>
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
                      {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.product?.brand ? ` · ${inv.product.brand}` : ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
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
                      {inv.variant?.sku ?? ""} — {inv.product?.name ?? ""}{inv.product?.brand ? ` · ${inv.product.brand}` : ""}{inv.variant?.size ? ` (${inv.variant.size})` : ""}
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={stockOutQty} onChange={(e) => setStockOutQty(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-500 bg-slate-700 text-white text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" onClick={async () => { const v = stockOutSku.trim(); if (!v) return; if (!window.confirm(`${m.areYouSure}\n\n${m.confirmStockOut}`)) return; const res = await adminFetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: v, quantity: parseInt(stockOutQty, 10) || 1 }) }); const d = await res.json(); if (res.ok && d.ok) { setInventoryActionMessage(locale === "vi" ? "Đã xuất kho." : "Stock out recorded."); setStockOutSku(""); setStockOutQty("1"); adminFetch("/api/admin/inventory").then((r) => r.json()).then((x) => setInventoryList(x.inventory ?? [])); setTimeout(() => setInventoryActionMessage(null), 3000); } else setInventoryCreateError(d?.error ?? "Failed"); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-500">{m.stockOut}</button>
              </div>
            </div>
          </section>
          )}

          {/* MANAGEMENT → Admin Tools tab — CEO-only: reset attendance, audit log, countdown display */}
          {adminArea === "management" && managementTab === "admin_tools" && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-5">
              <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-1">
                {m.adminTools}
              </h3>
              <p className="text-xs text-slate-400 mb-4">{m.adminToolsSubtitle}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={staffResetLoading}
                  onClick={async () => {
                    if (!window.confirm(m.toolResetAttendanceConfirm)) return;
                    setStaffResetLoading(true);
                    try {
                      const res = await adminFetch("/api/admin/staff/reset-attendance", { method: "POST" });
                      const d = await res.json();
                      if (res.ok && d.ok) {
                        if (staffOpsData) adminFetch("/api/admin/staff").then((r) => r.json()).then((x) => setStaffOpsData(x));
                        setActionError(null);
                      } else setActionError(d?.error ?? "Failed");
                    } finally {
                      setStaffResetLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 text-sm font-medium disabled:opacity-50"
                >
                  {staffResetLoading ? "…" : m.toolResetAttendance}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!auditLogVisible) {
                      setAuditLogVisible(true);
                      if (auditLogEntries === null) {
                        setAuditLogLoading(true);
                        adminFetch("/api/admin/audit-log?limit=80")
                          .then((r) => r.json())
                          .then((data) => { setAuditLogEntries(data.entries ?? []); })
                          .catch(() => setAuditLogEntries([]))
                          .finally(() => setAuditLogLoading(false));
                      }
                    } else setAuditLogVisible(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-500 bg-slate-700/80 text-slate-200 hover:bg-slate-600 text-sm font-medium"
                >
                  {auditLogVisible ? m.auditLogHide : m.toolViewAuditLog}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/${locale}/countdown`, "_blank")}
                  className="px-4 py-2 rounded-xl border border-slate-500 bg-slate-700/80 text-slate-200 hover:bg-slate-600 text-sm font-medium"
                >
                  {m.toolOpenCountdown}
                </button>
              </div>
            </div>

            {auditLogVisible && (
              <div className="rounded-2xl bg-slate-800/90 border border-slate-700 p-4 md:p-5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase mb-3">{m.auditLogTitle}</h4>
                {auditLogLoading ? (
                  <p className="text-sm text-slate-400">{m.loading}</p>
                ) : !auditLogEntries?.length ? (
                  <p className="text-sm text-slate-400">{m.auditLogEmpty}</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-600">
                          <th className="text-left py-2 px-2 font-medium">{m.auditLogTime}</th>
                          <th className="text-left py-2 px-2 font-medium">{m.auditLogWho}</th>
                          <th className="text-left py-2 px-2 font-medium">{m.auditLogAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogEntries.map((e) => (
                          <tr key={e.id} className="border-b border-slate-700/80">
                            <td className="py-1.5 px-2 text-slate-300 whitespace-nowrap">
                              {new Date(e.created_at).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="py-1.5 px-2 text-slate-300">
                              {e.actor ? (e.actor.display_name || e.actor.email || "—") : "Admin"}
                            </td>
                            <td className="py-1.5 px-2 text-slate-200">
                              {locale === "vi"
                                ? (e.action_type === "member_checkin" ? "Check-in thành viên" : e.action_type === "staff_checkin" ? "Check-in nhân sự" : e.action_type === "membership_extend" ? "Gia hạn" : e.action_type === "membership_freeze" ? "Tạm ngưng" : e.action_type === "membership_cancel" ? "Hủy gói" : e.action_type === "membership_upgrade" ? "Nâng cấp" : e.action_type === "inventory_stock_in" ? "Nhập kho" : e.action_type === "inventory_stock_out" ? "Xuất kho" : e.action_type === "route_reset_complete" ? "Reset tường" : e.action_type === "staff_task_complete" ? "Hoàn thành task" : e.action_type)
                                : (e.action_type === "member_checkin" ? "Member check-in" : e.action_type === "staff_checkin" ? "Staff check-in" : e.action_type === "membership_extend" ? "Extend membership" : e.action_type === "membership_freeze" ? "Freeze" : e.action_type === "membership_cancel" ? "Cancel membership" : e.action_type === "membership_upgrade" ? "Upgrade" : e.action_type === "inventory_stock_in" ? "Stock in" : e.action_type === "inventory_stock_out" ? "Stock out" : e.action_type === "route_reset_complete" ? "Route reset" : e.action_type === "staff_task_complete" ? "Task complete" : e.action_type)}
                              {e.entity_id ? ` (${e.entity_id})` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
          )}

          {/* OPERATIONS area — admin only. Overview (staff-in count, alerts, gym ready), Tasks, Attendance, Coaching, Routes. Staff never see this; they have the "Staff" tab (old /staff workflow) instead. */}
          {adminArea === "operations" && (
            <section className="rounded-2xl bg-white border border-slate-200 shadow-[0_12px_35px_rgba(15,23,42,0.12)] p-4 md:p-6">
              <h2 className="text-lg font-semibold text-slate-900">{m.staffOperations}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {locale === "vi"
                  ? "Bảng điều phối vận hành: staff, nhiệm vụ, attendance, coaching và reset tường."
                  : "Operations control board for staff, tasks, attendance, coaching, and route resets."}
              </p>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80">
                {/* Staff Operations tabs */}
                <div className="flex gap-1 p-2 border-b bg-slate-100 flex-wrap">
                  {(["overview", "tasks", "attendance", "coaching", "routes"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStaffModalTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        staffModalTab === tab
                          ? "bg-white shadow border border-slate-200 text-slate-900"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab === "overview"
                        ? m.staffTabOverview
                        : tab === "tasks"
                        ? m.staffTabTasks
                        : tab === "attendance"
                        ? m.staffTabAttendance
                        : tab === "coaching"
                        ? m.staffTabCoaching
                        : m.staffTabRoutes}
                    </button>
                  ))}
                </div>

                {/* Staff Operations content */}
                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4 bg-white">
                  {!staffOpsData && staffModalTab !== "attendance" && (
                    <p className="text-sm text-slate-500">{m.loading}</p>
                  )}

                  {/* TAB 1 — OVERVIEW (reuse modal content) */}
                  {staffModalTab === "overview" && staffOpsData && (() => {
                    const sum = staffOpsData.summary;
                    const req = sum.staff_required ?? 3;
                    const present = sum.staff_in_today ?? 0;
                    const totalStaff = sum.staff_total ?? req;
                    const preOpenDone = sum.pre_open_completed ?? 0;
                    const preOpenTotal = sum.pre_open_total ?? 0;
                    const closingOver = sum.closing_overdue ?? 0;
                    const zonesOver = sum.zones_overdue ?? 0;
                    const unassigned = sum.unassigned_sessions ?? 0;
                    const staffStatus = present >= req ? "green" : present >= req - 1 ? "yellow" : "red";
                    const preOpenStatus =
                      preOpenTotal === 0
                        ? "green"
                        : preOpenDone >= preOpenTotal
                        ? "green"
                        : preOpenDone >= preOpenTotal - 1
                        ? "yellow"
                        : "red";
                    const phase = staffOpsData.phase ?? {};
                    const currentPhaseLabel = phase.phase_label ?? "Gym Open";
                    const countdownMessage = phase.countdown_message ?? "";
                    const currentPhaseTasks = staffOpsData.currentPhaseTasks ?? [];
                    const phaseCompleted = currentPhaseTasks.filter((t: { status: string }) => t.status === "completed").length;
                    const phaseTotal = currentPhaseTasks.length;
                    const gymReady = staffOpsData.gym_ready === true;
                    const readyToClose = staffOpsData.ready_to_close === true;
                    const routeResetDay = staffOpsData.route_reset_day === true;
                    const sessionsToday = staffOpsData.sessionsToday ?? staffOpsData.sessions ?? [];
                    const nowIso = new Date().toISOString();
                    const alerts: string[] = [];
                    staffOpsData.preOpen?.forEach((t: { status: string; due_time?: string | null; title: string }) => {
                      if (t.status !== "completed" && t.due_time) {
                        const due = String(t.due_time).slice(0, 5);
                        const now = new Date()
                          .toLocaleTimeString("en-GB", {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Los_Angeles",
                          })
                          .slice(0, 5);
                        const [dh, dm] = due.split(":").map(Number);
                        const [nh, nm] = now.split(":").map(Number);
                        const minOver = nh * 60 + nm - (dh * 60 + dm);
                        if (minOver > 0)
                          alerts.push(
                            `${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${
                              locale === "vi" ? "phút" : "min"
                            })`,
                          );
                      }
                    });
                    staffOpsData.closing?.forEach((t: { status: string; due_time?: string | null; title: string }) => {
                      if (t.status !== "completed" && t.due_time) {
                        const due = String(t.due_time).slice(0, 5);
                        const now = new Date()
                          .toLocaleTimeString("en-GB", {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Los_Angeles",
                          })
                          .slice(0, 5);
                        const [dh, dm] = due.split(":").map(Number);
                        const [nh, nm] = now.split(":").map(Number);
                        const minOver = nh * 60 + nm - (dh * 60 + dm);
                        if (minOver > 0)
                          alerts.push(
                            `${t.title} ${locale === "vi" ? "quá hạn" : "overdue"} (${minOver} ${
                              locale === "vi" ? "phút" : "min"
                            })`,
                          );
                      }
                    });
                    staffOpsData.zones
                      ?.filter((z: { overdue?: boolean }) => z.overdue)
                      .forEach((z: { name: string }) =>
                        alerts.push(`${z.name} ${locale === "vi" ? "reset quá hạn" : "reset overdue"}`),
                      );
                    if (unassigned > 0)
                      alerts.push(
                        `${unassigned} ${
                          locale === "vi" ? "buổi coaching chưa giao" : "coaching sessions unassigned"
                        }`,
                      );
                    const staffIn = staffOpsData.attendance?.in ?? [];
                    const getStaffName = (a: {
                      staff_profiles?: { display_name?: string; email?: string } | unknown;
                    }) => {
                      const p = Array.isArray(a.staff_profiles) ? a.staff_profiles[0] : a.staff_profiles;
                      return (
                        ((p as { display_name?: string; email?: string })?.display_name ||
                          (p as { display_name?: string; email?: string })?.email) ??
                        "—"
                      );
                    };
                    const staffIdInSessionNow = new Set<string>();
                    for (const s of sessionsToday) {
                      if (!s.coach_id || !s.end_time) continue;
                      if (s.start_time <= nowIso && s.end_time >= nowIso) staffIdInSessionNow.add(s.coach_id);
                    }
                    const phaseTaskLabel =
                      phase.current_phase === "pre_open"
                        ? locale === "vi"
                          ? "Công việc trước mở cửa"
                          : "Pre-Open Tasks"
                        : phase.current_phase === "closing"
                        ? locale === "vi"
                          ? "Công việc đóng cửa"
                          : "Closing Tasks"
                        : locale === "vi"
                        ? "Công việc trong giờ"
                        : "Gym Open Tasks";
                    const routeLabel = locale === "vi" ? "Reset tường" : "Route Reset";
                    const coachingLabel = locale === "vi" ? "Buổi coaching" : "Coaching Session";
                    return (
                      <>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={staffResetLoading}
                            onClick={async () => {
                              setStaffResetLoading(true);
                              try {
                                const r = await adminFetch("/api/admin/staff/reset-attendance", {
                                  method: "POST",
                                });
                                const d = await r.json();
                                if (r.ok) {
                                  setActionMessage(
                                    locale === "vi"
                                      ? "Đã xóa chấm công hôm nay."
                                      : "Today's staff attendance reset.",
                                  );
                                  adminFetch("/api/admin/staff")
                                    .then((res) => res.json())
                                    .then((data) => setStaffOpsData(data))
                                    .catch(() => setStaffOpsData(null));
                                } else setActionError(d?.error || "Failed");
                              } catch {
                                setActionError("Failed");
                              } finally {
                                setStaffResetLoading(false);
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                          >
                            {staffResetLoading
                              ? "…"
                              : locale === "vi"
                              ? "Xóa chấm công (test)"
                              : "Reset attendance (test)"}
                          </button>
                        </div>
                        {/* CURRENT PHASE — top */}
                        <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            {m.currentPhase}
                          </p>
                          <p className="text-lg font-bold text-slate-800 mt-0.5">{currentPhaseLabel} Phase</p>
                          {countdownMessage && (
                            <p className="text-sm text-slate-600 mt-1">{countdownMessage}</p>
                          )}
                        </div>
                        {/* ROUTE RESET DAY banner */}
                        {routeResetDay && (
                          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                              {m.routeResetDay}
                            </p>
                            <p className="text-sm text-amber-800 mt-1">{m.routeResetDayBanner}</p>
                            {staffOpsData.zones
                              ?.filter(
                                (z: { overdue?: boolean; next_reset_at?: string | null }) =>
                                  z.overdue ||
                                  (z.next_reset_at &&
                                    getGymDateFromISO(z.next_reset_at) === getGymToday()),
                              )
                              .map((z: { name: string }) => (
                                <span
                                  key={z.name}
                                  className="inline-block mt-1 mr-2 text-sm font-medium text-amber-900"
                                >
                                  {z.name}
                                </span>
                              ))}
                          </div>
                        )}
                        {/* OPERATIONS HEALTH */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div
                            className={`rounded-lg border p-2 ${
                              staffStatus === "green"
                                ? "bg-emerald-50 border-emerald-200"
                                : staffStatus === "yellow"
                                ? "bg-amber-50 border-amber-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.staffPresent}
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {present} / {totalStaff}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg border p-2 ${
                              preOpenStatus === "green"
                                ? "bg-emerald-50 border-emerald-200"
                                : preOpenStatus === "yellow"
                                ? "bg-amber-50 border-amber-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.preOpenTasks}
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {preOpenDone} / {preOpenTotal}
                            </p>
                          </div>
                          <div className="rounded-lg border p-2 bg-red-50 border-red-200">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.closingTasksOverdue}
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {closingOver} {locale === "vi" ? "quá hạn" : "overdue"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-2 bg-slate-50 border-slate-200">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.routeResetsOverdue}
                            </p>
                            <p className="text-sm font-bold text-slate-800">{zonesOver}</p>
                          </div>
                          <div className="rounded-lg border p-2 bg-slate-50 border-slate-200">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.unassignedCoaching}
                            </p>
                            <p className="text-sm font-bold text-slate-800">{unassigned}</p>
                          </div>
                          <div className="rounded-lg border p-2 bg-slate-50 border-slate-200">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase">
                              {m.phaseReadiness}
                            </p>
                            <p
                              className={`text-sm font-bold ${
                                readyToClose || gymReady ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {phase.current_phase === "closing" && readyToClose
                                ? (m as { gymReadyToClose?: string }).gymReadyToClose ?? "Gym READY to be closed"
                                : phase.current_phase === "gym_open"
                                ? (m as { gymOperating?: string }).gymOperating ?? "Gym is operating great right now"
                                : phase.current_phase === "closing"
                                ? (locale === "vi" ? "Đang đóng cửa — hoàn thành công việc" : "Closing — complete tasks")
                                : gymReady
                                ? m.gymReady
                                : m.gymNotReady}
                            </p>
                          </div>
                        </div>
                        {/* CURRENT PHASE TASKS */}
                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-[11px] font-semibold text-slate-600 uppercase mb-1">
                            {m.currentPhaseTaskProgress}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">{phaseTaskLabel}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{
                                  width: `${
                                    phaseTotal === 0
                                      ? 0
                                      : Math.round((phaseCompleted / phaseTotal) * 100)
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">
                              {phaseCompleted} / {phaseTotal}
                            </span>
                          </div>
                        </div>
                        {/* ALERTS */}
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-1">
                            {m.operationsAlerts}
                          </p>
                          {alerts.length === 0 ? (
                            <p className="text-sm text-amber-900/80">{m.noOperationalAlerts}</p>
                          ) : (
                            <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                              {alerts.map((a) => (
                                <li key={a}>{a}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* STAFF ACTIVITY FEED + FOCUS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase mb-1">
                              {m.staffActivityFeed}
                            </p>
                            {!staffOpsData.timeline || staffOpsData.timeline.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                {locale === "vi" ? "Chưa có sự kiện." : "No events yet."}
                              </p>
                            ) : (
                              <ul className="space-y-1.5 text-xs text-slate-700 max-h-60 overflow-y-auto pr-1">
                                {staffOpsData.timeline.map(
                                  (e: {
                                    id: string;
                                    completed_at: string;
                                    staff_name: string;
                                    task_title: string;
                                  }) => (
                                    <li key={e.id} className="flex justify-between gap-3">
                                      <span className="flex-1">
                                        {e.staff_name} — {e.task_title}
                                      </span>
                                      <span className="text-slate-400">
                                        {new Date(e.completed_at).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold text-slate-600 uppercase mb-1">
                              {m.staffFocusPanel}
                            </p>
                            {staffIn.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                {locale === "vi"
                                  ? "Không có staff nào đang IN."
                                  : "No staff currently IN."}
                              </p>
                            ) : (
                              <ul className="space-y-1.5 text-xs text-slate-700">
                                {staffIn.map(
                                  (a: {
                                    staff_id: string;
                                    staff_profiles?: {
                                      display_name?: string;
                                      email?: string;
                                    } | unknown;
                                  }) => {
                                    const name = getStaffName(a);
                                    const focus = staffIdInSessionNow.has(a.staff_id)
                                      ? coachingLabel
                                      : routeResetDay
                                      ? routeLabel
                                      : phaseTaskLabel;
                                    return (
                                      <li key={a.staff_id} className="flex justify-between gap-3">
                                        <span className="font-medium text-slate-800">{name}</span>
                                        <span className="text-slate-500">{focus}</span>
                                      </li>
                                    );
                                  },
                                )}
                              </ul>
                            )}
                          </div>
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
                            <thead><tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase"><th className="px-3 py-2">{locale === "vi" ? "Công việc" : "Task Name"}</th><th className="px-3 py-2">{m.phaseColumn}</th><th className="px-3 py-2">{locale === "vi" ? "Trạng thái" : "Status"}</th><th className="px-3 py-2">{m.completedBy}</th><th className="px-3 py-2">{m.completionTime}</th><th className="px-3 py-2">{locale === "vi" ? "Thao tác" : "Action"}</th></tr></thead>
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
                                      <td className="px-3 py-2">
                                        {t.status !== "completed" && (
                                          <button
                                            type="button"
                                            disabled={completingTaskId === t.id}
                                            onClick={async () => {
                                              setCompletingTaskId(t.id);
                                              try {
                                                const res = await adminFetch(`/api/admin/staff/tasks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
                                                if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d));
                                              } finally {
                                                setCompletingTaskId(null);
                                              }
                                            }}
                                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                                          >
                                            {completingTaskId === t.id ? "…" : m.complete}
                                          </button>
                                        )}
                                      </td>
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
                          <thead><tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase"><th className="px-3 py-2">{m.time}</th><th className="px-3 py-2">{m.wallArea}</th><th className="px-3 py-2">{m.coachAssigned}</th><th className="px-3 py-2">{locale === "vi" ? "Trạng thái" : "Status"}</th><th className="px-3 py-2">{locale === "vi" ? "Thao tác" : "Action"}</th></tr></thead>
                          <tbody>
                            {((staffOpsData.sessionsToday ?? staffOpsData.sessions) as { id: string; start_time: string; coach_id: string | null; location?: string; staff_profiles?: { display_name?: string; email?: string } | unknown }[]).map((s) => {
                              const p = Array.isArray(s.staff_profiles) ? s.staff_profiles[0] : s.staff_profiles;
                              const name = (p as { display_name?: string; email?: string })?.display_name || (p as { display_name?: string; email?: string })?.email;
                              return (
                                <tr key={s.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2 text-slate-800">{new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td>
                                  <td className="px-3 py-2 text-slate-700">{s.location ?? "—"}</td>
                                  <td className="px-3 py-2">{s.coach_id ? (name ?? m.assigned) : "—"}</td>
                                  <td className="px-3 py-2">{s.coach_id ? <span className="text-emerald-700">{m.assigned}</span> : <span className="text-amber-700">⚠ {m.unassigned}</span>}</td>
                                  <td className="px-3 py-2">
                                    {!s.coach_id && staffId && (
                                      <button
                                        type="button"
                                        disabled={assigningSessionId === s.id}
                                        onClick={async () => {
                                          setAssigningSessionId(s.id);
                                          try {
                                            const res = await adminFetch("/api/admin/staff/sessions/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: s.id }) });
                                            if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d));
                                          } finally {
                                            setAssigningSessionId(null);
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 disabled:opacity-50"
                                      >
                                        {assigningSessionId === s.id ? "…" : m.assignToMe}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* TAB 5 — ROUTES */}
                  {staffModalTab === "routes" && staffOpsData && (
                    <div className="rounded-lg border border-slate-200 overflow-x-auto overflow-y-visible">
                      <table className="w-full text-sm min-w-[640px]">
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
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>
                                  ) : status === "overdue" ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">⚠ {m.overdue}</span>
                                  ) : status === "in_progress" ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">In Progress</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Pending</span>
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
                                        if (!window.confirm(`${m.areYouSure}\n\n${m.confirmMarkResetComplete}`)) return;
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
            </section>
          )}

          {/* STAFF area (route setter workflow: shift check-in QR, tasks, zones, coaching) — only for role staff */}
          {isStaffAreaActive && role === "staff" && (() => {
            const staffMsg = getMessages(locale).staff;
            if (!staffOpsData) return <section className="rounded-2xl bg-white border border-slate-200 p-6"><p className="text-slate-500">{m.loading}</p></section>;
            const myAtt = (staffOpsData as { myAttendance?: { date: string; status: string } | null }).myAttendance ?? null;
            const today = getGymToday();
            const hasAttendanceForToday = myAtt != null && myAtt.date === today;
            const isIn = hasAttendanceForToday && myAtt.status === "IN";
            const currentBlock = getCurrentPhase();
            const preOpen = (staffOpsData?.preOpen ?? []) as { id: string; title: string; status: string; block?: string; due_time?: string | null; completed_by_name?: string | null; completers?: string[] }[];
            const during = (staffOpsData?.during ?? []) as typeof preOpen;
            const closing = (staffOpsData?.closing ?? []) as typeof preOpen;
            const rawActiveTasks = currentBlock === "pre_open" ? preOpen : currentBlock === "closing" ? closing : during;
            const isRouteResetDay = (staffOpsData?.zones ?? []).some((z: { next_reset_at?: string | null; overdue?: boolean }) => z.overdue || (z.next_reset_at && getGymDateFromISO(z.next_reset_at) === today));
            const isEssentialTask = (title: string) => /anchor|crash|rental|shoe|front desk|pos|bathroom|safety|check bathroom/i.test(title.toLowerCase());
            const activeTasks = isRouteResetDay ? rawActiveTasks.filter((t) => isEssentialTask(t.title)) : rawActiveTasks;
            const activePending = activeTasks.filter((t) => t.status === "pending" || t.status === "upcoming");
            const activeCompleted = activeTasks.filter((t) => t.status === "completed");
            const overdueTasksList = [...preOpen, ...during, ...closing].filter((t) => t.status === "overdue");
            const sessionsToday = (staffOpsData?.sessionsToday ?? staffOpsData?.sessions ?? []) as { id: string; start_time: string; end_time?: string; coach_id: string | null; location?: string }[];
            const mySessions = staffId ? sessionsToday.filter((s) => s.coach_id === staffId) : [];
            const unassignedSessions = sessionsToday.filter((s) => !s.coach_id);
            const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", { hour: "numeric", minute: "2-digit", hour12: locale === "en" });
            const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
            const timeline = (staffOpsData?.timeline ?? []) as { staff_name: string; task_title: string; completed_at: string }[];

            return (
              <section className="space-y-6 rounded-2xl bg-white border border-slate-200 shadow-lg p-4 md:p-6">
                {!hasAttendanceForToday && (
                  <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{staffMsg.dailyAttendance}</h3>
                    {staffCheckInSuccess && (
                      <div className="mb-4 rounded-lg px-4 py-3 bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-sm font-medium">{staffMsg.checkedInSuccess}</div>
                    )}
                    <p className="text-slate-200 font-medium mb-1">{staffMsg.checkInAtFrontDesk}</p>
                    <p className="text-slate-400 text-sm mb-4">{staffMsg.checkInAtFrontDeskHint}</p>
                    <div className="flex flex-col items-center gap-4">
                      <button type="button" onClick={() => staffQrToken && setAdminQrModalVariant("staff")} className="rounded-xl bg-white p-3 inline-block hover:ring-2 ring-emerald-400 focus:outline-none focus:ring-2 ring-emerald-400" title={locale === "vi" ? "Phóng to mã QR" : "Enlarge QR"}>
                        {staffQrToken ? <QRCodeSVG value={staffQrToken} size={180} level="M" /> : null}
                      </button>
                      <p className="text-slate-400 text-xs">{locale === "vi" ? "Nhấn vào mã QR để phóng to" : "Tap QR to enlarge"}</p>
                      <button type="button" disabled={staffAttendanceLoading} onClick={async () => { setStaffAttendanceLoading(true); try { const res = await adminFetch("/api/admin/staff/my-attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "NOT_IN" }) }); if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d)); } finally { setStaffAttendanceLoading(false); } }} className="w-full max-w-xs py-2.5 rounded-lg font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50">{staffMsg.notWorkingToday}</button>
                    </div>
                  </div>
                )}

                {hasAttendanceForToday && !isIn && (
                  <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{staffMsg.dailyAttendance}</h3>
                    <p className="text-slate-400">{staffMsg.youAreMarkedNotWorking}</p>
                  </div>
                )}

                {isIn && staffOpsData && (
                  <>
                    {staffCheckInSuccess && <div className="rounded-xl px-4 py-3 bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-sm font-medium">{staffMsg.checkedInSuccess}</div>}
                    {staffOpsData.route_reset_day && (
                      <div className="rounded-xl bg-amber-900/40 border border-amber-600 p-3">
                        <p className="text-sm font-semibold text-amber-200">⚠ {staffMsg.routeResetDay}</p>
                        <p className="text-xs text-amber-100/90 mt-0.5">{staffMsg.routeResetDayFocus}</p>
                      </div>
                    )}
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{staffMsg.activeTasks}</h3>
                      {activeTasks.length > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-300">{(staffMsg.tasksProgress as string).replace("{done}", String(activeCompleted.length)).replace("{total}", String(activeTasks.length))}</span></div>
                          <div className="h-2 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${activeTasks.length ? (activeCompleted.length / activeTasks.length) * 100 : 0}%` }} /></div>
                        </>
                      )}
                      {overdueTasksList.filter((t) => !isRouteResetDay || isEssentialTask(t.title)).map((t) => (
                        <div key={t.id} className="flex justify-between items-center gap-2 text-sm py-1.5">
                          <span className="text-slate-200">{t.title}</span>
                          <button type="button" disabled={completingTaskId === t.id} onClick={async () => { setCompletingTaskId(t.id); try { const res = await adminFetch(`/api/admin/staff/tasks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) }); if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d)); } finally { setCompletingTaskId(null); } }} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-50">{completingTaskId === t.id ? "…" : staffMsg.complete}</button>
                        </div>
                      ))}
                      {activePending.map((t) => (
                        <div key={t.id} className="flex justify-between items-center gap-2 py-1.5 border-b border-slate-700 last:border-b-0">
                          <span className="text-slate-200 text-sm">{t.title}</span>
                          <button type="button" disabled={completingTaskId === t.id} onClick={async () => { setCompletingTaskId(t.id); try { const res = await adminFetch(`/api/admin/staff/tasks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) }); if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d)); } finally { setCompletingTaskId(null); } }} className="shrink-0 px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-50">{completingTaskId === t.id ? "…" : staffMsg.complete}</button>
                        </div>
                      ))}
                      {activeCompleted.length > 0 && (
                        <div>
                          <button type="button" onClick={() => setStaffCompletedTasksExpanded(!staffCompletedTasksExpanded)} className="w-full text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-0.5 flex items-center justify-between">{staffMsg.completedTasks} ({activeCompleted.length})<span className="text-slate-500">{staffCompletedTasksExpanded ? "▼" : "▶"}</span></button>
                          {staffCompletedTasksExpanded && <ul className="space-y-0.5 mt-1">{activeCompleted.map((t) => <li key={t.id} className="text-sm"><span className="text-emerald-400 line-through">{t.title}</span></li>)}</ul>}
                        </div>
                      )}
                    </div>
                    {timeline.length > 0 && (
                      <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{staffMsg.teamStatus}</h3>
                        <ul className="space-y-1 text-sm max-h-32 overflow-y-auto">{timeline.slice(0, 20).map((c, i) => <li key={i} className="flex justify-between gap-2 py-0.5 border-b border-slate-700/50 last:border-0"><span className="text-slate-200 truncate">{c.staff_name} — {c.task_title}</span><span className="text-slate-500 shrink-0">{new Date(c.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></li>)}</ul>
                      </div>
                    )}
                    <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700">
                      <button type="button" onClick={() => setStaffSubTab("routes")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${staffSubTab === "routes" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>{staffMsg.tabRoutes}</button>
                      <button type="button" onClick={() => setStaffSubTab("coaching")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${staffSubTab === "coaching" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>{staffMsg.tabCoaching}</button>
                    </div>
                    {staffSubTab === "routes" && (
                      <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{staffMsg.routeResetSchedule}</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
                          {(staffOpsData.zones ?? []).map((z: { id: string; name: string; next_reset_at: string | null; assigned_setters?: { staff_id: string; name: string }[]; reset_status?: string }) => {
                            const setters = (z.assigned_setters ?? []);
                            return (
                              <div key={z.id} className="flex-none w-[280px] max-w-[85vw] snap-center rounded-xl border border-slate-700 bg-slate-900/30 p-4 space-y-3">
                                <div className="text-slate-100 font-semibold">{z.name}</div>
                                <div className="text-xs text-slate-400">{staffMsg.next}: <span className="text-slate-200">{formatDate(z.next_reset_at)}</span></div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {setters.length === 0 && <span className="text-sm text-slate-500">{staffMsg.noAssignments}</span>}
                                  {setters.map((s) => <span key={s.staff_id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/70 border border-slate-600 text-slate-200 text-xs">{s.name}{staffId && s.staff_id === staffId && <span className="text-emerald-400">{staffMsg.assignedToYou}</span>}</span>)}
                                  <button type="button" onClick={async () => { const nextIds = Array.from(new Set([...setters.map((s) => s.staff_id), staffId].filter(Boolean))); const res = await adminFetch(`/api/admin/routes/zones/${z.id}/assignments`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staff_ids: nextIds }) }); const d = await res.json(); if (res.ok && d?.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((x) => setStaffOpsData(x)); }} className="px-2 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-200 text-xs hover:bg-slate-700">+ {staffMsg.assignToMe}</button>
                                </div>
                                {(z.reset_status === "in_progress" || z.reset_status === "pending") && (
                                  <button type="button" onClick={async () => { if (!window.confirm(m.confirmMarkResetComplete)) return; const res = await adminFetch(`/api/admin/routes/zones/${z.id}/reset`, { method: "POST" }); if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((x) => setStaffOpsData(x)); }} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-sm hover:bg-slate-600">{staffMsg.markResetComplete}</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {staffSubTab === "coaching" && (
                      <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{staffMsg.todayCoachingSessions}</h3>
                        {mySessions.length > 0 && <div className="mb-3"><p className="text-xs text-slate-400 mb-2">{staffMsg.yourSessions}</p><ul className="space-y-1.5">{mySessions.map((s) => <li key={s.id} className="py-2 px-3 rounded-lg bg-slate-700/50 text-sm"><div className="flex justify-between items-center"><span>{formatTime(s.start_time)} – {s.end_time ? formatTime(s.end_time) : ""}</span><span className="text-emerald-400">{staffMsg.assignedToYou}</span></div></li>)}</ul></div>}
                        {unassignedSessions.length > 0 && <div><p className="text-xs text-slate-400 mb-2">{staffMsg.unassignedTapToTake}</p><ul className="space-y-1.5">{unassignedSessions.map((s) => <li key={s.id} className="py-2 px-3 rounded-lg bg-slate-700/50 text-sm"><div className="flex justify-between items-center"><span>{formatTime(s.start_time)}</span><button type="button" disabled={assigningSessionId === s.id} onClick={async () => { setAssigningSessionId(s.id); try { const res = await adminFetch("/api/admin/staff/sessions/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: s.id }) }); if (res.ok) adminFetch("/api/admin/staff").then((r) => r.json()).then((d) => setStaffOpsData(d)); } finally { setAssigningSessionId(null); } }} className="text-amber-400 hover:text-amber-300 text-sm font-medium disabled:opacity-50">{assigningSessionId === s.id ? "…" : staffMsg.assignToMe}</button></div></li>)}</ul></div>}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })()}

          {/* ANALYTICS — admin only */}
          {adminArea === "analytics" && canAccessAnalytics && (
            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-6">
              <h2 className="text-lg font-semibold text-slate-900">{locale === "vi" ? "Phân tích & Báo cáo" : "Analytics & Reporting"}</h2>
              <p className="text-sm text-slate-600 mt-1">{locale === "vi" ? "Tổng quan hiệu suất phòng gym: doanh thu, thành viên, giữ chân, hành vi và vận hành." : "Full view of gym performance: revenue, members, retention, behavior, and operations."}</p>

              {/* Global filters */}
              <div className="mt-4 flex flex-wrap gap-3 items-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{locale === "vi" ? "Bộ lọc" : "Filters"}</span>
                <select
                  value={analyticsPeriod}
                  onChange={(e) => setAnalyticsPeriod(e.target.value as "day" | "week" | "month" | "custom")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                >
                  <option value="day">{locale === "vi" ? "Ngày" : "Day"}</option>
                  <option value="week">{locale === "vi" ? "Tuần" : "Week"}</option>
                  <option value="month">{locale === "vi" ? "Tháng" : "Month"}</option>
                  <option value="custom">{locale === "vi" ? "Tùy chọn" : "Custom"}</option>
                </select>
                {analyticsPeriod === "custom" && (
                  <>
                    <input type="date" value={analyticsFrom} onChange={(e) => setAnalyticsFrom(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
                    <span className="text-slate-500">–</span>
                    <input type="date" value={analyticsTo} onChange={(e) => setAnalyticsTo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
                  </>
                )}
                <select
                  value={analyticsMemberType}
                  onChange={(e) => setAnalyticsMemberType(e.target.value as "all" | "member" | "newbie" | "casual")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                >
                  <option value="all">{locale === "vi" ? "Tất cả thành viên" : "All members"}</option>
                  <option value="member">{locale === "vi" ? "Thành viên (gói)" : "Member"}</option>
                  <option value="newbie">{locale === "vi" ? "Newbie" : "Newbie"}</option>
                  <option value="casual">{locale === "vi" ? "Khách lẻ" : "Casual"}</option>
                </select>
                <select
                  value={analyticsActivity}
                  onChange={(e) => setAnalyticsActivity(e.target.value as "all" | "active" | "inactive")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                >
                  <option value="all">{locale === "vi" ? "Mọi trạng thái" : "All activity"}</option>
                  <option value="active">{locale === "vi" ? "Đang hoạt động" : "Active"}</option>
                  <option value="inactive">{locale === "vi" ? "Không hoạt động" : "Inactive"}</option>
                </select>
                <select
                  value={analyticsActivityLevel}
                  onChange={(e) => setAnalyticsActivityLevel(e.target.value as "all" | "highly_active" | "moderate" | "low_activity" | "inactive")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                >
                  <option value="all">{locale === "vi" ? "Mọi mức hoạt động" : "All activity levels"}</option>
                  <option value="highly_active">{locale === "vi" ? "Rất tích cực (3+ lượt/tuần)" : "Highly active (3+/week)"}</option>
                  <option value="moderate">{locale === "vi" ? "Trung bình (1–2 lượt/tuần)" : "Moderate (1–2/week)"}</option>
                  <option value="low_activity">{locale === "vi" ? "Ít hoạt động" : "Low activity"}</option>
                  <option value="inactive">{locale === "vi" ? "Không hoạt động" : "Inactive"}</option>
                </select>
              </div>

              {/* Analytics sub-tabs */}
              <nav className="mt-4 flex gap-1 p-1 border-b border-slate-200 overflow-x-auto" aria-label="Analytics tabs">
                {(["overview", "revenue", "members", "retention", "behavior", "funnel", "operations", "staff"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAnalyticsTab(t)}
                    className={`flex-none whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium ${
                      analyticsTab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t === "overview" ? (locale === "vi" ? "Tổng quan" : "Overview") : null}
                    {t === "revenue" ? (locale === "vi" ? "Doanh thu" : "Revenue") : null}
                    {t === "members" ? (locale === "vi" ? "Thành viên" : "Members") : null}
                    {t === "retention" ? (locale === "vi" ? "Giữ chân" : "Retention") : null}
                    {t === "behavior" ? (locale === "vi" ? "Hành vi" : "Behavior") : null}
                    {t === "funnel" ? (locale === "vi" ? "Phễu" : "Funnel") : null}
                    {t === "operations" ? (locale === "vi" ? "Vận hành" : "Operations") : null}
                    {t === "staff" ? (locale === "vi" ? "Nhân sự" : "Staff") : null}
                  </button>
                ))}
              </nav>

              <div className="mt-6">
                <AnalyticsCharts data={analyticsData} tab={analyticsTab} locale={locale} loading={analyticsLoading} />
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Profile modal — who is logged in; display name editable for staff and frontdesk */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProfileModalOpen(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-600 shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{t.profileTab}</h3>
              <button type="button" onClick={() => setProfileModalOpen(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            <p className="text-sm text-slate-300"><span className="text-slate-500">{locale === "vi" ? "Email" : "Email"}:</span> {session?.user?.email ?? "—"}</p>
            <p className="text-sm text-slate-300"><span className="text-slate-500">{locale === "vi" ? "Vai trò" : "Role"}:</span> {role === "admin" ? "Admin" : role === "frontdesk" ? (locale === "vi" ? "Quầy lễ tân" : "Front Desk") : "Staff"}</p>
            {(staffId || role === "staff" || role === "frontdesk") && (
              <>
                <p className="text-sm text-slate-300"><span className="text-slate-500">{t.profileCheckinsThisMonth}:</span> {profileAttendanceStats === null ? "—" : profileAttendanceStats.checkins_this_month}</p>
                {profileAttendanceStats !== null && profileAttendanceStats.checkins_this_month > 0 && (
                  <p className="text-sm text-slate-300"><span className="text-slate-500">{locale === "vi" ? "Đúng giờ" : "On time"}:</span> {profileAttendanceStats.on_time_100 ? t.profileOnTime100 : (t.profileOnTimeNot100 as string).replace("{onTime}", String(profileAttendanceStats.on_time_count)).replace("{total}", String(profileAttendanceStats.checkins_this_month))}</p>
                )}
                {adminProfileEditing ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400">{locale === "vi" ? "Tên hiển thị" : "Display name"}</label>
                    <input type="text" value={adminProfileDisplayName} onChange={(e) => setAdminProfileDisplayName(e.target.value)} placeholder={locale === "vi" ? "Tên hiển thị khi làm coach" : "Name shown as coach"} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 text-sm" />
                    <div className="flex gap-2">
                      <button type="button" disabled={adminProfileSaving} onClick={async () => { setAdminProfileSaving(true); try { const res = await adminFetch("/api/admin/staff/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: adminProfileDisplayName.trim() || null }) }); if (res.ok) { refreshMe(); setProfileModalOpen(false); } } finally { setAdminProfileSaving(false); } }} className="px-3 py-1.5 rounded-lg bg-amber-600 text-slate-900 text-sm font-medium hover:bg-amber-500 disabled:opacity-50">{adminProfileSaving ? "…" : (locale === "vi" ? "Lưu" : "Save")}</button>
                      <button type="button" onClick={() => { setAdminProfileEditing(false); setAdminProfileDisplayName(staffDisplayName ?? (role === "frontdesk" ? "Front Desk" : session?.user?.email?.split("@")[0] ?? "")); }} className="px-3 py-1.5 rounded-lg border border-slate-500 text-slate-300 text-sm">{m.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300"><span className="text-slate-500">{locale === "vi" ? "Tên hiển thị" : "Display name"}:</span> {staffDisplayName || (role === "frontdesk" ? (locale === "vi" ? "Quầy lễ tân" : "Front Desk") : "") || (locale === "vi" ? "Chưa đặt" : "Not set")} <button type="button" onClick={() => setAdminProfileEditing(true)} className="ml-2 text-xs text-amber-400 hover:underline">{locale === "vi" ? "Sửa" : "Edit"}</button></p>
                )}
                {/* Verified identity (DOB, VN eID, gender) — same as /dashboard profile */}
                {staffProfile && (
                  <div className="border-t border-slate-600 pt-4 mt-4 space-y-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{locale === "vi" ? "Xác minh danh tính" : "Verify identity"}</p>
                    {profileModalVerifiedFromCccd && <p className="text-xs text-emerald-400">{locale === "vi" ? "Đã xác minh từ CCCD" : "Verified from CCCD"}</p>}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{m.govtId}{profileModalVerifiedFromCccd && <span className="ml-1 text-slate-500">({t.verifiedFromCccdLocked})</span>}</label>
                      <div className="flex gap-2">
                        <input type="text" value={adminProfileIdNumber} onChange={(e) => { setAdminProfileIdNumber(e.target.value); setAdminProfileSaveError(null); }} placeholder={locale === "vi" ? "Số CCCD hoặc hộ chiếu" : "CCCD or passport number"} disabled={profileModalVerifiedFromCccd} className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
                        {!profileModalVerifiedFromCccd && (
                          <button type="button" onClick={() => { setAdminProfileSaveError(null); setAdminProfileEidScannerOpen(true); }} className="shrink-0 px-3 py-2 rounded-lg bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500">{t.scanVnEid}</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{m.dateOfBirth}{profileModalVerifiedFromCccd && <span className="ml-1 text-slate-500">({t.verifiedFromCccdLocked})</span>}</label>
                      <input type="date" value={adminProfileDateOfBirth} onChange={(e) => setAdminProfileDateOfBirth(e.target.value)} disabled={profileModalVerifiedFromCccd} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{m.genderLabel}{profileModalVerifiedFromCccd && <span className="ml-1 text-slate-500">({t.verifiedFromCccdLocked})</span>}</label>
                      <select value={adminProfileGender} onChange={(e) => setAdminProfileGender(e.target.value as "male" | "female" | "")} disabled={profileModalVerifiedFromCccd} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        <option value="">{locale === "vi" ? "Chọn" : "Select"}</option>
                        <option value="male">{m.male}</option>
                        <option value="female">{m.female}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{m.address}{profileModalVerifiedFromCccd && <span className="ml-1 text-slate-500">({t.verifiedFromCccdLocked})</span>}</label>
                      <input type="text" value={adminProfileAddress} onChange={(e) => setAdminProfileAddress(e.target.value)} placeholder={locale === "vi" ? "Địa chỉ" : "Address"} disabled={profileModalVerifiedFromCccd} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
                    </div>
                    {adminProfileSaveError && <p className="text-sm text-red-400">{adminProfileSaveError}</p>}
                    {!profileModalVerifiedFromCccd && (
                      <button type="button" disabled={adminProfileSaving} onClick={async () => { setAdminProfileSaveError(null); setAdminProfileSaving(true); try { const body: { display_name?: string | null; id_number?: string | null; date_of_birth?: string | null; gender?: string | null; address?: string | null; id_verified_from_cccd?: boolean } = { display_name: adminProfileDisplayName.trim() || null, id_number: adminProfileIdNumber.trim() || null, date_of_birth: adminProfileDateOfBirth.trim() || null, gender: adminProfileGender || null, address: adminProfileAddress.trim() || null }; if (adminProfileCccdScanPending) body.id_verified_from_cccd = true; const res = await adminFetch("/api/admin/staff/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (res.ok) { refreshMe(); setProfileModalOpen(false); } else { const d = await res.json(); setAdminProfileSaveError(d.error ?? "Failed"); } } finally { setAdminProfileSaving(false); } }} className="w-full py-2 rounded-lg bg-amber-600 text-slate-900 text-sm font-medium hover:bg-amber-500 disabled:opacity-50">{adminProfileSaving ? "…" : (locale === "vi" ? "Lưu hồ sơ" : "Save profile")}</button>
                    )}
                  </div>
                )}
                {adminProfileEidScannerOpen && (
                  <EidQrScannerModal open={adminProfileEidScannerOpen} onClose={() => setAdminProfileEidScannerOpen(false)} onScanned={async (rawContent) => { const cccd = parseCccdPipeDelimited(rawContent); if (!cccd) return; setAdminProfileSaveError(null); try { const res = await adminFetch(`/api/admin/staff/profile/check-id?id_number=${encodeURIComponent(cccd.id_number)}`); const data = await res.json(); if (!res.ok || !data.available) { setAdminProfileSaveError(t.idAlreadyRegistered); return; } setAdminProfileIdNumber(cccd.id_number); setAdminProfileDateOfBirth(cccd.date_of_birth); setAdminProfileGender(cccd.gender); setAdminProfileAddress(cccd.address); setAdminProfileCccdScanPending(true); setAdminProfileEidScannerOpen(false); } catch { setAdminProfileSaveError(locale === "vi" ? "Không thể kiểm tra." : "Could not check."); } }} onError={(msg) => setAdminProfileSaveError(msg)} title={t.scanVnEid} hint={t.scanVnEidHint} />
                )}
              </>
            )}
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
                          {productDetailEditProduct.image && <img key={productDetailEditProduct.image} src={productDetailEditProduct.image} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-600" />}
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
                      <span className="text-slate-500">{paymentVisitsAdded ? m.addsVisits : m.afterPurchase}</span>
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

      {/* Admin/Front desk check-in QR fullscreen modal (same idea as dashboard: enlarge, token rotates every 30s) */}
      {adminQrModalVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={() => setAdminQrModalVariant(null)}>
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setAdminQrModalVariant(null)}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20"
              aria-label={locale === "vi" ? "Đóng" : "Close"}
            >
              <span className="text-lg">&times;</span>
            </button>
          </div>
          <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white/90 tracking-[0.18em] uppercase mb-2">
              {locale === "vi" ? "CHECK-IN NHÂN VIÊN" : "STAFF CHECK-IN"}
            </h2>
            <div className="rounded-3xl bg-black border border-white/20 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.9)]">
              {(adminQrModalVariant === "shift" ? shiftCheckInQrToken : staffQrToken) ? (
                <QRCodeSVG
                  value={adminQrModalVariant === "shift" ? shiftCheckInQrToken! : staffQrToken!}
                  size={320}
                  level="M"
                  bgColor="transparent"
                  fgColor="#ffffff"
                />
              ) : (
                <span className="block w-[320px] h-[320px] flex items-center justify-center text-white/60">{m.loading}</span>
              )}
            </div>
            <p className="mt-4 text-xs text-white/80 text-center">
              {locale === "vi" ? "Đưa mã này cho quầy lễ tân để chấm công. Mã thay đổi mỗi 30 giây." : "Show this code to the front desk to check in. Code refreshes every 30 seconds."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

