"use client";

import React, { useEffect, useState } from "react";

export interface TourStep {
  id: string;
  target: string;
  titleEn: string;
  titleVi: string;
  contentEn: string;
  contentVi: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onClose: () => void;
  locale: "en" | "vi";
}

export function GuidedTour({ steps, isActive, onClose, locale }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = steps[stepIndex];
  const t = (en: string, vi: string) => (locale === "vi" ? vi : en);

  useEffect(() => {
    if (!isActive || !step) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setHighlightRect(null);
    }
  }, [isActive, stepIndex, step?.target]);

  if (!isActive || steps.length === 0) return null;

  const title = step ? t(step.titleEn, step.titleVi) : "";
  const content = step ? t(step.contentEn, step.contentVi) : "";

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
  { id: "area-fd", target: "[data-tour=area-front_desk]", titleEn: "Front Desk", titleVi: "Quầy lễ tân", contentEn: "Click here to open the Front Desk area: check-in members and manage member lookup.", contentVi: "Nhấn vào đây để mở khu vực Quầy lễ tân: check-in thành viên và tra cứu thành viên." },
  { id: "fd-checkin", target: "[data-tour=fd-checkin]", titleEn: "Check-in", titleVi: "Check-in", contentEn: "Use this tab to scan member QR codes for quick check-in.", contentVi: "Dùng tab này để quét mã QR thành viên cho check-in nhanh." },
  { id: "fd-member", target: "[data-tour=fd-member]", titleEn: "Member", titleVi: "Thành viên", contentEn: "Switch to Member tab to search for a member by ID, name, or QR.", contentVi: "Chuyển sang tab Thành viên để tìm thành viên theo ID, tên hoặc QR." },
  { id: "member-lookup", target: "[data-tour=member-lookup]", titleEn: "Member lookup", titleVi: "Tra cứu thành viên", contentEn: "Enter member ID or name here, or use the QR button to scan. Use Search to open their profile.", contentVi: "Nhập mã hoặc tên thành viên tại đây, hoặc dùng nút QR để quét. Nhấn Tìm để mở hồ sơ." },
  { id: "qr-scan", target: "[data-tour=qr-scan]", titleEn: "Scan to check-in", titleVi: "Quét để check-in", contentEn: "Click here to open the scanner and scan a member's QR code for check-in.", contentVi: "Nhấn đây để mở máy quét và quét mã QR thành viên để check-in." },
];

export const TOUR_STEPS_STAFF: TourStep[] = [
  { id: "area-staff", target: "[data-tour=area-staff]", titleEn: "Staff", titleVi: "Nhân sự", contentEn: "Click here to open the Staff area: tasks, routes, and coaching.", contentVi: "Nhấn vào đây để mở khu Nhân sự: nhiệm vụ, tường leo và coaching." },
  { id: "tasks", target: "[data-tour=tasks-section]", titleEn: "Tasks", titleVi: "Nhiệm vụ", contentEn: "Your daily tasks appear here. Mark them complete as you finish (Pre-Open, Gym open, Closing).", contentVi: "Nhiệm vụ hàng ngày hiển thị ở đây. Đánh dấu hoàn thành khi xong (Pre-Open, Giờ mở, Đóng cửa)." },
  { id: "routes", target: "[data-tour=tab-routes]", titleEn: "Routes", titleVi: "Tường leo", contentEn: "View route reset schedule and zones. Assign setters and mark resets complete.", contentVi: "Xem lịch reset tường và khu vực. Gán người set và đánh dấu hoàn thành reset." },
  { id: "coaching", target: "[data-tour=tab-coaching]", titleEn: "Coaching", titleVi: "Coaching", contentEn: "See coaching sessions today. Assign yourself or teammates to sessions.", contentVi: "Xem các buổi coaching hôm nay. Gán bản thân hoặc đồng đội vào buổi." },
];

export const TOUR_STEPS_ADMIN: TourStep[] = [
  { id: "area-analytics", target: "[data-tour=area-analytics]", titleEn: "Analytics", titleVi: "Phân tích", contentEn: "Open Analytics to see revenue, members, retention, and operations reports.", contentVi: "Mở Phân tích để xem báo cáo doanh thu, thành viên, giữ chân và vận hành." },
  { id: "area-operations", target: "[data-tour=area-operations]", titleEn: "Operations", titleVi: "Vận hành", contentEn: "Operations: daily tasks, phases, and alerts. Manage staff tasks and attendance.", contentVi: "Vận hành: nhiệm vụ hàng ngày, giai đoạn và cảnh báo. Quản lý nhiệm vụ và chấm công nhân sự." },
  { id: "onboarding-analytics", target: "[data-tour=tab-onboarding]", titleEn: "Onboarding analytics", titleVi: "Đào tạo", contentEn: "In Analytics, open the Onboarding tab to see avg AI score, quiz accuracy, and weakest skills per staff.", contentVi: "Trong Phân tích, mở tab Đào tạo để xem điểm AI trung bình, độ chính xác quiz và kỹ năng yếu theo từng nhân sự." },
];
