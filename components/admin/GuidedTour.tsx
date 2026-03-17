"use client";

import React, { useEffect, useState } from "react";

/** Optional navigation to run when this step is shown (e.g. switch to a tab so the target is visible). */
export interface TourStepNavigate {
  area?: "front_desk" | "operations" | "management" | "staff" | "analytics";
  frontDeskTab?: "checkin" | "member";
  managementTab?: "inventory" | "admin_tools";
  staffSubTab?: "routes" | "coaching";
  analyticsTab?: "overview" | "revenue" | "members" | "retention" | "behavior" | "funnel" | "operations" | "staff" | "onboarding";
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
  { id: "area-staff", target: "[data-tour=area-staff]", titleEn: "Staff area", titleVi: "Khu Nhân sự", contentEn: "This is the Staff area: daily tasks, route resets, and coaching sessions. Everything you need for the floor.", contentVi: "Đây là khu Nhân sự: nhiệm vụ hàng ngày, reset tường và buổi coaching. Mọi thứ bạn cần cho sàn.", navigate: { area: "staff" } },
  { id: "tasks", target: "[data-tour=tasks-section]", titleEn: "Daily tasks", titleVi: "Nhiệm vụ hàng ngày", contentEn: "Your tasks for the day appear here (Pre-Open, Gym open, Closing). Progress is shown at the top.", contentVi: "Nhiệm vụ trong ngày hiển thị ở đây (Pre-Open, Giờ mở, Đóng cửa). Tiến độ hiển thị ở trên.", navigate: { area: "staff" } },
  { id: "task-complete", target: "[data-tour=task-complete]", titleEn: "How to complete a task", titleVi: "Cách hoàn thành nhiệm vụ", contentEn: "Example: When you finish a task (e.g. \"Check mats\"), click the green \"Complete\" button next to it. The task is then marked done and your progress updates.", contentVi: "Ví dụ: Khi bạn xong một nhiệm vụ (vd \"Kiểm tra thảm\"), nhấn nút xanh \"Hoàn thành\" bên cạnh. Nhiệm vụ sẽ được đánh dấu xong và tiến độ cập nhật.", navigate: { area: "staff" } },
  { id: "tab-routes", target: "[data-tour=tab-routes]", titleEn: "Routes tab", titleVi: "Tab Tường leo", contentEn: "Open the Routes tab to see zones and route reset schedule. You can assign yourself to a zone and mark resets complete.", contentVi: "Mở tab Tường leo để xem các khu và lịch reset. Bạn có thể gán mình vào một khu và đánh dấu hoàn thành reset.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "routes-zones", target: "[data-tour=routes-zones]", titleEn: "Route reset zones", titleVi: "Khu reset tường", contentEn: "Each card is a zone. You see next reset date and who is assigned. Use \"+ Assign to me\" to add yourself to that zone's reset.", contentVi: "Mỗi thẻ là một khu. Bạn thấy ngày reset tiếp theo và ai được gán. Dùng \"+ Gán cho tôi\" để thêm mình vào reset khu đó.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "route-assign-me", target: "[data-tour=route-assign-me]", titleEn: "How to assign route reset", titleVi: "Cách gán reset tường", contentEn: "Example: Click \"+ Assign to me\" on a zone card to assign yourself to that zone's route reset. When the reset is done, use \"Mark reset complete\" on the same card.", contentVi: "Ví dụ: Nhấn \"+ Gán cho tôi\" trên thẻ khu để gán mình vào reset tường khu đó. Khi reset xong, dùng \"Đánh dấu hoàn thành\" trên cùng thẻ.", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "tab-coaching", target: "[data-tour=tab-coaching]", titleEn: "Coaching tab", titleVi: "Tab Coaching", contentEn: "Switch to the Coaching tab to see today's coaching sessions. Sessions assigned to you and unassigned sessions are listed.", contentVi: "Chuyển sang tab Coaching để xem các buổi coaching hôm nay. Buổi gán cho bạn và buổi chưa gán được liệt kê.", navigate: { area: "staff", staffSubTab: "coaching" } },
  { id: "coaching-assign", target: "[data-tour=coaching-assign]", titleEn: "How to take a coaching session", titleVi: "Cách nhận buổi coaching", contentEn: "Example: Under unassigned sessions, click \"Assign to me\" next to a time slot to assign yourself to that coaching session.", contentVi: "Ví dụ: Ở mục buổi chưa gán, nhấn \"Gán cho tôi\" bên cạnh khung giờ để gán mình vào buổi coaching đó.", navigate: { area: "staff", staffSubTab: "coaching" } },
];

export const TOUR_STEPS_ADMIN: TourStep[] = [
  { id: "area-fd", target: "[data-tour=area-front_desk]", titleEn: "Front Desk", titleVi: "Quầy lễ tân", contentEn: "Front Desk: check-in and member lookup. Use Check-in tab to scan QR; Member tab to search and view profiles.", contentVi: "Quầy lễ tân: check-in và tra cứu thành viên. Dùng tab Check-in để quét QR; tab Thành viên để tìm và xem hồ sơ.", navigate: { area: "front_desk" } },
  { id: "fd-checkin", target: "[data-tour=fd-checkin]", titleEn: "Check-in tab", titleVi: "Tab Check-in", contentEn: "Check-in tab holds the main \"Scan to check-in\" button for member QR scan.", contentVi: "Tab Check-in chứa nút chính \"Quét để check-in\" cho quét QR thành viên.", navigate: { area: "front_desk", frontDeskTab: "checkin" } },
  { id: "fd-member", target: "[data-tour=fd-member]", titleEn: "Member tab", titleVi: "Tab Thành viên", contentEn: "Member tab: search by ID or name, open profiles, view visit history.", contentVi: "Tab Thành viên: tìm theo ID hoặc tên, mở hồ sơ, xem lịch sử đến.", navigate: { area: "front_desk", frontDeskTab: "member" } },
  { id: "area-mgmt", target: "[data-tour=area-management]", titleEn: "Management", titleVi: "Quản lý", contentEn: "Management includes Inventory (stock in/out, barcode scan) and Admin Tools. Open Inventory to add or adjust stock.", contentVi: "Quản lý gồm Kho (nhập/xuất, quét barcode) và Công cụ Admin. Mở Kho để thêm hoặc điều chỉnh tồn kho.", navigate: { area: "management" } },
  { id: "tab-inventory", target: "[data-tour=tab-inventory]", titleEn: "Inventory", titleVi: "Kho", contentEn: "Inventory tab: scan or type barcode → see product → enter quantity → Stock In or Stock Out. Example: scan a chalk bag, enter 10, click Stock In.", contentVi: "Tab Kho: quét hoặc nhập barcode → xem sản phẩm → nhập số lượng → Nhập kho hoặc Xuất kho. Ví dụ: quét túi magnesium, nhập 10, nhấn Nhập kho.", navigate: { area: "management", managementTab: "inventory" } },
  { id: "area-staff", target: "[data-tour=area-staff]", titleEn: "Staff", titleVi: "Nhân sự", contentEn: "Staff area: tasks (mark complete), Routes (assign zone, mark reset complete), Coaching (assign to session).", contentVi: "Khu Nhân sự: nhiệm vụ (đánh dấu hoàn thành), Tường leo (gán khu, đánh dấu hoàn thành reset), Coaching (gán vào buổi).", navigate: { area: "staff" } },
  { id: "tasks", target: "[data-tour=tasks-section]", titleEn: "Staff tasks", titleVi: "Nhiệm vụ nhân sự", contentEn: "Staff see their daily tasks here. Example: complete \"Check mats\" by clicking the green Complete button.", contentVi: "Nhân sự thấy nhiệm vụ hàng ngày ở đây. Ví dụ: hoàn thành \"Kiểm tra thảm\" bằng cách nhấn nút Hoàn thành màu xanh.", navigate: { area: "staff" } },
  { id: "tab-routes", target: "[data-tour=tab-routes]", titleEn: "Routes (reset)", titleVi: "Tường leo (reset)", contentEn: "Routes tab: zones with next reset date. Assign setters with \"+ Assign to me\"; when done, \"Mark reset complete\".", contentVi: "Tab Tường leo: các khu với ngày reset tiếp theo. Gán người set bằng \"+ Gán cho tôi\"; khi xong, \"Đánh dấu hoàn thành\".", navigate: { area: "staff", staffSubTab: "routes" } },
  { id: "tab-coaching", target: "[data-tour=tab-coaching]", titleEn: "Coaching", titleVi: "Coaching", contentEn: "Coaching tab: today's sessions. Unassigned sessions show \"Assign to me\" so staff can take them.", contentVi: "Tab Coaching: các buổi hôm nay. Buổi chưa gán có \"Gán cho tôi\" để nhân sự nhận.", navigate: { area: "staff", staffSubTab: "coaching" } },
  { id: "area-operations", target: "[data-tour=area-operations]", titleEn: "Operations", titleVi: "Vận hành", contentEn: "Operations: daily tasks overview, phases (Pre-Open, Open, Closing), and staff attendance. Manage the day from here.", contentVi: "Vận hành: tổng quan nhiệm vụ hàng ngày, giai đoạn (Pre-Open, Mở cửa, Đóng cửa) và chấm công nhân sự. Quản lý ngày từ đây.", navigate: { area: "operations" } },
  { id: "area-analytics", target: "[data-tour=area-analytics]", titleEn: "Analytics", titleVi: "Phân tích", contentEn: "Analytics: revenue, members, retention, behavior, funnel, operations, staff, and onboarding reports. Use filters for date and member type.", contentVi: "Phân tích: doanh thu, thành viên, giữ chân, hành vi, phễu, vận hành, nhân sự và báo cáo đào tạo. Dùng bộ lọc theo ngày và loại thành viên.", navigate: { area: "analytics" } },
  { id: "onboarding-analytics", target: "[data-tour=tab-onboarding]", titleEn: "Onboarding analytics", titleVi: "Đào tạo", contentEn: "In Analytics, open the Onboarding tab to see per-staff: average AI score, quiz accuracy, days completed, weakest skill, and completion time.", contentVi: "Trong Phân tích, mở tab Đào tạo để xem theo từng nhân sự: điểm AI trung bình, độ chính xác quiz, số ngày hoàn thành, kỹ năng yếu nhất và thời gian hoàn thành.", navigate: { area: "analytics", analyticsTab: "onboarding" } },
];
