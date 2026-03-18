"use client";

import React from "react";

export type OnboardingAnalyticsPayload = {
  byStaff: {
    staff_name: string;
    avg_ai_score: number | null;
    quiz_accuracy: number | null;
    days_completed: number;
    days_total?: number;
    weakest_skill: string;
    weakest_skill_value: number;
    completion_time_days: number | null;
    xp_total: number;
    certification_final_score?: number | null;
    certification_passed?: boolean | null;
    certification_critical_fail?: boolean | null;
  }[];
  summary: {
    total_staff: number;
    avg_ai_score_overall: number | null;
    quiz_accuracy_overall: number | null;
    days_total?: number;
    certified_count?: number;
    avg_certification_score?: number | null;
  };
};

export default function OnboardingAnalyticsTable({
  data,
  locale,
}: {
  data: OnboardingAnalyticsPayload;
  locale: "en" | "vi";
}) {
  const isVi = locale === "vi";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium text-slate-700">{isVi ? "Tổng số" : "Total staff"}: {data.summary.total_staff}</span>
        <span className="text-slate-600">
          {isVi ? "Chương trình" : "Program"}: 1–{data.summary.days_total ?? 7} {isVi ? "ngày" : "days"}
        </span>
        {data.summary.avg_ai_score_overall != null && (
          <span className="text-slate-600">
            {isVi ? "Điểm AI trung bình" : "Avg AI score"}: {data.summary.avg_ai_score_overall}
          </span>
        )}
        {data.summary.quiz_accuracy_overall != null && (
          <span className="text-slate-600">
            {isVi ? "Độ chính xác quiz" : "Quiz accuracy"}: {data.summary.quiz_accuracy_overall}%
          </span>
        )}
        {data.summary.certified_count != null && (
          <span className="text-slate-600">{isVi ? "Đã chứng nhận" : "Certified"}: {data.summary.certified_count}</span>
        )}
        {data.summary.avg_certification_score != null && (
          <span className="text-slate-600">
            {isVi ? "Điểm chứng nhận TB" : "Avg cert. score"}: {data.summary.avg_certification_score}
          </span>
        )}
      </div>
      <div
        className="overflow-x-auto max-w-full min-w-0 rounded-lg border border-slate-200 touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Tên" : "Name"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Điểm AI TB" : "Avg AI score"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Quiz %" : "Quiz accuracy"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Ngày xong" : "Days done"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Chứng nhận (D7)" : "Cert. (Day 7)"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Điểm CN" : "Cert. score"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{isVi ? "Kỹ năng yếu" : "Weakest skill"}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">
                {isVi ? "Thời gian hoàn thành (ngày)" : "Completion time (days)"}
              </th>
              <th className="px-3 py-2 font-semibold text-slate-700">XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.byStaff.map((row) => (
              <tr key={row.staff_name + row.xp_total + (row.days_completed ?? 0)} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">{row.staff_name}</td>
                <td className="px-3 py-2 text-slate-600">{row.avg_ai_score ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{row.quiz_accuracy != null ? `${row.quiz_accuracy}%` : "—"}</td>
                <td className="px-3 py-2 text-slate-600">
                  {row.days_completed}/{row.days_total ?? 7}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {row.certification_passed === true
                    ? isVi
                      ? "Đạt"
                      : "Pass"
                    : row.certification_passed === false
                      ? isVi
                        ? "Chưa đạt"
                        : "Fail"
                      : "—"}
                  {row.certification_critical_fail === true && (
                    <span className="ml-1 text-red-600" title={isVi ? "Lỗi nghiêm trọng" : "Critical fail"}>
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{row.certification_final_score != null ? row.certification_final_score : "—"}</td>
                <td className="px-3 py-2 text-slate-600">
                  {row.weakest_skill} ({row.weakest_skill_value})
                </td>
                <td className="px-3 py-2 text-slate-600">{row.completion_time_days ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{row.xp_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
