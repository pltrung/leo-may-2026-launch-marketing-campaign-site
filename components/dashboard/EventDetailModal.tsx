"use client";

import React from "react";

export interface DashboardEvent {
  id: string;
  title: string;
  titleVi?: string;
  date: string; // ISO date
  time: string;
  description: string;
  descriptionVi?: string;
  type: "route_setting" | "womens" | "competition" | "workshop";
}

interface EventDetailModalProps {
  open: boolean;
  onClose: () => void;
  event: DashboardEvent | null;
  isVi: boolean;
}

function EventIcon({ type, className }: { type: DashboardEvent["type"]; className?: string }) {
  const icons: Record<DashboardEvent["type"], React.ReactNode> = {
    route_setting: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
      </svg>
    ),
    womens: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8M8 16h8" />
      </svg>
    ),
    competition: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 9l6 6 6-6" />
        <path d="M6 3v6M18 3v6" />
      </svg>
    ),
    workshop: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2 20h20M5 20V8l7-4 7 4v12" />
      </svg>
    ),
  };
  return icons[type] ?? null;
}

export default function EventDetailModal({
  open,
  onClose,
  event,
  isVi,
}: EventDetailModalProps) {
  if (!open || !event) return null;

  const title = isVi && event.titleVi ? event.titleVi : event.title;
  const desc = isVi && event.descriptionVi ? event.descriptionVi : event.description;

  const addToCalendarUrl = (() => {
    const [y, m, d] = event.date.split("-").map(Number);
    const [hour, min] = event.time.includes(":") ? event.time.split(":").map(Number) : [18, 0];
    const start = new Date(y, m - 1, d, hour, min);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${start.toISOString().replace(/[-:]/g, "").slice(0, 15)}/${end.toISOString().replace(/[-:]/g, "").slice(0, 15)}`,
      details: desc,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[18px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        style={{
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-emerald-400" style={{ background: "rgba(16,185,129,0.15)" }}>
                <EventIcon type={event.type} className="w-6 h-6" />
              </div>
              <div>
                <h2 id="event-detail-title" className="text-xl font-semibold text-white">
                  {title}
                </h2>
                <p className="text-sm text-white/60 mt-0.5">
                  {new Date(event.date).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {event.time}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label={isVi ? "Đóng" : "Close"}
            >
              ×
            </button>
          </div>
          <div className="rounded-[14px] p-4 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
            <p className="text-[15px] text-white/85 leading-relaxed whitespace-pre-wrap">{desc}</p>
          </div>
          <div className="flex gap-3">
            <a
              href={addToCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-[14px] text-center text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              {isVi ? "Thêm vào lịch" : "Add to calendar"}
            </a>
            <button
              type="button"
              className="flex-1 py-3 rounded-[14px] text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-all active:scale-[0.98]"
            >
              {isVi ? "RSVP" : "RSVP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
