/**
 * Refund / adjustment reason codes for dropdown (stored in payment_adjustments.reason).
 */
export const REFUND_REASONS = [
  { value: "refund_duplicate", labelEn: "Duplicate charge", labelVi: "Trùng giao dịch" },
  { value: "refund_unused", labelEn: "Service not used", labelVi: "Chưa sử dụng dịch vụ" },
  { value: "refund_cancelled_plan", labelEn: "Cancelled plan", labelVi: "Hủy gói" },
  { value: "goodwill", labelEn: "Goodwill", labelVi: "Thiện chí" },
  { value: "price_adjustment", labelEn: "Price adjustment", labelVi: "Điều chỉnh giá" },
  { value: "other", labelEn: "Other", labelVi: "Khác" },
] as const;

export type RefundReasonValue = (typeof REFUND_REASONS)[number]["value"];

export function getRefundReasonLabel(value: string, locale: "vi" | "en"): string {
  const r = REFUND_REASONS.find((x) => x.value === value);
  if (!r) return value;
  return locale === "vi" ? r.labelVi : r.labelEn;
}
