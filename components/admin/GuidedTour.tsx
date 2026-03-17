"use client";

import React, { useEffect, useState } from "react";

/** Optional navigation to run when this step is shown (e.g. switch to a tab so the target is visible). */
export interface TourStepNavigate {
  area?: "front_desk" | "operations" | "management" | "staff" | "analytics";
  frontDeskTab?: "checkin" | "member";
  managementTab?: "inventory" | "admin_tools";
  staffSubTab?: "routes" | "coaching";
  operationsTab?: "overview" | "tasks" | "attendance" | "coaching" | "routes";
  analyticsTab?: "overview" | "revenue" | "members" | "retention" | "behavior" | "funnel" | "operations" | "staff" | "onboarding";
  /** Dashboard member app: switch tab so target is visible. */
  dashboardTab?: "membership" | "activity" | "events" | "leaderboard";
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
}

export function GuidedTour({ steps, isActive, onClose, locale, onNavigate }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = steps[stepIndex];
  const t = (en: string, vi: string) => (locale === "vi" ? vi : en);

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
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightRect(null);
      }
    };
    updateRect();
    if (step.navigate) {
      const t = setTimeout(updateRect, 350);
      return () => clearTimeout(t);
    }
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
      {/* Modal */}
      <div className="absolute left-1/2 bottom-8 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl bg-slate-800 border border-slate-600 shadow-xl p-4 pointer-events-auto">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{content}</p>
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
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium"
              >
                {locale === "vi" ? "Tiếp" : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-medium"
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

export const TOUR_STEPS_STAFF: TourStep[] = [
  { id: "staff-commission-bar", target: "[data-tour=staff-commission-bar]", titleEn: "Your commission at the top", titleVi: "Hoa hồng của bạn ở trên", contentEn: "When you're checked in, your Sales and Commission for today appear here. You earn commission from front desk operations: scanning member QR for check-in and scanning barcode of items when you make a sale.", contentVi: "Khi bạn đã check-in ca, Doanh số và Hoa hồng hôm nay hiển thị tại đây. Bạn được hoa hồng từ hoạt động quầy lễ tân: quét QR thành viên để check-in và quét mã vạch sản phẩm khi bán hàng.", navigate: { area: "staff" } },
  { id: "area-staff", target: "[data-tour=area-staff]", titleEn: "Staff area", titleVi: "Khu Nhân sự", contentEn: "This is the Staff area: daily tasks, route resets, and coaching sessions. Everything you need for the floor.", contentVi: "Đây là khu Nhân sự: nhiệm vụ hàng ngày, reset tường và buổi coaching. Mọi thứ bạn cần cho sàn.", navigate: { area: "staff" } },
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
  { id: "ops-overview", target: "[data-tour=operations-tab-overview]", titleEn: "Overview tab", titleVi: "Tab Tổng quan", contentEn: "Overview shows a summary: staff present today, Pre-Open and Closing task progress, gym readiness, current phase (Pre-Open / Gym Open / Closing), and any alerts. Check this first each day.", contentVi: "Tổng quan hiển thị: nhân sự có mặt hôm nay, tiến độ Pre-Open và Đóng cửa, sẵn sàng mở cửa, giai đoạn hiện tại (Pre-Open / Mở cửa / Đóng cửa) và cảnh báo. Kiểm tra mục này trước mỗi ngày.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-gym-status", target: "[data-tour=operations-gym-status]", titleEn: "Gym status", titleVi: "Trạng thái gym", contentEn: "Gym readiness shows whether the gym is ready to open or ready to close based on completed tasks. Use this to know when you can open doors or wrap up.", contentVi: "Sẵn sàng mở cửa cho biết gym đã sẵn sàng mở hay sẵn sàng đóng cửa theo nhiệm vụ đã hoàn thành. Dùng để biết khi nào có thể mở cửa hoặc kết thúc.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-phase", target: "[data-tour=operations-phase]", titleEn: "Current phase & tasks", titleVi: "Giai đoạn hiện tại và nhiệm vụ", contentEn: "Current phase shows Pre-Open, Gym Open, or Closing. The progress bar shows how many tasks for that phase are done. Alerts list overdue tasks.", contentVi: "Giai đoạn hiện tại hiển thị Pre-Open, Mở cửa hoặc Đóng cửa. Thanh tiến độ cho biết bao nhiêu nhiệm vụ của giai đoạn đã xong. Cảnh báo liệt kê nhiệm vụ quá hạn.", navigate: { area: "operations", operationsTab: "overview" } },
  { id: "ops-tasks", target: "[data-tour=operations-tab-tasks]", titleEn: "Tasks tab", titleVi: "Tab Nhiệm vụ", contentEn: "Tasks tab lists all daily tasks by phase (Pre-Open, During hours, Closing). You can mark tasks complete here or see who completed them and when.", contentVi: "Tab Nhiệm vụ liệt kê tất cả nhiệm vụ hàng ngày theo giai đoạn (Pre-Open, Giờ mở, Đóng cửa). Bạn có thể đánh dấu hoàn thành tại đây hoặc xem ai hoàn thành và khi nào.", navigate: { area: "operations", operationsTab: "tasks" } },
  { id: "ops-attendance", target: "[data-tour=operations-tab-attendance]", titleEn: "Attendance tab", titleVi: "Tab Chấm công", contentEn: "Attendance shows who is IN vs NOT IN today, and monthly attendance (days each staff checked in). Use this to track who showed up and monthly presence.", contentVi: "Chấm công cho biết ai đang IN hay NOT IN hôm nay, và chấm công theo tháng (số ngày mỗi nhân sự check-in). Dùng để theo dõi ai có mặt và sự hiện diện hàng tháng.", navigate: { area: "operations", operationsTab: "attendance" } },
  { id: "ops-coaching", target: "[data-tour=operations-tab-coaching]", titleEn: "Coaching tab", titleVi: "Tab Coaching", contentEn: "Coaching lists today's coaching sessions with time, area, and assigned coach. Unassigned sessions show an action to assign a coach. Assign coaches so every session is covered.", contentVi: "Coaching liệt kê các buổi coaching hôm nay với giờ, khu vực và coach được gán. Buổi chưa gán có thao tác gán coach. Gán coach để mỗi buổi đều có người phụ trách.", navigate: { area: "operations", operationsTab: "coaching" } },
  { id: "ops-routes", target: "[data-tour=operations-tab-routes]", titleEn: "Routes tab", titleVi: "Tab Tường leo", contentEn: "Routes shows each wall zone, next reset date, route age, and who is assigned to set. Assign route setters to zones and mark reset complete when done. Use this to keep resets on schedule.", contentVi: "Tường leo hiển thị từng khu tường, ngày reset tiếp theo, tuổi route và ai được gán set. Gán route setter vào từng khu và đánh dấu hoàn thành reset khi xong. Dùng để giữ lịch reset đúng hạn.", navigate: { area: "operations", operationsTab: "routes" } },
  { id: "ops-assign-setters", target: "[data-tour=operations-assign-setters]", titleEn: "Assign route setters", titleVi: "Gán route setter", contentEn: "In the Routes tab, use the Actions column to assign setters to a zone (add staff to the zone's reset) and to mark reset complete when the zone has been reset.", contentVi: "Trong tab Tường leo, dùng cột Hành động để gán setter vào khu (thêm nhân sự vào reset của khu) và đánh dấu hoàn thành reset khi khu đã được reset.", navigate: { area: "operations", operationsTab: "routes" } },
  // 3. MANAGEMENT (third tab)
  { id: "area-mgmt", target: "[data-tour=area-management]", titleEn: "Management", titleVi: "Quản lý", contentEn: "Management includes Inventory (stock in/out, barcode scan) and Admin Tools. Open Inventory to add or adjust stock.", contentVi: "Quản lý gồm Kho (nhập/xuất, quét barcode) và Công cụ Admin. Mở Kho để thêm hoặc điều chỉnh tồn kho.", navigate: { area: "management" } },
  { id: "tab-inventory", target: "[data-tour=tab-inventory]", titleEn: "Inventory", titleVi: "Kho", contentEn: "Inventory tab: scan or type barcode → see product → enter quantity → Stock In or Stock Out. Example: scan a chalk bag, enter 10, click Stock In.", contentVi: "Tab Kho: quét hoặc nhập barcode → xem sản phẩm → nhập số lượng → Nhập kho hoặc Xuất kho. Ví dụ: quét túi magnesium, nhập 10, nhấn Nhập kho.", navigate: { area: "management", managementTab: "inventory" } },
  // 4. ANALYTICS (fourth tab, right)
  { id: "area-analytics", target: "[data-tour=area-analytics]", titleEn: "Analytics", titleVi: "Phân tích", contentEn: "Analytics: revenue, members, retention, behavior, funnel, operations, staff, and onboarding reports. Use filters for date and member type.", contentVi: "Phân tích: doanh thu, thành viên, giữ chân, hành vi, phễu, vận hành, nhân sự và báo cáo đào tạo. Dùng bộ lọc theo ngày và loại thành viên.", navigate: { area: "analytics" } },
  { id: "onboarding-analytics", target: "[data-tour=tab-onboarding]", titleEn: "Onboarding analytics", titleVi: "Đào tạo", contentEn: "In Analytics, open the Onboarding tab to see per-staff: average AI score, quiz accuracy, days completed, weakest skill, and completion time.", contentVi: "Trong Phân tích, mở tab Đào tạo để xem theo từng nhân sự: điểm AI trung bình, độ chính xác quiz, số ngày hoàn thành, kỹ năng yếu nhất và thời gian hoàn thành.", navigate: { area: "analytics", analyticsTab: "onboarding" } },
];

/** Member dashboard app: welcome, profile, check-in QR, gym status, tabs, membership, activity, events, leaderboard. */
export const TOUR_STEPS_DASHBOARD: TourStep[] = [
  { id: "dash-welcome", target: "[data-tour=dashboard-welcome]", titleEn: "Welcome to your dashboard", titleVi: "Chào mừng đến trang tổng quan", contentEn: "This is your member dashboard. Here you can check in, view your membership, activity, events, and leaderboard.", contentVi: "Đây là trang tổng quan thành viên. Tại đây bạn có thể check-in, xem thẻ thành viên, hoạt động, sự kiện và bảng xếp hạng." },
  { id: "dash-profile", target: "[data-tour=dashboard-profile]", titleEn: "Your profile", titleVi: "Hồ sơ của bạn", contentEn: "Tap here to view and update your profile, photo, and waiver status.", contentVi: "Chạm vào đây để xem và cập nhật hồ sơ, ảnh và trạng thái waiver." },
  { id: "dash-qr", target: "[data-tour=dashboard-qr]", titleEn: "Check-in at the gym", titleVi: "Check-in tại gym", contentEn: "Show this QR code at the front desk to check in. Tap to enlarge for scanning.", contentVi: "Đưa mã QR này cho quầy lễ tân để check-in. Chạm để phóng to khi quét." },
  { id: "dash-gym-status", target: "[data-tour=dashboard-gym-status]", titleEn: "Gym status", titleVi: "Tình trạng gym", contentEn: "See how many members have checked in recently. Useful before you head in.", contentVi: "Xem số thành viên đã check-in gần đây. Hữu ích trước khi bạn tới gym." },
  { id: "dash-tabs", target: "[data-tour=dashboard-tabs]", titleEn: "Dashboard tabs", titleVi: "Các tab", contentEn: "Switch between Membership, Activity, Events, and Leaderboard to see your card, history, upcoming events, and rankings.", contentVi: "Chuyển giữa Thẻ thành viên, Hoạt động, Sự kiện và Bảng xếp hạng để xem thẻ, lịch sử, sự kiện và thứ hạng." },
  { id: "dash-membership", target: "[data-tour=dashboard-membership]", titleEn: "Membership", titleVi: "Thẻ thành viên", contentEn: "Your tier, status, valid until, and member ID. You can also pay or renew and see payment history here.", contentVi: "Hạng, trạng thái, có hiệu lực đến và mã thành viên. Bạn cũng có thể thanh toán hoặc gia hạn và xem lịch sử thanh toán tại đây.", navigate: { dashboardTab: "membership" } },
  { id: "dash-activity", target: "[data-tour=dashboard-activity]", titleEn: "Activity", titleVi: "Hoạt động", contentEn: "Your check-in history and visit summary. See when you last visited and your activity over time.", contentVi: "Lịch sử check-in và tóm tắt lượt đến. Xem lần đến gần nhất và hoạt động theo thời gian.", navigate: { dashboardTab: "activity" } },
  { id: "dash-events", target: "[data-tour=dashboard-events]", titleEn: "Events", titleVi: "Sự kiện", contentEn: "Upcoming gym events: route setting, workshops, competitions, and more. Tap an event for details.", contentVi: "Sự kiện sắp tới: thay tuyến, workshop, thi đấu và hơn thế. Chạm vào sự kiện để xem chi tiết.", navigate: { dashboardTab: "events" } },
  { id: "dash-leaderboard", target: "[data-tour=dashboard-leaderboard]", titleEn: "Leaderboard", titleVi: "Bảng xếp hạng", contentEn: "See top climbers by check-ins. Filter by period and category. Climb more to climb the ranks.", contentVi: "Xem thành viên leo nhiều nhất theo check-in. Lọc theo kỳ và nhóm. Leo nhiều để leo lên bảng xếp hạng.", navigate: { dashboardTab: "leaderboard" } },
];
