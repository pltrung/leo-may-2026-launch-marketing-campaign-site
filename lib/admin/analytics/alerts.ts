import type { FinanceMetricsPayload } from "./metricCalculators";

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
};

type MemberHealth = { at_risk?: number; inactive?: number; expiring_soon?: number };
type Operations = { tasks_overdue?: number; route_resets_overdue?: number; coaching_missed?: number };
type AnalyticsSlice = {
  members?: { member_health?: MemberHealth; action_insights?: { type: string; count: number }[] };
  operations?: Operations;
};

export function buildAnalyticsAlerts(
  finance: FinanceMetricsPayload | null,
  analytics: AnalyticsSlice | null,
  _locale: "en" | "vi"
): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];

  const mh = analytics?.members?.member_health;
  const exp = mh?.expiring_soon ?? 0;
  if (exp > 0) {
    alerts.push({
      id: "expiring_7d",
      severity: exp >= 8 ? "warning" : "info",
      titleEn: `${exp} memberships expiring within 7 days`,
      titleVi: `${exp} gói hết hạn trong 7 ngày`,
      detailEn: "Review renewals and outreach.",
      detailVi: "Xem gia hạn và liên hệ.",
      navigateTab: "revenue_members",
    });
  }

  const atRisk = mh?.at_risk ?? 0;
  if (atRisk > 0) {
    alerts.push({
      id: "at_risk",
      severity: atRisk >= 7 ? "warning" : "info",
      titleEn: `${atRisk} at-risk members (7–14d no visit)`,
      titleVi: `${atRisk} TV rủi ro (7–14 ngày không tới)`,
      detailEn: "Consider retention campaigns.",
      detailVi: "Cân nhắc chiến dịch giữ chân.",
      navigateTab: "engagement",
    });
  }

  const inactive = mh?.inactive ?? 0;
  if (inactive > 0) {
    alerts.push({
      id: "inactive_30",
      severity: "info",
      titleEn: `${inactive} inactive (30+ days no visit)`,
      titleVi: `${inactive} không hoạt động (30+ ngày)`,
      detailEn: "Reactivation opportunities.",
      detailVi: "Cơ hội kích hoạt lại.",
      navigateTab: "engagement",
    });
  }

  const payrollPending = finance?.payroll_record?.status !== "paid";
  const payrollAmt = finance?.payroll_total ?? 0;
  if (payrollPending && payrollAmt > 0) {
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
