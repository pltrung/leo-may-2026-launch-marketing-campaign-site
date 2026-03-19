"use client";

import React, { useEffect, useState } from "react";

/** Optional navigation to run when this step is shown (e.g. switch to a tab so the target is visible). */
export interface TourStepNavigate {
  area?: "front_desk" | "operations" | "management" | "staff" | "analytics";
  frontDeskTab?: "checkin" | "member";
  managementTab?: "inventory" | "admin_tools";
  staffSubTab?: "routes" | "coaching";
  operationsTab?: "overview" | "tasks" | "attendance" | "coaching" | "routes";
  analyticsTab?: "overview" | "revenue_members" | "engagement" | "ops_team" | "marketing";
  /** Dashboard member app: switch tab so target is visible. */
  dashboardTab?: "membership" | "activity" | "redeem" | "events" | "leaderboard";
}

export interface TourStep {
  id: string;
  target: string;
  titleEn: string;
  titleVi: string;
  contentEn: string;
  contentVi: string;
  /** When this step is shown, call onNavigate with this so the app can switch to the right tab. */
  navigate?: TourStepNavigate;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onClose: () => void;
  locale: "en" | "vi";
  /** Called when the current step changes (including step's optional navigate). Use to set admin area/tabs so the target element is visible. */
  onNavigate?: (step: TourStep) => void;
  /** When provided, Next/Done is disabled until this returns true for the current step (e.g. onboarding: complete waiver, then pass, then photo). */
  getCanAdvance?: (stepIndex: number) => boolean;
  /** When provided and user clicks Done on the last step, call this instead of onClose (e.g. transition from onboarding to main tour). */
  onOnboardingComplete?: () => void;
}

export function GuidedTour({ steps, isActive, onClose, locale, onNavigate, getCanAdvance, onOnboardingComplete }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [modalAtTop, setModalAtTop] = useState(false);

  const step = steps[stepIndex];
  const t = (en: string, vi: string) => (locale === "vi" ? vi : en);
  const canAdvance = typeof getCanAdvance === "function" ? getCanAdvance(stepIndex) : true;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!isActive || !step) {
      setHighlightRect(null);
      return;
    }
    if (typeof onNavigate === "function") onNavigate(step);
  }, [isActive, stepIndex, step?.id, onNavigate]);

  useEffect(() => {
    if (!isActive || !step) {
      setHighlightRect(null);
      return;
    }
    const updateRect = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect(rect);
        const vh = typeof window !== "undefined" ? window.innerHeight : 600;
        setModalAtTop(rect.bottom > vh * 0.55);
      } else {
        setHighlightRect(null);
      }
    };
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const delay = step.navigate ? 500 : 150;
      const t0 = setTimeout(updateRect, delay);
      const t1 = setTimeout(updateRect, delay + 200);
      const onScroll = () => updateRect();
      const onResize = () => updateRect();
      window.addEventListener("scroll", onScroll, true);
      document.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onResize);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
        window.removeEventListener("scroll", onScroll, true);
        document.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onResize);
      };
    }
    if (step.navigate) {
      const retryDelays = [300, 600, 1000, 1500, 2200];
      const timers = retryDelays.map((d) => setTimeout(updateRect, d));
      const onScroll = () => updateRect();
      const onResize = () => updateRect();
      window.addEventListener("scroll", onScroll, true);
      document.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onResize);
      return () => {
        timers.forEach((t) => clearTimeout(t));
        window.removeEventListener("scroll", onScroll, true);
        document.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onResize);
      };
    }
    setHighlightRect(null);
    setModalAtTop(false);
  }, [isActive, stepIndex, step?.target, step?.navigate]);

  if (!isActive || steps.length === 0 || !step) return null;

  const title = t(step.titleEn, step.titleVi);
  const content = t(step.contentEn, step.contentVi);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      {/* Highlight border */}
      {highlightRect && (
        <div
          className="absolute border-2 border-amber-400 rounded-lg shadow-lg shadow-amber-500/20 bg-transparent pointer-events-none transition-all duration-300"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}
      {/* Modal: above highlight when highlight is in lower half so it doesn't cover target */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl bg-slate-800 border border-slate-600 shadow-xl p-4 pointer-events-auto max-h-[min(70vh,400px)] overflow-y-auto ${modalAtTop && highlightRect ? "top-6" : "bottom-6 sm:bottom-8"}`}
      >
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{content}</p>
        {!canAdvance && (
          <p className="text-xs text-amber-300/90 mb-3">
            {locale === "vi" ? "Hoàn thành bước này để tiếp tục." : "Complete this step to continue."}
          </p>
        )}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white"
          >
            {locale === "vi" ? "Đóng" : "Close"}
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-600 text-white hover:bg-slate-500"
              >
                {locale === "vi" ? "Trước" : "Back"}
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                disabled={!canAdvance}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {locale === "vi" ? "Tiếp" : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isLastStep && onOnboardingComplete) onOnboardingComplete();
                  else onClose();
                }}
                disabled={!canAdvance}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {locale === "vi" ? "Hoàn thành" : "Done"}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {stepIndex + 1} / {steps.length}
        </p>
      </div>
    </div>
  );
}

export const TOUR_STEPS_FRONTDESK: TourStep[] = [
  { id: "frontdesk-status-banner", target: "[data-tour=frontdesk-status-banner]", titleEn: "Today at a glance", titleVi: "Tóm tắt hôm nay", contentEn: "Gym status, check-ins today, and inventory needing restock. Each card is clickable — tap one to jump straight to that section (e.g. Check-ins → Front Desk Check-in tab; Inventory → Management).", contentVi: "Trạng thái gym, check-in hôm nay, kho cần nhập thêm. Mỗi thẻ đều có thể nhấn — nhấn để chuyển nhanh (vd Check-in → tab Check-in; Kho → Quản lý).", navigate: { area: "front_desk" } },
  { id: "area-fd", target: "[data-tour=area-front_desk]", titleEn: "Front Desk", titleVi: "Quầy lễ tân", contentEn: "This is the Front Desk area. Here you check in members and look up member profiles.", contentVi: "Đây là khu Quầy lễ tân. Tại đây bạn check-in thành viên và tra cứu hồ sơ thành viên.", navigate: { area: "front_desk" } },
  { id: "fd-checkin", target: "[data-tour=fd-checkin]", titleEn: "Check-in tab", titleVi: "Tab Check-in", contentEn: "Use the Check-in tab for quick member check-in. You'll see the main \"Scan to check-in\" button here.", contentVi: "Dùng tab Check-in để check-in thành viên nhanh. Bạn sẽ thấy nút \"Quét để check-in\" chính ở đây.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "qr-scan", target: "[data-tour=qr-scan]", titleEn: "How to check in a member", titleVi: "Cách check-in thành viên", contentEn: "Example: Click this button to open the QR scanner. Scan the member's code (card or app) and they're checked in. Quick and clear.", contentVi: "Ví dụ: Nhấn nút này để mở máy quét QR. Quét mã thành viên (thẻ hoặc app) là xong check-in. Nhanh và rõ ràng.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "fd-member", target: "[data-tour=fd-member]", titleEn: "Member tab", titleVi: "Tab Thành viên", contentEn: "Switch to the Member tab when you need to search for someone by name or ID, or view their profile and visit history.", contentVi: "Chuyển sang tab Thành viên khi cần tìm ai đó theo tên hoặc ID, hoặc xem hồ sơ và lịch sử đến.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  { id: "member-lookup", target: "[data-tour=member-lookup]", titleEn: "Member lookup", titleVi: "Tra cứu thành viên", contentEn: "Enter member ID or name here and click Search to open their profile. You can also use QR scan from the member flow to find them.", contentVi: "Nhập mã hoặc tên thành viên tại đây và nhấn Tìm để mở hồ sơ. Bạn cũng có thể dùng quét QR trong luồng thành viên để tìm.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  { id: "area-mgmt", target: "[data-tour=area-management]", titleEn: "Management (Inventory)", titleVi: "Quản lý (Kho)", contentEn: "If you have access, Management holds Inventory: add stock, scan barcodes, and see what needs restocking.", contentVi: "Nếu bạn có quyền, Quản lý gồm Kho: nhập hàng, quét barcode và xem món cần bổ sung.", navigate: { area: "management" } },
  { id: "tab-inventory", target: "[data-tour=tab-inventory]", titleEn: "Inventory tab", titleVi: "Tab Kho", contentEn: "Open the Inventory tab to add or adjust stock. You'll scan a barcode (or type it), then enter quantity and choose Stock In or Stock Out.", contentVi: "Mở tab Kho để thêm hoặc điều chỉnh tồn kho. Bạn quét barcode (hoặc nhập), rồi nhập số lượng và chọn Nhập kho hoặc Xuất kho.", navigate: { area: "management", managementTab: "inventory" } },
  { id: "inventory-scan", target: "[data-tour=inventory-scan]", titleEn: "How to add inventory", titleVi: "Cách thêm tồn kho", contentEn: "Example: Type or scan a product barcode here. If the product exists, it will show below. Then enter quantity and click \"Stock In\" to record new stock. Use \"Scan barcode\" for the camera.", contentVi: "Ví dụ: Nhập hoặc quét mã vạch sản phẩm tại đây. Nếu sản phẩm có trong hệ thống sẽ hiện bên dưới. Sau đó nhập số lượng và nhấn \"Nhập kho\" để ghi nhận hàng mới. Dùng \"Quét mã\" cho camera.", navigate: { area: "management", managementTab: "inventory" } },
  { id: "inventory-stock-in", target: "[data-tour=inventory-stock-in]", titleEn: "Stock In button", titleVi: "Nút Nhập kho", contentEn: "After scanning a product and entering quantity, click \"Stock In\" to add that quantity to inventory. (This button appears once a product is found.)", contentVi: "Sau khi quét sản phẩm và nhập số lượng, nhấn \"Nhập kho\" để cộng số lượng đó vào tồn kho. (Nút này chỉ hiện khi đã tìm thấy sản phẩm.)", navigate: { area: "management", managementTab: "inventory" } },
];

/** Step ids only included in admin tour when user has Admin Tools (CEO). */
export const ADMIN_TOUR_STEP_IDS_ADMIN_TOOLS = ["admin-tools-tab", "admin-tools-section"] as const;

export const TOUR_STEPS_STAFF: TourStep[] = [
  { id: "area-staff", target: "[data-tour=area-staff]", titleEn: "Staff — your home tab", titleVi: "Nhân sự — tab chính", contentEn: "Your nav usually starts with Staff, then Front Desk if you can work the counter. Here: tasks, routes, coaching. Check in for your shift first.", contentVi: "Menu thường bắt đầu bằng Nhân sự, rồi Quầy lễ tân nếu bạn làm quầy. Tại đây: nhiệm vụ, tường, coaching. Check-in ca trước.", navigate: { area: "staff" } },
  { id: "staff-commission-bar", target: "[data-tour=staff-commission-bar]", titleEn: "Sales & commission", titleVi: "Doanh số & hoa hồng", contentEn: "When you're checked in, this bar shows today’s sales and your commission from check-ins and POS. Track your earnings at a glance.", contentVi: "Khi bạn đã check-in ca, thanh này hiện doanh số và hoa hồng hôm nay từ check-in và POS. Xem thu nhập nhanh.", navigate: { area: "staff" } },
  { id: "staff-status-banner", target: "[data-tour=staff-status-banner]", titleEn: "Today at a glance — clickable", titleVi: "Tóm tắt hôm nay — có thể nhấn", contentEn: "Gym, Tasks (by phase), Coaching today, Route reset. Each card is clickable — tap to jump to that section (e.g. Tasks → your tasks list; Coaching → Coaching tab; Route reset → Routes tab).", contentVi: "Gym, Nhiệm vụ (theo giai đoạn), Coaching hôm nay, Reset tường. Mỗi thẻ đều có thể nhấn — nhấn để chuyển nhanh (vd Nhiệm vụ → danh sách; Coaching → tab Coaching; Reset tường → tab Tường leo).", navigate: { area: "staff" } },
  { id: "tasks", target: "[data-tour=tasks-section]", titleEn: "Daily tasks", titleVi: "Nhiệm vụ hàng ngày", contentEn: "Your tasks for the day appear here (Pre-Open, Gym open, Closing). Progress is shown at the top.", contentVi: "Nhiệm vụ trong ngày hiển thị ở đây (Pre-Open, Giờ mở, Đóng cửa). Tiến độ hiển thị ở trên.", navigate: { area: "staff" } },
  { id: "task-complete", target: "[data-tour=task-complete]", titleEn: "How to complete a task", titleVi: "Cách hoàn thành nhiệm vụ", contentEn: "Example: When you finish a task (e.g. \"Check mats\"), click the green \"Complete\" button next to it. The task is then marked done and your progress updates.", contentVi: "Ví dụ: Khi bạn xong một nhiệm vụ (vd \"Kiểm tra thảm\"), nhấn nút xanh \"Hoàn thành\" bên cạnh. Nhiệm vụ sẽ được đánh dấu xong và tiến độ cập nhật.", navigate: { area: "staff" } },
  { id: "area-fd-staff", target: "[data-tour=area-front_desk]", titleEn: "Front Desk — earn commission", titleVi: "Quầy lễ tân — kiếm hoa hồng", contentEn: "Staff can work at Front Desk too. Scan a member's QR to check them in, or look up a member and use the Sales tab to scan barcode of items and complete a sale. Both count toward your commission shown at the top.", contentVi: "Nhân sự cũng có thể làm tại Quầy lễ tân. Quét QR thành viên để check-in, hoặc tra cứu thành viên rồi dùng tab Bán hàng để quét mã vạch sản phẩm và hoàn tất giao dịch. Cả hai đều tính vào hoa hồng hiển thị ở trên.", navigate: { area: "front_desk" } },
  { id: "fd-checkin-staff", target: "[data-tour=fd-checkin]", titleEn: "Check-in — scan member QR", titleVi: "Check-in — quét QR thành viên", contentEn: "Use the Check-in tab to scan a member's QR code (card or app). Each check-in you do can count toward your commission. Quick and clear.", contentVi: "Dùng tab Check-in để quét mã QR thành viên (thẻ hoặc app). Mỗi lần check-in bạn thực hiện có thể tính vào hoa hồng. Nhanh và rõ ràng.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "qr-scan-staff", target: "[data-tour=qr-scan]", titleEn: "Scan to check-in", titleVi: "Quét để check-in", contentEn: "Click this button to open the QR scanner, then scan the member's code. They're checked in and your activity is tracked for commission.", contentVi: "Nhấn nút này để mở máy quét QR, sau đó quét mã thành viên. Thành viên được check-in và hoạt động của bạn được ghi nhận cho hoa hồng.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "fd-member-staff", target: "[data-tour=fd-member]", titleEn: "Member + Sales for commission", titleVi: "Thành viên + Bán hàng để có hoa hồng", contentEn: "Switch to the Member tab to search for a member. Open their profile, then go to the Sales tab. There you can type or scan barcode of items, add to cart, and complete the sale — you earn commission on that sale.", contentVi: "Chuyển sang tab Thành viên để tìm thành viên. Mở hồ sơ của họ, rồi vào tab Bán hàng. Tại đó bạn có thể nhập hoặc quét mã vạch sản phẩm, thêm vào giỏ và hoàn tất giao dịch — bạn được hoa hồng từ giao dịch đó.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  { id: "pos-scan-barcode-staff", target: "[data-tour=pos-scan-barcode]", titleEn: "Scan barcode of items — earn commission", titleVi: "Quét mã vạch sản phẩm — kiếm hoa hồng", contentEn: "In a member's Sales tab: type SKU or click \"Scan barcode\" to scan an item. Add to cart and complete checkout. The sale counts toward your commission shown at the top.", contentVi: "Trong tab Bán hàng của thành viên: nhập SKU hoặc nhấn \"Quét mã\" để quét sản phẩm. Thêm vào giỏ và hoàn tất thanh toán. Giao dịch được tính vào hoa hồng hiển thị ở trên.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  { id: "tab-routes", target: "[data-tour=tab-routes]", titleEn: "Routes tab", titleVi: "Tab Tường leo", contentEn: "Open the Routes tab to see zones and route reset schedule. You can assign yourself to a zone and mark resets complete.", contentVi: "Mở tab Tường leo để xem các khu và lịch reset. Bạn có thể gán mình vào một khu và đánh dấu hoàn thành reset.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "routes-zones", target: "[data-tour=routes-zones]", titleEn: "Route reset zones", titleVi: "Khu reset tường", contentEn: "Each card is a zone. You see next reset date and who is assigned. Use \"+ Assign to me\" to add yourself to that zone's reset.", contentVi: "Mỗi thẻ là một khu. Bạn thấy ngày reset tiếp theo và ai được gán. Dùng \"+ Gán cho tôi\" để thêm mình vào reset khu đó.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "route-assign-me", target: "[data-tour=route-assign-me]", titleEn: "How to assign route reset", titleVi: "Cách gán reset tường", contentEn: "Example: Click \"+ Assign to me\" on a zone card to assign yourself to that zone's route reset. When the reset is done, use \"Mark reset complete\" on the same card.", contentVi: "Ví dụ: Nhấn \"+ Gán cho tôi\" trên thẻ khu để gán mình vào reset tường khu đó. Khi reset xong, dùng \"Đánh dấu hoàn thành\" trên cùng thẻ.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "tab-coaching", target: "[data-tour=tab-coaching]", titleEn: "Coaching tab", titleVi: "Tab Coaching", contentEn: "Switch to the Coaching tab to see today's coaching sessions. Sessions assigned to you and unassigned sessions are listed.", contentVi: "Chuyển sang tab Coaching để xem các buổi coaching hôm nay. Buổi gán cho bạn và buổi chưa gán được liệt kê.", navigate: { area: "staff", staffSubTab: "coaching" } },
  { id: "coaching-assign", target: "[data-tour=coaching-assign]", titleEn: "How to take a coaching session", titleVi: "Cách nhận buổi coaching", contentEn: "Example: Under unassigned sessions, click \"Assign to me\" next to a time slot to assign yourself to that coaching session.", contentVi: "Ví dụ: Ở mục buổi chưa gán, nhấn \"Gán cho tôi\" bên cạnh khung giờ để gán mình vào buổi coaching đó.", navigate: { area: "staff", staffSubTab: "coaching" } },
];

export const TOUR_STEPS_ADMIN: TourStep[] = [
  // 1. FRONT DESK (left to right: first tab)
  { id: "area-fd", target: "[data-tour=area-front_desk]", titleEn: "Front Desk", titleVi: "Quầy lễ tân", contentEn: "Front Desk: check-in and member lookup. Use Check-in tab to scan QR; Member tab to search and view profiles.", contentVi: "Quầy lễ tân: check-in và tra cứu thành viên. Dùng tab Check-in để quét QR; tab Thành viên để tìm và xem hồ sơ.", navigate: { area: "front_desk" } },
  { id: "fd-checkin", target: "[data-tour=fd-checkin]", titleEn: "Check-in tab", titleVi: "Tab Check-in", contentEn: "Check-in tab holds the main \"Scan to check-in\" button for member QR scan.", contentVi: "Tab Check-in chứa nút chính \"Quét để check-in\" cho quét QR thành viên.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "fd-member", target: "[data-tour=fd-member]", titleEn: "Member tab", titleVi: "Tab Thành viên", contentEn: "Member tab: search by ID or name, open profiles, view visit history.", contentVi: "Tab Thành viên: tìm theo ID hoặc tên, mở hồ sơ, xem lịch sử đến.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  // 2. OPERATIONS (second tab) — overview, gym status, phase, attendance, coaching, routes
  { id: "area-ops", target: "[data-tour=area-operations]", titleEn: "Operations", titleVi: "Vận hành", contentEn: "Operations is your control board: overview, gym status, current phase, staff attendance, coaching sessions, and route resets. Use the sub-tabs below to switch between them.", contentVi: "Vận hành là bảng điều phối: tổng quan, trạng thái gym, giai đoạn hiện tại, chấm công nhân sự, buổi coaching và reset tường. Dùng các sub-tab bên dưới để chuyển.", navigate: { area: "operations" } },
  { id: "admin-ops-bar", target: "[data-tour=admin-ops-bar]", titleEn: "Operations quick summary", titleVi: "Tóm tắt Vận hành", contentEn: "This bar shows Staff Present, Gym, Open alerts, and Operations Alerts. Expand it (▼ Details) to see the cards — each is clickable and jumps to the right place (e.g. Staff Present → Operations Overview).", contentVi: "Thanh này hiện Nhân sự có mặt, Gym, Cảnh báo mở và Cảnh báo vận hành. Mở rộng (▼ Chi tiết) để xem các thẻ — mỗi thẻ đều có thể nhấn để chuyển (vd Nhân sự có mặt → Tổng quan Vận hành).", navigate: { area: "operations" } },
  { id: "ops-overview", target: "[data-tour=operations-tab-overview]", titleEn: "Overview tab", titleVi: "Tab Tổng quan", contentEn: "Overview shows a summary: staff present today, Pre-Open and Closing task progress, gym readiness, current phase (Pre-Open / Gym Open / Closing), and any alerts. Check this first each day.", contentVi: "Tổng quan hiển thị: nhân sự có mặt hôm nay, tiến độ Pre-Open và Đóng cửa, sẵn sàng mở cửa, giai đoạn hiện tại (Pre-Open / Mở cửa / Đóng cửa) và cảnh báo. Kiểm tra mục này trước mỗi ngày.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-gym-status", target: "[data-tour=operations-gym-status]", titleEn: "Gym status", titleVi: "Trạng thái gym", contentEn: "Gym readiness shows whether the gym is ready to open or ready to close based on completed tasks. Use this to know when you can open doors or wrap up.", contentVi: "Sẵn sàng mở cửa cho biết gym đã sẵn sàng mở hay sẵn sàng đóng cửa theo nhiệm vụ đã hoàn thành. Dùng để biết khi nào có thể mở cửa hoặc kết thúc.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-phase", target: "[data-tour=operations-phase]", titleEn: "Current phase & tasks", titleVi: "Giai đoạn hiện tại và nhiệm vụ", contentEn: "Current phase shows Pre-Open, Gym Open, or Closing. The progress bar shows how many tasks for that phase are done. Alerts list overdue tasks.", contentVi: "Giai đoạn hiện tại hiển thị Pre-Open, Mở cửa hoặc Đóng cửa. Thanh tiến độ cho biết bao nhiêu nhiệm vụ của giai đoạn đã xong. Cảnh báo liệt kê nhiệm vụ quá hạn.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-tasks", target: "[data-tour=operations-tab-tasks]", titleEn: "Tasks tab", titleVi: "Tab Nhiệm vụ", contentEn: "Tasks tab lists all daily tasks by phase (Pre-Open, During hours, Closing). You can mark tasks complete here or see who completed them and when.", contentVi: "Tab Nhiệm vụ liệt kê tất cả nhiệm vụ hàng ngày theo giai đoạn (Pre-Open, Giờ mở, Đóng cửa). Bạn có thể đánh dấu hoàn thành tại đây hoặc xem ai hoàn thành và khi nào.", navigate: { area: "operations", operationsTab: "tasks" } },
  { id: "ops-attendance", target: "[data-tour=operations-tab-attendance]", titleEn: "Attendance tab", titleVi: "Tab Chấm công", contentEn: "Attendance shows who is IN vs NOT IN today, and monthly attendance (days each staff checked in). Use this to track who showed up and monthly presence.", contentVi: "Chấm công cho biết ai đang IN hay NOT IN hôm nay, và chấm công theo tháng (số ngày mỗi nhân sự check-in). Dùng để theo dõi ai có mặt và sự hiện diện hàng tháng.", navigate: { area: "operations", operationsTab: "attendance" } },
  { id: "ops-coaching", target: "[data-tour=operations-tab-coaching]", titleEn: "Coaching tab", titleVi: "Tab Coaching", contentEn: "Coaching lists today's coaching sessions with time, area, and assigned coach. Unassigned sessions show an action to assign a coach. Assign coaches so every session is covered.", contentVi: "Coaching liệt kê các buổi coaching hôm nay với giờ, khu vực và coach được gán. Buổi chưa gán có thao tác gán coach. Gán coach để mỗi buổi đều có người phụ trách.", navigate: { area: "operations", operationsTab: "coaching" } },
  { id: "ops-routes", target: "[data-tour=operations-tab-routes]", titleEn: "Routes tab", titleVi: "Tab Tường leo", contentEn: "Routes shows each wall zone, next reset date, route age, and who is assigned to set. Assign route setters to zones and mark reset complete when done. Use this to keep resets on schedule.", contentVi: "Tường leo hiển thị từng khu tường, ngày reset tiếp theo, tuổi route và ai được gán set. Gán route setter vào từng khu và đánh dấu hoàn thành reset khi xong. Dùng để giữ lịch reset đúng hạn.", navigate: { area: "operations", operationsTab: "routes" } },
  { id: "ops-assign-setters", target: "[data-tour=operations-assign-setters]", titleEn: "Assign route setters", titleVi: "Gán route setter", contentEn: "In the Routes tab, use the Actions column to assign setters to a zone (add staff to the zone's reset) and to mark reset complete when the zone has been reset.", contentVi: "Trong tab Tường leo, dùng cột Hành động để gán setter vào khu (thêm nhân sự vào reset của khu) và đánh dấu hoàn thành reset khi khu đã được reset.", navigate: { area: "operations", operationsTab: "routes" } },
  // 3. MANAGEMENT (third tab)
  { id: "area-mgmt", target: "[data-tour=area-management]", titleEn: "Management", titleVi: "Quản lý", contentEn: "Inventory (stock, barcodes) and, if you’re CEO, Admin Tools (reset attendance, audit log, open countdown display). Use the sub-tabs to switch.", contentVi: "Kho (tồn, barcode) và nếu là CEO thì Công cụ (reset chấm công, nhật ký audit, mở màn hình đếm ngược). Chuyển bằng sub-tab.", navigate: { area: "management" } },
  { id: "tab-inventory", target: "[data-tour=tab-inventory]", titleEn: "Inventory", titleVi: "Kho", contentEn: "Inventory tab: scan or type barcode → see product → enter quantity → Stock In or Stock Out. Example: scan a chalk bag, enter 10, click Stock In.", contentVi: "Tab Kho: quét hoặc nhập barcode → xem sản phẩm → nhập số lượng → Nhập kho hoặc Xuất kho. Ví dụ: quét túi magnesium, nhập 10, nhấn Nhập kho.", navigate: { area: "management", managementTab: "inventory" } },
  { id: "admin-tools-tab", target: "[data-tour=tab-admin_tools]", titleEn: "Admin Tools tab", titleVi: "Tab Công cụ", contentEn: "CEO-only tab: reset today’s staff attendance, view the audit log of key actions, or open the public countdown page in a new tab.", contentVi: "Tab dành CEO: reset chấm công nhân sự trong ngày, xem nhật ký thao tác quan trọng, hoặc mở trang đếm ngược công khai.", navigate: { area: "management", managementTab: "admin_tools" } },
  { id: "admin-tools-section", target: "[data-tour=admin-tools-section]", titleEn: "Admin Tools actions", titleVi: "Thao tác Công cụ", contentEn: "Use these carefully: reset attendance clears today’s IN/OUT state; audit log helps trace check-ins, membership changes, inventory moves, and route resets.", contentVi: "Dùng cẩn thận: reset chấm công xóa trạng thái IN/OUT hôm nay; nhật ký giúp truy vết check-in, thay đổi gói, kho và reset tường.", navigate: { area: "management", managementTab: "admin_tools" } },
  // 4. ANALYTICS
  { id: "area-analytics", target: "[data-tour=area-analytics]", titleEn: "Analytics & reporting", titleVi: "Phân tích & báo cáo", contentEn: "Six tabs in one flow: Executive → Revenue & members → Engagement → Ops & team (includes staff training) → Marketing emails → Finance & forecast.", contentVi: "Sáu tab một luồng: Điều hành → Doanh thu & TV → Tương tác → VH & đội (gồm đào tạo) → Email marketing → Tài chính & dự báo.", navigate: { area: "analytics" } },
  { id: "analytics-overview", target: "[data-tour=analytics-tab-overview]", titleEn: "Executive summary", titleVi: "Tóm tắt điều hành", contentEn: "Holistic KPIs across the business in one scroll. Use other tabs to go deeper.", contentVi: "Các chỉ số tổng hợp trên một màn hình. Các tab khác để đi sâu từng mảng.", navigate: { area: "analytics", analyticsTab: "overview" } },
  { id: "analytics-revenue-members", target: "[data-tour=analytics-tab-revenue_members]", titleEn: "Revenue & members", titleVi: "Doanh thu & thành viên", contentEn: "Income, ARPU, charts, then member base, plans, health, newbie funnel, and growth—one continuous view.", contentVi: "Doanh thu, ARPU, biểu đồ; sau đó cơ sở thành viên, gói, sức khỏe, phễu Newbie và tăng trưởng—một luồng xem liền mạch.", navigate: { area: "analytics", analyticsTab: "revenue_members" } },
  { id: "analytics-filters", target: "[data-tour=analytics-filters]", titleEn: "Filters", titleVi: "Bộ lọc", contentEn: "Date range, member type, and activity. Applies to Revenue & members, Engagement, and Ops & team tabs.", contentVi: "Khoảng thời gian, loại thành viên, mức hoạt động. Áp dụng cho tab Doanh thu & TV, Tương tác, VH & đội ngũ.", navigate: { area: "analytics" } },
  { id: "analytics-engagement", target: "[data-tour=analytics-tab-engagement]", titleEn: "Engagement", titleVi: "Tương tác", contentEn: "Retention cohorts, visit patterns (WAU/MAU, daily visits, peak hours), and conversion funnel together.", contentVi: "Giữ chân theo nhóm, mẫu đến (WAU/MAU, lượt theo ngày, giờ cao điểm) và phễu chuyển đổi.", navigate: { area: "analytics", analyticsTab: "engagement" } },
  { id: "analytics-ops-team", target: "[data-tour=analytics-tab-ops_team]", titleEn: "Ops & team", titleVi: "VH & đội ngũ", contentEn: "Tasks and coaching metrics, staff POS performance, then staff training (onboarding) if you have admin access.", contentVi: "Nhiệm vụ và coaching, hiệu suất POS nhân sự, sau đó đào tạo (onboarding) nếu có quyền admin.", navigate: { area: "analytics", analyticsTab: "ops_team" } },
  { id: "analytics-marketing", target: "[data-tour=analytics-tab-marketing]", titleEn: "Marketing", titleVi: "Marketing", contentEn: "Send email campaigns to segments and view recent sends.", contentVi: "Gửi chiến dịch email theo phân khúc và xem lần gửi gần đây.", navigate: { area: "analytics", analyticsTab: "marketing" } },
];

/** Member dashboard first-time: waiver → profile (photo + govt ID) → visits (buy pass OR redeem LMG- friend code). */
export const TOUR_STEPS_ONBOARDING: TourStep[] = [
  { id: "onb-waiver", target: "[data-tour=onboarding-waiver]", titleEn: "Step 1: Sign the waiver", titleVi: "Bước 1: Ký giấy từ chối trách nhiệm", contentEn: "Read and sign the safety waiver before using the gym. Tap \"Open Waiver\" below, then sign when ready.", contentVi: "Đọc và ký giấy từ chối trách nhiệm trước khi sử dụng phòng gym. Nhấn \"Mở giấy từ chối\" bên dưới, rồi ký khi sẵn sàng." },
  { id: "onb-profile", target: "[data-tour=dashboard-profile]", titleEn: "Step 2: Photo & government ID", titleVi: "Bước 2: Ảnh & giấy tờ", contentEn: "Tap your name at the top. Add a profile photo and verify your identity: scan the VN eID chip QR (full CCCD data), or enter CCCD number, full legal name, gender, and date of birth. Save before continuing.", contentVi: "Chạm tên bạn ở trên. Thêm ảnh đại diện và xác thực danh tính: quét mã QR chip CCCD (đủ dữ liệu), hoặc nhập số CCCD, họ tên đầy đủ, giới tính, ngày sinh. Nhấn Lưu trước khi sang bước sau." },
  { id: "onb-pass-or-redeem", target: "[data-tour=dashboard-tabs]", titleEn: "Step 3: Get a visit — buy or redeem", titleVi: "Bước 3: Có lượt — mua hoặc đổi mã", contentEn: "You need at least one visit to show your check-in QR. Either buy a pass in the Membership tab, or ask a friend for an invite code (LMG-…) and enter it in the Redeem tab. After that, your QR appears here.", contentVi: "Bạn cần ít nhất 1 lượt để hiện QR check-in. Mua pass ở tab Thẻ thành viên, hoặc nhập mã mời từ bạn (LMG-…) ở tab Đổi mã. Sau đó QR sẽ hiện tại đây.", navigate: { dashboardTab: "membership" } },
];

/** Member dashboard app: welcome, profile, check-in QR, gym status, tabs, membership, activity, events, leaderboard. */
export const TOUR_STEPS_DASHBOARD: TourStep[] = [
  { id: "dash-welcome", target: "[data-tour=dashboard-welcome]", titleEn: "Your member dashboard", titleVi: "Trang thành viên", contentEn: "Everything for check-in, membership, climbing progress, redeeming codes, events, and ranks. If you booked a Newbie class, you’ll also see time and room here.", contentVi: "Check-in, thẻ thành viên, tiến độ leo, đổi mã, sự kiện và BXH. Nếu có lớp Newbie, bạn sẽ thấy giờ và phòng ở trên." },
  { id: "dash-profile", target: "[data-tour=dashboard-profile]", titleEn: "Profile & waiver", titleVi: "Hồ sơ & waiver", contentEn: "Tap your name/photo to update profile, add your photo, and check waiver status.", contentVi: "Chạm tên/ảnh để cập nhật hồ sơ, ảnh và trạng thái waiver." },
  { id: "dash-qr", target: "[data-tour=dashboard-qr]", titleEn: "Check-in QR", titleVi: "QR check-in", contentEn: "After waiver, profile photo + verified ID, and at least one visit (pass or friend’s LMG- code), your QR appears here. Show it at the front desk; tap to enlarge.", contentVi: "Sau waiver, ảnh + giấy tờ đã xác thực và ít nhất 1 lượt (pass hoặc mã LMG-), mã QR hiện tại đây. Đưa cho quầy lễ tân; chạm để phóng to." },
  { id: "dash-gym-status", target: "[data-tour=dashboard-gym-status]", titleEn: "How busy is the gym?", titleVi: "Gym đông thế nào?", contentEn: "Approximate occupancy from recent check-ins (last 2 hours) so you can plan your visit.", contentVi: "Ước lượng đông vắng từ check-in gần đây (2 giờ) để bạn chủ động giờ tới." },
  { id: "dash-tabs", target: "[data-tour=dashboard-tabs]", titleEn: "Five tabs", titleVi: "Năm tab", contentEn: "Membership (Thẻ TV), Activity (climbing level & streaks), Redeem (promo / guest codes), Events, and Rank (leaderboard).", contentVi: "Thẻ TV, Hoạt động (cấp độ & chuỗi), Đổi mã, Sự kiện, BXH." },
  { id: "dash-membership", target: "[data-tour=dashboard-membership]", titleEn: "Membership tab", titleVi: "Tab Thẻ TV", contentEn: "Tier, status, expiry, member ID, renewals, visit passes, payment and purchase history.", contentVi: "Hạng, trạng thái, hạn, mã TV, gia hạn, vé lượt, lịch sử thanh toán và mua hàng.", navigate: { dashboardTab: "membership" } },
  { id: "dash-activity", target: "[data-tour=dashboard-activity]", titleEn: "Climbing progress", titleVi: "Tiến độ leo", contentEn: "Level, visit count toward next tier, streaks, recent achievements, upcoming milestone rewards, and guest-pass codes you can share—friends redeem them in the Redeem tab.", contentVi: "Cấp độ, số lượt lên cấp, chuỗi, thành tựu, phần thưởng mốc, mã vé khách—bạn bè đổi ở tab Đổi mã.", navigate: { dashboardTab: "activity" } },
  { id: "dash-redeem", target: "[data-tour=dashboard-redeem]", titleEn: "Redeem codes", titleVi: "Đổi mã", contentEn: "New members can enter a friend’s LMG-… invite code here for a free visit (no purchase needed). Also: campaign codes, LEO-G- milestone guest passes, etc.", contentVi: "Thành viên mới nhập mã mời LMG-… của bạn bè để +1 lượt (không cần mua pass). Còn có mã chiến dịch, vé khách LEO-G-…", navigate: { dashboardTab: "redeem" } },
  { id: "dash-events", target: "[data-tour=dashboard-events]", titleEn: "Events", titleVi: "Sự kiện", contentEn: "Workshops, route nights, comps. Tap any row for full details.", contentVi: "Workshop, đêm tuyến, thi đấu. Chạm dòng để xem chi tiết.", navigate: { dashboardTab: "events" } },
  { id: "dash-leaderboard", target: "[data-tour=dashboard-leaderboard]", titleEn: "Leaderboard", titleVi: "Bảng xếp hạng", contentEn: "Top visitors by period (week / month / all time) and filters. More check-ins help you climb the board.", contentVi: "Top lượt đến theo tuần/tháng/tất cả. Check-in nhiều để lên BXH.", navigate: { dashboardTab: "leaderboard" } },
];
