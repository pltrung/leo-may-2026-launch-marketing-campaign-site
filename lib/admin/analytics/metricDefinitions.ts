/**
 * Canonical labels & copy for admin analytics (single source of truth for CEO-facing text).
 * Formulas are implemented in API + metricCalculators; here we only define what we show.
 */

export type MetricBasis = "cash" | "operating_accrual" | "mixed";

export const METRIC_BASIS_BADGE: Record<MetricBasis, { en: string; vi: string; hintEn: string; hintVi: string }> = {
  cash: {
    en: "Cash basis",
    vi: "Theo tiền mặt",
    hintEn: "Numbers follow cash collected and expenses recorded as paid/spent where tracked.",
    hintVi: "Số theo tiền thu được và chi phí đã ghi nhận chi (nơi có dữ liệu).",
  },
  operating_accrual: {
    en: "Operating / accrual basis",
    vi: "Theo P&L dồn tích",
    hintEn: "Includes rent and payroll as period costs even if payment date differs.",
    hintVi: "Gồm thuê và lương theo kỳ dù ngày trả tiền khác.",
  },
  mixed: {
    en: "Mixed basis",
    vi: "Hỗn hợp",
    hintEn: "Some cards are cash (collected sales) and some accrual (estimated payroll). Read each card tooltip.",
    hintVi: "Một số chỉ tiêu theo tiền mặt, một số theo dồn tích. Xem từng ô trợ giúp.",
  },
};

export const METRIC_TOOLTIPS = {
  cashSalesMtd: {
    en: "Successful payments plus POS in period, minus refunds recorded in payment_adjustments (negative amounts).",
    vi: "Thanh toán thành công + POS trong kỳ, trừ hoàn tiền ghi trong payment_adjustments (số âm).",
  },
  cashInBank: {
    en: "Manual cash on hand from Finance settings (finance_config.current_cash), not a live bank feed.",
    vi: "Quỹ tiền mặt nhập tay trong Cài đặt Tài chính, không nối ngân hàng trực tiếp.",
  },
  runway: {
    en: "Cash on hand ÷ estimated full-month operating burn (payroll + rent + extrapolated expenses). If burn is zero or negative, we show Cash positive.",
    vi: "Quỹ hiện tại ÷ ước tính chi hàng tháng (lương + thuê + chi phí nội suy). Nếu không cháy quỹ thì hiển thị Dương quỹ.",
  },
  netCashFlowMtd: {
    en: "Cash sales (MTD) minus partial cash out (recorded expenses plus payroll when marked paid). Rent payouts are not fully tracked as cash events yet.",
    vi: "Tiền vào (MTD) trừ tiền ra một phần (chi phí đã ghi + lương khi đánh dấu đã trả). Tiền thuê chưa theo dõi đầy đủ theo dòng tiền.",
  },
  activeMembers: {
    en: "Distinct members with at least one qualifying visit (check-in) in the selected period and filter set.",
    vi: "Số thành viên có ít nhất một lượt vào phòng trong kỳ và bộ lọc hiện tại.",
  },
  currentPayingMembers: {
    en: "Members with membership_status active and expiry in the future (snapshot, not filtered by activity segment).",
    vi: "Thành viên đang active và còn hạn (ảnh chụp, không lọc theo phân đoạn hoạt động).",
  },
  retentionDn: {
    en: "Cohort: members whose first visit was at least N days before period end, returned within N days after first visit (distinct users).",
    vi: "Cohort: TV có lần đầu ít nhất N ngày trước cuối kỳ, quay lại trong N ngày sau lần đầu (theo người).",
  },
  operatingProfit: {
    en: "Recognized revenue minus full accrual costs. Not shown until revenue recognition is implemented reliably.",
    vi: "Doanh thu ghi nhận trừ chi phí dồn tích. Ẩn cho đến khi ghi nhận doanh thu đủ tin cậy.",
  },
  arpuSecondary: {
    en: "Cash sales in period ÷ members who paid in period — distorted by long prepayments; use as context only.",
    vi: "Doanh thu kỳ ÷ TV có trả tiền trong kỳ — lệch khi trả trước dài; chỉ tham khảo.",
  },
} as const;
