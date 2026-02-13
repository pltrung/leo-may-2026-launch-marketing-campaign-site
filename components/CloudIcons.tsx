"use client";

import { CloudType } from "@/lib/cloudData";

interface CloudIconProps {
  cloudId: CloudType;
  className?: string;
}

export default function CloudIconByType({ cloudId, className = "w-16 h-16" }: CloudIconProps) {
  const baseClass = className;
  const stroke = "currentColor";

  switch (cloudId) {
    case "may_nhe":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 28a6 6 0 0 1-4-10 7 7 0 0 1 14 0 5 5 0 0 1 2 9" />
          <path d="M32 36a5 5 0 0 1-2-9 6 6 0 0 1 10-2 4 4 0 0 1 1 7" />
          <circle cx="36" cy="16" r="2" fill="currentColor" />
          <circle cx="40" cy="14" r="1.5" fill="currentColor" />
          <circle cx="38" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "suong_mu":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 32a5 5 0 0 1-3-8 6 6 0 0 1 12 0 4 4 0 0 1 1 6" />
          <path d="M24 40a6 6 0 0 1-4-10 7 7 0 0 1 14 0 5 5 0 0 1 2 9" />
          <path d="M36 28a4 4 0 0 1-2-7 5 5 0 0 1 9-1 3 3 0 0 1 1 5" />
          <path d="M24 14l-2 6h4l-2-6z" strokeWidth="1.2" />
          <path d="M24 8v2M20 10h8M22 12h4" strokeWidth="1" />
        </svg>
      );
    case "giong":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 28a5 5 0 0 1-3-9 6 6 0 0 1 12 0 4 4 0 0 1 1 6" />
          <path d="M28 36a6 6 0 0 1-4-10 7 7 0 0 1 14 0 5 5 0 0 1 2 9" />
          <path d="M32 20L26 32h4l-4 12 8-16h-4l6-12z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "ho_may":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 30a5 5 0 0 1-3-8 6 6 0 0 1 12 0 4 4 0 0 1 1 6" />
          <path d="M36 30a5 5 0 0 1-3-8 6 6 0 0 1 12 0 4 4 0 0 1 1 6" />
          <circle cx="24" cy="24" r="8" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx="24" cy="24" r="4" strokeWidth="1" />
          <circle cx="24" cy="20" r="0.8" fill="currentColor" />
          <circle cx="22" cy="26" r="0.6" fill="currentColor" />
          <circle cx="26" cy="26" r="0.6" fill="currentColor" />
        </svg>
      );
    case "cau_vong":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 32a5 5 0 0 1-3-8 6 6 0 0 1 12 0 4 4 0 0 1 1 6" />
          <path d="M28 36a6 6 0 0 1-4-10 7 7 0 0 1 14 0 5 5 0 0 1 2 9" />
          <path d="M8 24c0 0 4-8 8-8s4 8 8 8 4-8 8-8 4 8 8 8" stroke="#f59e0b" strokeWidth="2" />
          <path d="M10 22c0 0 3-6 6-6s3 6 6 6 3-6 6-6 3 6 6 6" stroke="#84cc16" strokeWidth="2" />
          <path d="M12 20c0 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" stroke="#22c55e" strokeWidth="2" />
          <path d="M14 18c0 0 1-2 2-2s1 2 2 2 1-2 2-2 1 2 2 2" stroke="#0ea5e9" strokeWidth="2" />
        </svg>
      );
    case "gio":
      return (
        <svg className={baseClass} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 28 Q14 22 20 28 Q26 34 32 28 Q38 22 44 28" strokeWidth="1.8" />
          <path d="M8 34 Q16 28 24 34 Q32 40 40 34" strokeWidth="1.4" opacity="0.8" />
          <path d="M6 22 Q12 16 18 22 Q24 28 30 22 Q36 16 42 22" strokeWidth="1.2" opacity="0.6" />
          <path d="M10 16 Q18 10 26 16 Q34 22 42 16" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    default:
      return null;
  }
}
