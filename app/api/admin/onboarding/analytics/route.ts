import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";

/**
 * GET /api/admin/onboarding/analytics
 * Admin only. Returns onboarding metrics: avg AI score per staff, quiz accuracy, weakest skill, completion time.
 */
export async function GET(req: NextRequest) {
  const unified = await getUnifiedAdminOrStaffFromRequest(req);
  if (!unified || unified.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: progressRows } = await supabase
    .from("onboarding_progress")
    .select("id, auth_id, staff_id, skill_scores, xp_total, final_score, passed, critical_fail");

  if (!progressRows?.length) {
    return NextResponse.json({ byStaff: [], summary: {} });
  }

  const progressIds = progressRows.map((p: { id: string }) => p.id);

  const [dayRows, aiRows, staffRows] = await Promise.all([
    supabase
      .from("onboarding_day_completion")
      .select("progress_id, day, completed, completed_at, quiz_correct_count, quiz_total")
      .in("progress_id", progressIds),
    supabase
      .from("onboarding_ai_sessions")
      .select("progress_id, score")
      .in("progress_id", progressIds),
    supabase
      .from("staff_profiles")
      .select("id, display_name, email"),
  ]);

  const staffMap = new Map(
    (staffRows.data ?? []).map((s: { id: string; display_name?: string | null; email: string }) => [s.id, s.display_name || s.email || "—"])
  );

  const daysByProgress: Record<string, { completed: number; quizCorrect: number; quizTotal: number; firstAt: string | null; lastAt: string | null }> = {};
  (dayRows.data ?? []).forEach((r: { progress_id: string; completed: boolean; completed_at: string | null; quiz_correct_count?: number | null; quiz_total?: number | null }) => {
    if (!daysByProgress[r.progress_id]) {
      daysByProgress[r.progress_id] = { completed: 0, quizCorrect: 0, quizTotal: 0, firstAt: null, lastAt: null };
    }
    const d = daysByProgress[r.progress_id];
    if (r.completed) {
      d.completed += 1;
      if (typeof r.quiz_correct_count === "number") d.quizCorrect += r.quiz_correct_count;
      if (typeof r.quiz_total === "number") d.quizTotal += r.quiz_total;
      if (r.completed_at) {
        if (!d.firstAt || r.completed_at < d.firstAt) d.firstAt = r.completed_at;
        if (!d.lastAt || r.completed_at > d.lastAt) d.lastAt = r.completed_at;
      }
    }
  });

  const aiByProgress: Record<string, number[]> = {};
  (aiRows.data ?? []).forEach((r: { progress_id: string; score: number }) => {
    if (!aiByProgress[r.progress_id]) aiByProgress[r.progress_id] = [];
    aiByProgress[r.progress_id].push(r.score);
  });

  const TOTAL_DAYS = 7;

  const byStaff = progressRows.map((p: { id: string; auth_id: string; staff_id: string | null; skill_scores: { communication?: number; safety?: number; sales?: number; teamwork?: number } | null; xp_total: number; final_score?: number | null; passed?: boolean | null; critical_fail?: boolean | null }) => {
    const scores = p.skill_scores as { communication?: number; safety?: number; sales?: number; teamwork?: number } | null;
    const skills = [
      { key: "communication", val: scores?.communication ?? 50 },
      { key: "safety", val: scores?.safety ?? 50 },
      { key: "sales", val: scores?.sales ?? 50 },
      { key: "teamwork", val: scores?.teamwork ?? 50 },
    ];
    const weakest = skills.reduce((a, b) => (a.val <= b.val ? a : b));

    const aiScores = aiByProgress[p.id] ?? [];
    const avgAiScore = aiScores.length ? Math.round(aiScores.reduce((s, n) => s + n, 0) / aiScores.length) : null;

    const dayStats = daysByProgress[p.id];
    const quizCorrect = dayStats?.quizCorrect ?? 0;
    const quizTotal = dayStats?.quizTotal ?? 0;
    const quizAccuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;

    let completionTimeDays: number | null = null;
    if (dayStats?.firstAt && dayStats?.lastAt) {
      completionTimeDays = Math.max(0, Math.ceil((new Date(dayStats.lastAt).getTime() - new Date(dayStats.firstAt).getTime()) / (24 * 60 * 60 * 1000)));
    }

    return {
      progress_id: p.id,
      staff_id: p.staff_id,
      auth_id: p.auth_id,
      staff_name: p.staff_id ? staffMap.get(p.staff_id) ?? "—" : "Admin",
      avg_ai_score: avgAiScore,
      quiz_accuracy: quizAccuracy,
      days_completed: dayStats?.completed ?? 0,
      days_total: TOTAL_DAYS,
      weakest_skill: weakest.key,
      weakest_skill_value: weakest.val,
      completion_time_days: completionTimeDays,
      xp_total: p.xp_total ?? 0,
      certification_final_score: p.final_score ?? null,
      certification_passed: p.passed ?? null,
      certification_critical_fail: p.critical_fail ?? null,
    };
  });

  const allAiScores = (aiRows.data ?? []).map((r: { score: number }) => r.score);
  const totalQuizCorrect = Object.values(daysByProgress).reduce((s, d) => s + d.quizCorrect, 0);
  const totalQuizTotal = Object.values(daysByProgress).reduce((s, d) => s + d.quizTotal, 0);

  const certifiedCount = byStaff.filter((r) => r.certification_passed === true).length;
  const attemptedCertCount = byStaff.filter((r) => r.certification_final_score != null).length;
  const certScores = byStaff.map((r) => r.certification_final_score).filter((s): s is number => typeof s === "number");
  const avgCertScore = certScores.length ? Math.round(certScores.reduce((a, b) => a + b, 0) / certScores.length) : null;

  const summary = {
    total_staff: byStaff.length,
    avg_ai_score_overall: allAiScores.length ? Math.round(allAiScores.reduce((a, b) => a + b, 0) / allAiScores.length) : null,
    quiz_accuracy_overall: totalQuizTotal > 0 ? Math.round((totalQuizCorrect / totalQuizTotal) * 100) : null,
    days_total: TOTAL_DAYS,
    certified_count: certifiedCount,
    certification_attempted_count: attemptedCertCount,
    avg_certification_score: avgCertScore,
  };

  return NextResponse.json({ byStaff, summary });
}
