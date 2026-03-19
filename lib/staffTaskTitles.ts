import type { Locale } from "./i18n";

/**
 * Vietnamese translations for staff task titles (from staff_tasks.title in DB).
 * Keys must match the seeded English titles exactly.
 */
const TASK_TITLE_VI: Record<string, string> = {
  "Clean holds": "Vệ sinh hold",
  "Inspect anchors": "Kiểm tra móc",
  "Brush volumes": "Chải volume",
  "Check rental shoes": "Kiểm tra giày thuê",
  "Inspect crash pads": "Kiểm tra thảm",
  "Check bathrooms": "Kiểm tra nhà vệ sinh",
  "Turn on gym lights": "Bật đèn phòng gym",
  "Start music system": "Bật hệ thống âm thanh",
  "Prepare front desk POS": "Chuẩn bị POS quầy",
  "Monitor rental shoes": "Theo dõi giày thuê",
  "Restock chalk and merchandise": "Bổ sung phấn và hàng bán",
  "Check bathrooms regularly": "Kiểm tra nhà vệ sinh định kỳ",
  "Clean lounge and seating areas": "Dọn khu vực chờ và ghế ngồi",
  "Sweep climbing floor (day)": "Quét sàn leo (ngày)",
  "Check lost items area (day)": "Kiểm tra khu đồ thất lạc (ngày)",
  "Check lost and found (close)": "Kiểm tra đồ thất lạc (đóng cửa)",
  "Sanitize rental shoes": "Khử trùng giày thuê",
  "Sweep climbing floor (close)": "Quét sàn leo (đóng cửa)",
  "Clean front desk": "Dọn quầy lễ tân",
  "Turn off music system": "Tắt hệ thống âm thanh",
  "Turn off lights": "Tắt đèn",
  "Lock main entrance door": "Khóa cửa chính",
  "Check security cameras": "Kiểm tra camera an ninh",
};

export function getStaffTaskTitle(title: string | null | undefined, locale: Locale): string {
  if (title == null || title === "") return "";
  if (locale === "vi") {
    const trimmed = title.trim();
    return TASK_TITLE_VI[trimmed] ?? trimmed;
  }
  return title;
}
