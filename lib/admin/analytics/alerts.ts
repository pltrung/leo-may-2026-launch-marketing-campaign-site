import type { FinanceMetricsPayload } from "./metricCalculators";
import type { CampaignSegmentId } from "@/lib/campaignSegments";

export type AnalyticsAlertSeverity = "critical" | "warning" | "info";

export type AnalyticsAlert = {
  id: string;
  severity: AnalyticsAlertSeverity;
  titleEn: string;
  titleVi: string;
  detailEn: string;
  detailVi: string;
  /** Tab key to open in analytics */
  navigateTab?: "overview" | "revenue_members" | "engagement" | "ops_team" | "marketing" | "finance";
  /** Optional campaign segment to pre-open in Marketing tab */
  campaignSegmentId?: CampaignSegmentId;
};

type MemberHealth = { at_risk?: number; inactive?: number; expiring_soon?: number };
type Operations = { tasks_overdue?: number; route_resets_overdue?: number; coaching_missed?: number };
type AnalyticsSlice = {
  members?: { member_health?: MemberHealth; action_insights?: { type: string; count: number }[] };
  operations?: Operations;
};

/** Suppress alerts for segments we recently emailed (within 7 days). */
export type AlertsSuppress = {
  expiring_7d?: boolean;
  inactive_30?: boolean;
};

export function buildAnalyticsAlerts(
  finance: FinanceMetricsPayload | null,
  analytics: AnalyticsSlice | null,
  _locale: "en" | "vi",
  suppress?: AlertsSuppress
): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];

  const mh = analytics?.members?.member_health;
  const exp = mh?.expiring_soon ?? 0;
  if (exp > 0 && !suppress?.expiring_7d) {
    alerts.push({
      id: "expiring_7d",
      severity: exp >= 8 ? "warning" : "info",
      titleEn: `${exp} memberships expiring within 7 days`,
      titleVi: `${exp} gói hết hạn trong 7 ngày`,
      detailEn: "Send renewal reminder via Marketing.",
      detailVi: "Gửi nhắc gia hạn qua Marketing.",
      navigateTab: "marketing",
      campaignSegmentId: "expiring_soon_7d",
    });
  }

  const atRisk = mh?.at_risk ?? 0;
  if (atRisk > 0) {
    alerts.push({
      id: "at_risk",
      severity: atRisk >= 7 ? "warning" : "info",
      titleEn: `${atRisk} at-risk members (7–14d no visit)`,
      titleVi: `${atRisk} TV rủi ro (7–14 ngày không tới)`,
      detailEn: "Send retention campaign via Marketing.",
      detailVi: "Gửi chiến dịch giữ chân qua Marketing.",
      navigateTab: "marketing",
    });
  }

  const inactive = mh?.inactive ?? 0;
  if (inactive > 0 && !suppress?.inactive_30) {
    alerts.push({
      id: "inactive_30",
      severity: "info",
      titleEn: `${inactive} inactive (30+ days no visit)`,
      titleVi: `${inactive} không hoạt động (30+ ngày)`,
      detailEn: "Reactivation opportunities.",
      detailVi: "Cơ hội kích hoạt lại.",
      navigateTab: "marketing",
      campaignSegmentId: "inactive_members_30d",
    });
  }

  // Payroll alert: only show within a window around due date (3 days before to 2 days after)
  const payrollPending = finance?.payroll_record?.status !== "paid";
  const payrollAmt = finance?.payroll_total ?? 0;
  const monthKey = finance?.payroll_record?.month_key;
  const payrollDay = finance?.config?.payroll_day ?? 25;
  let payrollDueStr = "";
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split("-");
    payrollDueStr = `${y}-${m}-${String(payrollDay).padStart(2, "0")}`;
  }
  const today = new Date().toISOString().slice(0, 10);
  const dueMs = payrollDueStr ? new Date(payrollDueStr + "T12:00:00Z").getTime() : 0;
  const todayMs = new Date(today + "T12:00:00Z").getTime();
  const daysFromDue = dueMs ? Math.round((todayMs - dueMs) / 86400000) : 0;
  const withinPayrollWindow = payrollDueStr && daysFromDue >= -3 && daysFromDue <= 2;
  if (payrollPending && payrollAmt > 0 && withinPayrollWindow) {
    alerts.push({
      id: "payroll_pending",
      severity: "warning",
      titleEn: "Payroll not marked paid",
      titleVi: "Chưa đánh dấu đã trả lương",
      detailEn: "Complete payroll in Finance tab when paid.",
      detailVi: "Hoàn tất ở tab Tài chính khi đã trả.",
      navigateTab: "finance",
    });
  }

  const op = analytics?.operations;
  const overdueTasks = op?.tasks_overdue ?? 0;
  if (overdueTasks > 0) {
    alerts.push({
      id: "tasks_overdue",
      severity: "warning",
      titleEn: `${overdueTasks} staff tasks overdue`,
      titleVi: `${overdueTasks} nhiệm vụ quá hạn`,
      detailEn: "Resolve in Operations.",
      detailVi: "Xử lý trong Vận hành.",
      navigateTab: "ops_team",
    });
  }

  const resets = op?.route_resets_overdue ?? 0;
  if (resets > 0) {
    alerts.push({
      id: "route_reset",
      severity: "warning",
      titleEn: `${resets} route reset(s) overdue`,
      titleVi: `${resets} reset tường quá hạn`,
      detailEn: "Schedule route setters.",
      detailVi: "Sắp xếp route setter.",
      navigateTab: "ops_team",
    });
  }

  const coachMiss = op?.coaching_missed ?? 0;
  if (coachMiss > 0) {
    alerts.push({
      id: "coaching_unassigned",
      severity: "warning",
      titleEn: `${coachMiss} coaching slot(s) without coach`,
      titleVi: `${coachMiss} buổi coaching chưa có HLV`,
      detailEn: "Assign coaches for today's sessions.",
      detailVi: "Gán HLV cho buổi hôm nay.",
      navigateTab: "ops_team",
    });
  }

  // Stable sort: critical > warning > info
  const rank: Record<AnalyticsAlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return alerts;
}
