import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getGymToday } from "@/lib/gymTimezone";
import { XP_LESSON, XP_DAY_COMPLETE, XP_PERFECT_QUIZ, XP_PERFECT_DAY_BONUS, XP_CERTIFICATION_PASS } from "@/lib/onboardingContent";

/**
 * GET /api/admin/onboarding/progress
 * Returns onboarding progress for the current user. Creates if not exists.
 */
export async function GET(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authId = result.user.id;
  const staffId = result.staffId ?? null;
  const supabase = createServerClient();

  let { data: progress, error: fetchErr } = await supabase
    .from("onboarding_progress")
    .select("id, xp_total, streak_days, hearts_remaining, last_activity_date, badges, skill_scores, final_score, passed, critical_fail, certification_date")
    .eq("auth_id", authId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  if (!progress) {
    const { data: newRow, error: insertErr } = await supabase
      .from("onboarding_progress")
      .insert({ auth_id: authId, staff_id: staffId })
      .select("id, xp_total, streak_days, hearts_remaining, last_activity_date, badges, skill_scores, final_score, passed, critical_fail, certification_date")
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    progress = newRow;
  }

  const defaultSkills = { communication: 50, safety: 50, sales: 50, teamwork: 50 };

  const { data: dayRows } = await supabase
    .from("onboarding_day_completion")
    .select("day, completed, xp_earned, lesson_index, current_step, completed_at, quiz_correct_count, quiz_total")
    .eq("progress_id", progress.id);

  const dayCompletion: Record<number, { completed: boolean; xp_earned: number; lesson_index: number; current_step: number; completed_at: string | null; quiz_correct_count?: number | null; quiz_total?: number | null }> = {};
  (dayRows ?? []).forEach((r: { day: number; completed: boolean; xp_earned: number; lesson_index: number; current_step?: number; completed_at: string | null; quiz_correct_count?: number | null; quiz_total?: number | null }) => {
    dayCompletion[r.day] = {
      completed: r.completed,
      xp_earned: r.xp_earned,
      lesson_index: r.lesson_index,
      current_step: r.current_step ?? 0,
      completed_at: r.completed_at,
      quiz_correct_count: r.quiz_correct_count ?? undefined,
      quiz_total: r.quiz_total ?? undefined,
    };
  });

  return NextResponse.json({
    id: progress.id,
    xp_total: progress.xp_total ?? 0,
    streak_days: progress.streak_days ?? 0,
    hearts_remaining: progress.hearts_remaining ?? 5,
    last_activity_date: progress.last_activity_date ?? null,
    badges: progress.badges ?? [],
    skill_scores: progress.skill_scores ?? defaultSkills,
    day_completion: dayCompletion,
    final_score: progress.final_score ?? null,
    passed: progress.passed ?? null,
    critical_fail: progress.critical_fail ?? null,
    certification_date: progress.certification_date ?? null,
  });
}

/**
 * PATCH /api/admin/onboarding/progress
 * Body: { action: "lesson" | "day_complete" | "quiz" | "lose_heart", day?: number, lesson_index?: number, quiz_perfect?: boolean }
 */
export async function PATCH(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action: string;
    day?: number;
    lesson_index?: number;
    quiz_perfect?: boolean;
    current_step?: number;
    perfect_day?: boolean;
    quiz_correct_count?: number;
    quiz_total?: number;
    simulation_complete?: { performed_well: boolean; xp_earned: number };
    skill_deltas?: { communication?: number; safety?: number; sales?: number; teamwork?: number };
    final_score?: number;
    passed?: boolean;
    critical_fail?: boolean;
    certification_date?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, day, lesson_index, quiz_perfect, current_step, perfect_day, quiz_correct_count, quiz_total, simulation_complete, skill_deltas, final_score, passed, critical_fail: criticalFail, certification_date } = body;
  const supabase = createServerClient();

  const { data: progress } = await supabase
    .from("onboarding_progress")
    .select("id, xp_total, streak_days, hearts_remaining, last_activity_date, skill_scores")
    .eq("auth_id", result.user.id)
    .single();

  if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });

  let xpDelta = 0;
  const today = getGymToday();

  if (action === "lesson" && day != null && lesson_index != null) {
    xpDelta = XP_LESSON;
    const { data: dayRow } = await supabase
      .from("onboarding_day_completion")
      .select("lesson_index")
      .eq("progress_id", progress.id)
      .eq("day", day)
      .maybeSingle();

    const currentIdx = (dayRow?.lesson_index as number) ?? -1;
    if (lesson_index > currentIdx) {
      const upsertPayload: Record<string, unknown> = { progress_id: progress.id, day, lesson_index };
      if (typeof current_step === "number") upsertPayload.current_step = current_step;
      await supabase
        .from("onboarding_day_completion")
        .upsert(upsertPayload, { onConflict: "progress_id,day" });
    }
  } else if (action === "day_complete" && day != null) {
    xpDelta = XP_DAY_COMPLETE + (perfect_day === true ? XP_PERFECT_DAY_BONUS : 0);
    const { data: existing } = await supabase
      .from("onboarding_day_completion")
      .select("xp_earned")
      .eq("progress_id", progress.id)
      .eq("day", day)
      .maybeSingle();
    const prevXp = (existing?.xp_earned as number) ?? 0;
    const dayPayload: Record<string, unknown> = {
      progress_id: progress.id,
      day,
      completed: true,
      xp_earned: prevXp + xpDelta,
      completed_at: new Date().toISOString(),
      lesson_index: 999,
    };
    if (typeof quiz_correct_count === "number") dayPayload.quiz_correct_count = quiz_correct_count;
    if (typeof quiz_total === "number") dayPayload.quiz_total = quiz_total;
    await supabase
      .from("onboarding_day_completion")
      .upsert(dayPayload, { onConflict: "progress_id,day" });

    const lastDate = progress.last_activity_date as string | null;
    let streak = (progress.streak_days as number) ?? 0;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (!lastDate || lastDate === yesterdayStr) streak += 1;
    else if (lastDate !== today) streak = 1;

    await supabase
      .from("onboarding_progress")
      .update({
        xp_total: (progress.xp_total as number) + xpDelta,
        streak_days: streak,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("id", progress.id);
  } else if (action === "quiz" && day != null && quiz_perfect === true) {
    xpDelta = XP_PERFECT_QUIZ;
  } else if (action === "save_step" && day != null && typeof current_step === "number") {
    await supabase
      .from("onboarding_day_completion")
      .upsert(
        { progress_id: progress.id, day, current_step },
        { onConflict: "progress_id,day" }
      );
    return NextResponse.json({ ok: true });
  } else if (action === "simulation_complete" && simulation_complete && day != null) {
    const addXp = simulation_complete.performed_well ? Math.max(0, simulation_complete.xp_earned ?? 0) : 0;
    if (addXp > 0) {
      await supabase
        .from("onboarding_progress")
        .update({
          xp_total: (progress.xp_total as number) + addXp,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", progress.id);
    }
    return NextResponse.json({ ok: true, xp_added: addXp });
  } else if (action === "lose_heart") {
    const hearts = Math.max(0, ((progress.hearts_remaining as number) ?? 5) - 1);
    await supabase
      .from("onboarding_progress")
      .update({ hearts_remaining: hearts, updated_at: new Date().toISOString() })
      .eq("id", progress.id);
    return NextResponse.json({ ok: true, hearts_remaining: hearts });
  } else if (action === "reset_day" && day === 7) {
    await supabase
      .from("onboarding_day_completion")
      .upsert(
        { progress_id: progress.id, day: 7, completed: false, current_step: 0, lesson_index: 0 },
        { onConflict: "progress_id,day" }
      );
    return NextResponse.json({ ok: true });
  } else if (action === "certification_complete" && day === 7 && typeof final_score === "number" && typeof passed === "boolean") {
    const certPayload: Record<string, unknown> = {
      final_score: Math.min(100, Math.max(0, final_score)),
      passed,
      critical_fail: typeof criticalFail === "boolean" ? criticalFail : false,
      certification_date: certification_date ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (passed) {
      certPayload.xp_total = (progress.xp_total as number) + XP_CERTIFICATION_PASS;
    }
    await supabase
      .from("onboarding_progress")
      .update(certPayload)
      .eq("id", progress.id);
    await supabase
      .from("onboarding_day_completion")
      .upsert(
        { progress_id: progress.id, day: 7, completed: true, completed_at: new Date().toISOString(), lesson_index: 999, current_step: 999 },
        { onConflict: "progress_id,day" }
      );
    return NextResponse.json({ ok: true, passed, final_score, xp_awarded: passed ? XP_CERTIFICATION_PASS : 0 });
  } else if (action === "update_skills" && skill_deltas && typeof skill_deltas === "object") {
    const current = (progress.skill_scores as { communication?: number; safety?: number; sales?: number; teamwork?: number } | null) ?? {
      communication: 50,
      safety: 50,
      sales: 50,
      teamwork: 50,
    };
    const nextSkills = {
      communication: Math.max(0, Math.min(100, (current.communication ?? 50) + (skill_deltas.communication ?? 0))),
      safety: Math.max(0, Math.min(100, (current.safety ?? 50) + (skill_deltas.safety ?? 0))),
      sales: Math.max(0, Math.min(100, (current.sales ?? 50) + (skill_deltas.sales ?? 0))),
      teamwork: Math.max(0, Math.min(100, (current.teamwork ?? 50) + (skill_deltas.teamwork ?? 0))),
    };
    await supabase
      .from("onboarding_progress")
      .update({ skill_scores: nextSkills, updated_at: new Date().toISOString() })
      .eq("id", progress.id);
    return NextResponse.json({ ok: true, skill_scores: nextSkills });
  }

  if (xpDelta > 0) {
    await supabase
      .from("onboarding_progress")
      .update({
        xp_total: (progress.xp_total as number) + xpDelta,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("id", progress.id);
  }

  const { data: updated } = await supabase
    .from("onboarding_progress")
    .select("xp_total, streak_days, hearts_remaining")
    .eq("id", progress.id)
    .single();

  return NextResponse.json({
    ok: true,
    xp_total: updated?.xp_total ?? progress.xp_total,
    streak_days: updated?.streak_days ?? progress.streak_days,
    hearts_remaining: updated?.hearts_remaining ?? progress.hearts_remaining,
  });
}
