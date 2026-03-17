import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getUnifiedAdminOrStaffFromRequest } from "@/lib/unifiedAdminAuth";
import { getDayContent } from "@/lib/onboardingContent";

/**
 * POST /api/admin/onboarding/ai-evaluate
 * Body: { day: number, scenario_key: string, user_response: string }
 * Returns: { score: number, feedback: string, improved_answer: string }
 * Rule-based evaluation (keywords, length). Can be replaced with LLM later.
 */
export async function POST(req: NextRequest) {
  const result = await getUnifiedAdminOrStaffFromRequest(req);
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { day: number; scenario_key: string; user_response: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { day, scenario_key, user_response } = body;
  if (!day || !scenario_key || typeof user_response !== "string") {
    return NextResponse.json({ error: "Missing day, scenario_key, or user_response" }, { status: 400 });
  }

  const content = getDayContent(day);
  if (!content) return NextResponse.json({ error: "Invalid day" }, { status: 400 });

  const scenario = content.scenarios.find((s) => s.id === scenario_key);
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 400 });
  const response = user_response.trim();
  if (response.length < 5) {
    return NextResponse.json({
      score: 0,
      feedback: "Response too short. Add more detail.",
      improved_answer: scenario.promptEn + " Try: Acknowledge the situation and show empathy.",
    });
  }

  let score = 60;
  const lower = response.toLowerCase();
  (scenario.goodKeywords ?? []).forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) score += 10;
  });
  (scenario.badKeywords ?? []).forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) score -= 15;
  });
  score = Math.max(0, Math.min(100, score));
  if (response.length > 30) score = Math.min(100, score + 5);
  if (response.length > 80) score = Math.min(100, score + 5);

  let feedback = score >= 80 ? "Great response! Friendly and helpful." : score >= 60 ? "Good effort. Add more warmth or clarity." : "Try to be more welcoming and specific.";
  const improved_answer = `Example: "I hear you. [Acknowledge]. Here's what I can do: [Action]. Let me know if you need anything else."`;

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
      improved_answer,
    });
  }

  return NextResponse.json({ score, feedback, improved_answer });
}
