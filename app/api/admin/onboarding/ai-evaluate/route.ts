import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getDayContent, isSimulationStepDecision } from "@/lib/onboardingContent";
import type { Locale } from "@/lib/i18n";

/**
 * POST /api/admin/onboarding/ai-evaluate
 * Body: { day: number, scenario_key: string, user_response: string, locale?: "en"|"vi" }
 * Returns: { score: number, feedback: string, whyNot100?: string, perfectAnswer: string, improved_answer: string }
 */
export async function POST(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { day: number; scenario_key: string; user_response: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { day, scenario_key, user_response, locale: localeParam } = body;
  if (!day || !scenario_key || typeof user_response !== "string") {
    return NextResponse.json({ error: "Missing day, scenario_key, or user_response" }, { status: 400 });
  }

  const locale: Locale = localeParam === "en" ? "en" : "vi";
  const content = getDayContent(day);
  if (!content) return NextResponse.json({ error: "Invalid day" }, { status: 400 });

  let perfectAnswer: string;
  let rubric: string[];
  let goodKeywords: string[] | undefined;
  let badKeywords: string[] | undefined;

  const simMatch = scenario_key.match(/^sim:(.+):(.+)$/);
  if (simMatch) {
    const [, simId, stepId] = simMatch;
    const sim = content.simulation;
    if (!sim || sim.id !== simId) return NextResponse.json({ error: "Simulation not found" }, { status: 400 });
    const step = sim.steps.find((s) => s.id === stepId);
    if (!step || isSimulationStepDecision(step)) return NextResponse.json({ error: "Simulation step not found or not AI step" }, { status: 400 });
    perfectAnswer = locale === "vi" ? step.perfectAnswerVi : step.perfectAnswerEn;
    rubric = (locale === "vi" ? step.rubricVi : step.rubricEn) ?? [];
    goodKeywords = step.goodKeywords;
    badKeywords = step.badKeywords;
  } else {
    const scenario = content.scenarios.find((s) => s.id === scenario_key) ?? content.hardModeScenarios?.find((s) => s.id === scenario_key);
    if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 400 });
    perfectAnswer = locale === "vi" ? scenario.perfectAnswerVi : scenario.perfectAnswerEn;
    rubric = (locale === "vi" ? scenario.rubricVi : scenario.rubricEn) ?? [];
    goodKeywords = scenario.goodKeywords;
    badKeywords = scenario.badKeywords;
  }

  const response = user_response.trim();

  if (response.length < 5) {
    const shortMsg = locale === "vi"
      ? "Phản hồi quá ngắn. Hãy viết chi tiết hơn để thể hiện sự quan tâm và chuyên nghiệp."
      : "Response too short. Add more detail to show care and professionalism.";
    return NextResponse.json({
      score: 0,
      feedback: shortMsg,
      whyNot100: shortMsg,
      perfectAnswer,
      improved_answer: perfectAnswer,
    });
  }

  let score = 60;
  const lower = response.toLowerCase();
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];
  (goodKeywords ?? []).forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) {
      score += 10;
      foundKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });
  const usedBadKeywords: { kw: string; why: string }[] = [];
  (badKeywords ?? []).forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) {
      score -= 15;
      const why = locale === "vi"
        ? `"${kw}" — cách nói này có thể làm người nghe cảm thấy bị phủ nhận hoặc không được tôn trọng. Leo Mây không phủ nhận cảm xúc.`
        : `"${kw}" — this can make the person feel dismissed or unheard. Leo Mây doesn't dismiss feelings.`;
      usedBadKeywords.push({ kw, why });
    }
  });
  score = Math.max(0, Math.min(100, score));
  if (response.length > 30) score = Math.min(100, score + 5);
  if (response.length > 80) score = Math.min(100, score + 5);

  let feedback: string;
  let whyNot100: string | undefined;
  if (score >= 95) {
    feedback = locale === "vi" ? "Phản hồi xuất sắc! Thể hiện rõ văn hóa Leo Mây." : "Excellent response! You really embodied the Leo Mây way.";
  } else if (score >= 80) {
    feedback = locale === "vi" ? "Phản hồi tốt. Xem phần \"Tại sao chưa 100\" để hoàn thiện hơn." : "Good response. See \"Why not 100\" to refine further.";
  } else if (score >= 60) {
    feedback = locale === "vi" ? "Đúng hướng nhưng còn thiếu. Đọc đáp án mẫu và lý do chưa đạt 100 để cải thiện." : "On the right track but missing elements. Read the sample answer and why not 100 to improve.";
  } else {
    feedback = locale === "vi" ? "Cần cải thiện nhiều. Đọc kỹ đáp án mẫu và tiêu chí Leo Mây." : "Needs more work. Study the sample answer and Leo Mây criteria.";
  }

  if (score < 100) {
    const parts: string[] = [];
    if (usedBadKeywords.length > 0) {
      const badSection = locale === "vi"
        ? `• Từ/cụm nên tránh trong phản hồi của bạn:\n${usedBadKeywords.map(({ why }) => `  - ${why}`).join("\n")}`
        : `• Phrases to avoid in your response:\n${usedBadKeywords.map(({ why }) => `  - ${why}`).join("\n")}`;
      parts.push(badSection);
    }
    if (missingKeywords.length > 0 && (goodKeywords ?? []).length > 0) {
      const hint = locale === "vi"
        ? `• Bạn chưa thể hiện đủ: cần thêm sự ấm áp, xác nhận cảm xúc, hoặc đề nghị hỗ trợ. Một số từ/cụm nên có: "${missingKeywords.slice(0, 5).join(", ")}".`
        : `• You didn't fully show: warmth, acknowledgment of feelings, or offering help. Consider including: "${missingKeywords.slice(0, 5).join(", ")}".`;
      parts.push(hint);
    }
    if (response.length < 30) {
      const lenHint = locale === "vi"
        ? `• Phản hồi quá ngắn. Một câu hay hai câu thường không đủ để thể hiện sự quan tâm thực sự.`
        : `• Response too brief. One or two sentences often aren't enough to show genuine care.`;
      parts.push(lenHint);
    }
    if (rubric.length > 0) {
      const rubricLabel = locale === "vi" ? "Tiêu chí Leo Mây cho phản hồi 100 điểm:" : "Leo Mây criteria for a 100-point response:";
      parts.push(`• ${rubricLabel}\n  ${rubric.map((r) => `◦ ${r}`).join("\n  ")}`);
    }
    whyNot100 = parts.join("\n\n");
  }

  const supabase = createServerClient();
  const { data: progress } = await supabase
    .from("onboarding_progress")
    .select("id")
    .eq("auth_id", result.user.id)
    .single();

  if (progress) {
    await supabase.from("onboarding_ai_sessions").insert({
      progress_id: progress.id,
      day,
      scenario_key,
      user_response: response,
      score,
      feedback,
      improved_answer: perfectAnswer,
    });
  }

  return NextResponse.json({
    score,
    feedback,
    whyNot100: whyNot100 ?? null,
    perfectAnswer,
    improved_answer: perfectAnswer,
  });
}
