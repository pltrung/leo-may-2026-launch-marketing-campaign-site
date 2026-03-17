"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import {
  getDayContent,
  getLessonContent,
  getQuizContent,
  stepToPhase,
  phaseToStep,
  isSimulationStepDecision,
  type LessonSection,
  HEARTS_MAX,
  DAY_UNLOCK_HOURS_MS,
} from "@/lib/onboardingContent";
import type { Locale } from "@/lib/i18n";

type Phase = "map" | "lesson" | "scenario" | "simulation" | "simulation_result" | "quiz" | "reflection" | "key_takeaway";

const ONBOARDING_LOCALE_KEY = "onboarding-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const s = localStorage.getItem(ONBOARDING_LOCALE_KEY);
  return s === "en" || s === "vi" ? s : "vi";
}

export default function OnboardingPage() {
  const { loading, hasAccess, adminFetch, role } = useAdminAuth();
  const [locale, setLocale] = useState<Locale>("vi");
  const [progress, setProgress] = useState<{
    xp_total: number;
    streak_days: number;
    hearts_remaining: number;
    skill_scores?: { communication: number; safety: number; sales: number; teamwork: number };
    day_completion: Record<number, { completed: boolean; lesson_index: number; current_step?: number; completed_at?: string | null }>;
  } | null>(null);
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("map");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [scenarioResponse, setScenarioResponse] = useState("");
  const [scenarioResult, setScenarioResult] = useState<{
    score: number;
    feedback: string;
    whyNot100: string | null;
    perfectAnswer: string;
    improved_answer: string;
  } | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [simulationStepIndex, setSimulationStepIndex] = useState(0);
  const [simulationChoice, setSimulationChoice] = useState<string | null>(null);
  const [simulationStepResults, setSimulationStepResults] = useState<{ correct?: boolean; score?: number }[]>([]);
  const [simulationResultMode, setSimulationResultMode] = useState<"good" | "poor" | null>(null);
  const [simulationAiResponse, setSimulationAiResponse] = useState("");
  const [simulationAiResult, setSimulationAiResult] = useState<{
    score: number;
    feedback: string;
    whyNot100: string | null;
    perfectAnswer: string;
  } | null>(null);
  const [showKeyTakeaway, setShowKeyTakeaway] = useState(false);
  const [, setCountdownTick] = useState(0);

  const setLocaleAndStore = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem(ONBOARDING_LOCALE_KEY, l);
  }, []);

  useEffect(() => {
    setLocaleAndStore(getStoredLocale());
  }, [setLocaleAndStore]);

  const fetchProgress = useCallback(() => {
    adminFetch("/api/admin/onboarding/progress")
      .then((r) => r.json())
      .then((d) => {
        if (d.day_completion != null) setProgress({
          xp_total: d.xp_total ?? 0,
          streak_days: d.streak_days ?? 0,
          hearts_remaining: d.hearts_remaining ?? HEARTS_MAX,
          skill_scores: d.skill_scores ?? undefined,
          day_completion: d.day_completion ?? {},
        });
      })
      .catch(() => {});
  }, [adminFetch]);

  useEffect(() => {
    if (hasAccess) fetchProgress();
  }, [hasAccess, fetchProgress]);

  useEffect(() => {
    if (phase !== "map") return;
    const interval = setInterval(() => setCountdownTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [phase]);

  const updateProgress = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/onboarding/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const d = await res.json();
      if (d.ok) fetchProgress();
    } finally {
      setSaving(false);
    }
  }, [adminFetch, fetchProgress]);

  const content = currentDay ? getDayContent(currentDay) : null;
  const section = content?.sections[lessonIndex];
  const scenario = content?.scenarios[scenarioIndex];
  const quizQuestion = content?.quiz[quizIndex];

  const isDayUnlocked = (day: number) => {
    if (!progress) return day === 1;
    if (day === 1) return true;
    const prev = progress.day_completion[day - 1];
    if (!prev?.completed) return false;
    const completedAt = prev.completed_at;
    if (!completedAt) return true;
    const elapsed = Date.now() - new Date(completedAt).getTime();
    return elapsed >= DAY_UNLOCK_HOURS_MS;
  };

  const getCountdownMs = (day: number): number | null => {
    if (day <= 1 || !progress) return null;
    const prev = progress.day_completion[day - 1];
    if (!prev?.completed || !prev.completed_at) return null;
    const elapsed = Date.now() - new Date(prev.completed_at).getTime();
    if (elapsed >= DAY_UNLOCK_HOURS_MS) return null;
    return DAY_UNLOCK_HOURS_MS - elapsed;
  };

  const handleStartDay = (day: number) => {
    if (!isDayUnlocked(day)) return;
    const dayContent = getDayContent(day);
    if (!dayContent) return;
    setCurrentDay(day);
    setSelectedChoice(null);
    setShowKeyTakeaway(false);
    setSimulationChoice(null);
    setSimulationStepResults([]);
    setSimulationAiResponse("");
    setSimulationAiResult(null);
    setSimulationResultMode(null);
    const completed = progress?.day_completion[day]?.completed ?? false;
    const savedStep = progress?.day_completion[day]?.current_step ?? 0;
    if (completed) {
      setPhase("lesson");
      setLessonIndex(0);
      setScenarioIndex(0);
      setSimulationStepIndex(0);
      setQuizIndex(0);
      return;
    }
    const { phase, lessonIndex, scenarioIndex, simulationStepIndex: simIdx, quizIndex } = stepToPhase(savedStep, dayContent);
    setPhase(phase);
    setLessonIndex(lessonIndex);
    setScenarioIndex(scenarioIndex);
    setSimulationStepIndex(simIdx);
    setQuizIndex(quizIndex);
    setScenarioResponse("");
    setScenarioResult(null);
    setQuizCorrect(0);
  };

  const handleLessonNext = () => {
    if (!content) return;
    if (lessonIndex < content.sections.length - 1) {
      const nextStep = lessonIndex + 1;
      updateProgress("lesson", { day: currentDay, lesson_index: nextStep, current_step: nextStep });
      setLessonIndex(lessonIndex + 1);
      setSelectedChoice(null);
    } else {
      const nextStep = content.sections.length;
      updateProgress("lesson", { day: currentDay, lesson_index: content.sections.length, current_step: nextStep });
      setPhase("scenario");
      setScenarioIndex(0);
      setScenarioResponse("");
      setScenarioResult(null);
    }
  };

  const handleScenarioSubmit = async () => {
    if (!content || !scenario || !scenarioResponse.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/onboarding/ai-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: currentDay,
          scenario_key: scenario.id,
          user_response: scenarioResponse.trim(),
          locale,
        }),
      });
      const d = await res.json();
      setScenarioResult({
        score: d.score,
        feedback: d.feedback,
        whyNot100: d.whyNot100 ?? null,
        perfectAnswer: d.perfectAnswer ?? "",
        improved_answer: d.improved_answer ?? "",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScenarioNext = () => {
    if (!content) return;
    setScenarioResult(null);
    setScenarioResponse("");
    if (scenarioIndex < content.scenarios.length - 1) {
      const nextStep = content.sections.length + scenarioIndex + 1;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setScenarioIndex(scenarioIndex + 1);
    } else if (content.simulation?.steps.length) {
      const nextStep = content.sections.length + content.scenarios.length;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setPhase("simulation");
      setSimulationStepIndex(0);
      setSimulationChoice(null);
      setSimulationStepResults([]);
      setSimulationAiResponse("");
      setSimulationAiResult(null);
    } else {
      const nextStep = content.sections.length + content.scenarios.length + (content.simulation?.steps.length ?? 0) + 0;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setPhase("quiz");
      setQuizIndex(0);
      setQuizCorrect(0);
    }
  };

  const simStep = content?.simulation?.steps[simulationStepIndex];
  const handleSimulationSelect = (optionId: string) => {
    if (!content?.simulation || saving) return;
    setSimulationChoice(optionId);
  };

  const handleSimulationAiSubmit = async () => {
    if (!content?.simulation || !simStep || saving || simulationAiResponse.trim().length < 5) return;
    if (!("perfectAnswerEn" in simStep)) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/onboarding/ai-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: currentDay,
          scenario_key: `sim:${content.simulation.id}:${simStep.id}`,
          user_response: simulationAiResponse.trim(),
          locale,
        }),
      });
      const d = await res.json();
      setSimulationAiResult({
        score: d.score ?? 0,
        feedback: d.feedback ?? "",
        whyNot100: d.whyNot100 ?? null,
        perfectAnswer: d.perfectAnswer ?? "",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSimulationNext = () => {
    if (!content?.simulation || !simStep) return;
    const simSteps = content.simulation.steps.length;
    const L = content.sections.length;
    const S = content.scenarios.length;
    const isDecision = isSimulationStepDecision(simStep);
    const results = [...simulationStepResults];
    if (isDecision) {
      results.push({ correct: simulationChoice === simStep.correctChoiceId });
    } else {
      results.push({ score: simulationAiResult?.score ?? 0 });
    }
    setSimulationStepResults(results);

    if (simulationStepIndex < simSteps - 1) {
      const nextStep = L + S + simulationStepIndex + 1;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setSimulationStepIndex(simulationStepIndex + 1);
      setSimulationChoice(null);
      setSimulationAiResponse("");
      setSimulationAiResult(null);
    } else {
      const performedWell = results.every(
        (r) => (r.correct !== false) && (r.score === undefined || r.score >= 70)
      );
      setSimulationResultMode(performedWell ? "good" : "poor");
      setPhase("simulation_result");
    }
  };

  const handleSimulationResultContinue = () => {
    if (!content?.simulation || simulationResultMode === null) return;
    const xpEarned = simulationResultMode === "good" ? content.simulation.resultGood.xpReward : 0;
    updateProgress("simulation_complete", {
      day: currentDay,
      simulation_complete: { performed_well: simulationResultMode === "good", xp_earned: xpEarned },
    });
    const L = content.sections.length;
    const S = content.scenarios.length;
    const simSteps = content.simulation.steps.length;
    updateProgress("save_step", { day: currentDay, current_step: L + S + simSteps });
    setPhase("quiz");
    setQuizIndex(0);
    setQuizCorrect(0);
    setSimulationResultMode(null);
    setSimulationStepResults([]);
    setSimulationAiResponse("");
    setSimulationAiResult(null);
    setSimulationChoice(null);
    fetchProgress();
  };

  const handleQuizSelect = (index: number) => {
    if (!quizQuestion || saving) return;
    setSelectedChoice(index);
    if (index === quizQuestion.correctIndex) {
      setQuizCorrect((c) => c + 1);
    } else {
      updateProgress("lose_heart");
    }
  };

  const handleQuizNext = () => {
    if (!content) return;
    setSelectedChoice(null);
    const simLen = content.simulation?.steps.length ?? 0;
    if (quizIndex < content.quiz.length - 1) {
      const nextStep = content.sections.length + content.scenarios.length + simLen + quizIndex + 1;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setQuizIndex(quizIndex + 1);
    } else {
      const nextStep = content.sections.length + content.scenarios.length + simLen + content.quiz.length;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      const perfect = quizCorrect === content.quiz.length;
      updateProgress("quiz", { day: currentDay, quiz_perfect: perfect });
      setPhase("reflection");
    }
  };

  const handleReflectionSubmit = () => {
    setPhase("key_takeaway");
  };

  const handleKeyTakeawayFinish = () => {
    const perfect = content ? quizCorrect === content.quiz.length : false;
    updateProgress("day_complete", { day: currentDay, perfect_day: perfect });
    setCurrentDay(null);
    setPhase("map");
    setReflectionText("");
    setShowKeyTakeaway(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
        <img src="/logo-white.svg" alt="Leo Mây" className="h-12 mb-6" />
        <AdminLoginForm locale={locale} onLocaleChange={setLocaleAndStore} />
        <a href="/admin" className="mt-4 text-sm text-slate-400 hover:text-white">Back to /admin</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700/50 sticky top-0 z-30 bg-slate-900/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-sm text-slate-400 hover:text-white">← Admin</a>
            <img src="/logo-white.svg" alt="Leo Mây" className="h-8" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {progress && (
              <>
                <span className="text-amber-400 font-bold">{progress.xp_total} XP</span>
                <span className="flex items-center gap-1 text-red-400">
                  {"❤".repeat(progress.hearts_remaining)}
                  {"♡".repeat(HEARTS_MAX - progress.hearts_remaining)}
                </span>
                {progress.streak_days > 0 && (
                  <span className="text-emerald-400 text-sm">🔥 {progress.streak_days}</span>
                )}
                {progress.skill_scores && (
                  <div className="hidden sm:flex gap-2 text-[10px]">
                    <span className="text-slate-400" title="Communication">C:{progress.skill_scores.communication}</span>
                    <span className="text-slate-400" title="Safety">S:{progress.skill_scores.safety}</span>
                    <span className="text-slate-400" title="Sales">$:{progress.skill_scores.sales}</span>
                    <span className="text-slate-400" title="Teamwork">T:{progress.skill_scores.teamwork}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setLocaleAndStore("en")}
                className={`px-2 py-1 rounded text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-400"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocaleAndStore("vi")}
                className={`px-2 py-1 rounded text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-400"}`}
              >
                VI
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {phase === "map" && (
          <section className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                {locale === "vi" ? "Đào tạo Leo Mây" : "Leo Mây Onboarding"}
                {role === "frontdesk" && (locale === "vi" ? " — Lễ tân" : " — Front Desk")}
                {role === "staff" && (locale === "vi" ? " — Nhân viên" : " — Staff")}
                {role === "admin" && (locale === "vi" ? " — Quản trị" : " — Admin")}
              </h1>
              <p className="text-slate-400 mt-1">
                {locale === "vi" ? "5 ngày xây văn hóa • Climb the Clouds, Build a Culture" : "5 days to build culture"}
              </p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((day) => {
                const unlocked = isDayUnlocked(day);
                const completed = progress?.day_completion[day]?.completed ?? false;
                const countdownMs = getCountdownMs(day);
                const dc = getDayContent(day);
                const formatCountdown = (ms: number) => {
                  const h = Math.floor(ms / 3600000);
                  const m = Math.floor((ms % 3600000) / 60000);
                  return locale === "vi" ? `Mở khóa sau ${h}h ${m}m` : `Unlocks in ${h}h ${m}m`;
                };
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleStartDay(day)}
                    disabled={!unlocked}
                    className={`relative flex flex-col items-center justify-center rounded-2xl p-4 transition-all ${
                      completed
                        ? "bg-emerald-500/20 border-2 border-emerald-500"
                        : unlocked
                        ? "bg-slate-700/80 border-2 border-amber-500/50 hover:border-amber-400"
                        : "bg-slate-800/60 border-2 border-slate-600 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {completed && <span className="absolute top-2 right-2 text-emerald-400">✓</span>}
                    {!unlocked && countdownMs != null && (
                      <span className="absolute top-1 left-1 right-1 text-[9px] text-amber-400/90 font-medium">
                        {formatCountdown(countdownMs)}
                      </span>
                    )}
                    <span className="text-2xl font-bold">{day}</span>
                    <span className="text-[10px] mt-1 opacity-80 text-center">
                      {dc ? (locale === "vi" ? dc.titleVi : dc.titleEn) : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-slate-800/60 border border-slate-600 p-4 text-center text-slate-300 text-sm">
              {locale === "vi"
                ? "Mỗi ngày mở khóa sau 24h. ~20–30 phút/ngày. XP: +10/bài, +50 hoàn thành ngày, +100 quiz hoàn hảo, +100 thưởng ngày hoàn hảo."
                : "Each day unlocks 24h after the previous. ~20–30 min/day. XP: +10/lesson, +50 day complete, +100 perfect quiz, +100 Perfect Day Bonus."}
            </div>
          </section>
        )}

        {phase === "lesson" && section && content && (
          <LessonCard
            section={section}
            locale={locale}
            lessonIndex={lessonIndex}
            total={content.sections.length}
            selectedChoice={selectedChoice}
            onSelectChoice={setSelectedChoice}
            onNext={handleLessonNext}
            canProceed={section.type !== "choice" || selectedChoice !== null}
            saving={saving}
          />
        )}

        {phase === "scenario" && scenario && content && (
          <ScenarioCard
            scenario={scenario}
            locale={locale}
            index={scenarioIndex}
            total={content.scenarios.length}
            response={scenarioResponse}
            onResponseChange={setScenarioResponse}
            result={scenarioResult}
            onSubmit={handleScenarioSubmit}
            onNext={handleScenarioNext}
            saving={saving}
          />
        )}

        {phase === "simulation" && content?.simulation && simStep && (
          <div className="space-y-6">
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {locale === "vi" ? "Mô phỏng" : "Simulation"} — {simulationStepIndex + 1} / {content.simulation.steps.length}
              </span>
            </div>
            <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-2">
                {locale === "vi" ? content.simulation.titleVi : content.simulation.titleEn}
              </h2>
              <p className="text-slate-300 text-sm mb-4 whitespace-pre-wrap">
                {locale === "vi" ? simStep.sceneVi : simStep.sceneEn}
              </p>
              <p className="text-slate-200 font-medium mb-4">
                {locale === "vi" ? simStep.promptVi : simStep.promptEn}
              </p>

              {isSimulationStepDecision(simStep) ? (
                <>
                  <div className="space-y-2">
                    {simStep.options.map((opt) => {
                      const isCorrect = opt.id === simStep.correctChoiceId;
                      const chosen = simulationChoice === opt.id;
                      const showFeedback = simulationChoice !== null;
                      const correctChoice = showFeedback && chosen && isCorrect;
                      const wrongChoice = showFeedback && chosen && !isCorrect;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => !showFeedback && handleSimulationSelect(opt.id)}
                          disabled={showFeedback}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                            wrongChoice
                              ? "border-red-500/60 bg-red-500/10"
                              : correctChoice
                              ? "border-emerald-500/60 bg-emerald-500/10"
                              : chosen
                              ? "border-amber-500/60 bg-amber-500/10"
                              : "border-slate-600 bg-slate-800/80 hover:border-slate-500"
                          }`}
                        >
                          <span className="text-slate-200">{locale === "vi" ? opt.textVi : opt.textEn}</span>
                          {wrongChoice && (
                            <p className="mt-2 text-xs text-red-300">
                              {locale === "vi" ? simStep.wrongFeedbackVi[opt.id] ?? "" : simStep.wrongFeedbackEn[opt.id] ?? ""}
                            </p>
                          )}
                          {correctChoice && (
                            <p className="mt-2 text-xs text-emerald-300">
                              {locale === "vi" ? simStep.correctFeedbackVi : simStep.correctFeedbackEn}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {simulationChoice !== null && (
                    <button
                      type="button"
                      onClick={handleSimulationNext}
                      disabled={saving}
                      className="mt-6 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
                    >
                      {simulationStepIndex < content.simulation.steps.length - 1
                        ? (locale === "vi" ? "Tiếp" : "Next")
                        : (locale === "vi" ? "Xem kết quả" : "See result")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {"hintEn" in simStep && (
                    <p className="text-slate-400 text-xs mb-3">
                      {locale === "vi" ? simStep.hintVi : simStep.hintEn}
                    </p>
                  )}
                  {simulationAiResult == null ? (
                    <>
                      <textarea
                        value={simulationAiResponse}
                        onChange={(e) => setSimulationAiResponse(e.target.value)}
                        placeholder={locale === "vi" ? "Gõ phản hồi của bạn..." : "Type your response..."}
                        className="w-full h-28 px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500 resize-none"
                        rows={4}
                      />
                      <button
                        type="button"
                        onClick={handleSimulationAiSubmit}
                        disabled={saving || simulationAiResponse.trim().length < 5}
                        className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
                      >
                        {locale === "vi" ? "Gửi" : "Submit"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl bg-slate-900/80 border border-slate-600 p-4 space-y-2">
                        <p className="text-amber-400 font-semibold">
                          {locale === "vi" ? "Điểm" : "Score"}: {simulationAiResult.score}/100
                        </p>
                        <p className="text-slate-300 text-sm">{simulationAiResult.feedback}</p>
                        {simulationAiResult.whyNot100 && (
                          <div className="mt-2 p-3 rounded-lg bg-slate-800 border border-slate-600">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">
                              {locale === "vi" ? "Tại sao chưa 100?" : "Why not 100?"}
                            </p>
                            <p className="text-xs text-slate-300 whitespace-pre-wrap">{simulationAiResult.whyNot100}</p>
                          </div>
                        )}
                        <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <p className="text-xs font-semibold text-emerald-400 uppercase mb-1">
                            {locale === "vi" ? "Đáp án mẫu" : "Perfect answer"}
                          </p>
                          <p className="text-sm text-slate-200 whitespace-pre-wrap">{simulationAiResult.perfectAnswer}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulationNext}
                        disabled={saving}
                        className="mt-6 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
                      >
                        {simulationStepIndex < content.simulation.steps.length - 1
                          ? (locale === "vi" ? "Tiếp" : "Next")
                          : (locale === "vi" ? "Xem kết quả" : "See result")}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setCurrentDay(null); setPhase("map"); }}
              className="text-sm text-slate-400 hover:text-white"
            >
              {locale === "vi" ? "← Về bản đồ" : "← Back to map"}
            </button>
          </div>
        )}

        {phase === "simulation_result" && content?.simulation && simulationResultMode && (
          <div className="space-y-6">
            {simulationResultMode === "good" ? (
              <div className="rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 p-8 shadow-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <span>🔥</span>
                  {locale === "vi" ? content.simulation.resultGood.titleVi : content.simulation.resultGood.titleEn}
                </h2>
                <ul className="space-y-2 mb-6">
                  {(locale === "vi" ? content.simulation.resultGood.strengthsVi : content.simulation.resultGood.strengthsEn).map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-200">
                      <span className="text-emerald-400">✓</span> {s}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-amber-400 font-bold">XP +{content.simulation.resultGood.xpReward}</span>
                  {Object.entries(content.simulation.resultGood.skillDeltas).map(([skill, delta]) =>
                    delta != null && delta > 0 ? (
                      <span key={skill} className="text-emerald-400">
                        {skill === "communication" ? "C" : skill === "safety" ? "S" : skill === "sales" ? "$" : "T"}: +{delta}
                      </span>
                    ) : null
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSimulationResultContinue}
                  disabled={saving}
                  className="mt-6 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
                >
                  {locale === "vi" ? "Đến câu hỏi" : "Continue to quiz"}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-8 shadow-xl">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <span>⚠️</span>
                  {locale === "vi" ? content.simulation.resultPoor.titleVi : content.simulation.resultPoor.titleEn}
                </h2>
                <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  {locale === "vi" ? "Vấn đề chính" : "Key issues"}
                </p>
                <ul className="space-y-1 mb-6 text-slate-300 text-sm list-disc list-inside">
                  {(locale === "vi" ? content.simulation.resultPoor.keyIssuesVi : content.simulation.resultPoor.keyIssuesEn).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  {locale === "vi" ? "Tập trung" : "Focus"}
                </p>
                <ul className="space-y-1 mb-6 text-slate-200 text-sm">
                  {(locale === "vi" ? content.simulation.resultPoor.focusVi : content.simulation.resultPoor.focusEn).map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-amber-400">→</span> {s}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleSimulationResultContinue}
                  disabled={saving}
                  className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
                >
                  {locale === "vi" ? "Đến câu hỏi" : "Continue to quiz"}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "quiz" && quizQuestion && content && (
          <QuizCard
            question={quizQuestion}
            locale={locale}
            index={quizIndex}
            total={content.quiz.length}
            selectedChoice={selectedChoice}
            onSelect={handleQuizSelect}
            onNext={handleQuizNext}
            canProceed={selectedChoice !== null}
            saving={saving}
          />
        )}

        {phase === "reflection" && content && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6">
              <h3 className="text-lg font-semibold mb-2">
                {locale === "vi" ? "Suy ngẫm" : "Reflection"}
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                {locale === "vi" ? content.reflection.promptVi : content.reflection.promptEn}
              </p>
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder={locale === "vi" ? "Viết suy nghĩ của bạn..." : "Write your thoughts..."}
                className="w-full h-24 px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500 resize-none"
                rows={4}
              />
              <button
                type="button"
                onClick={handleReflectionSubmit}
                disabled={saving}
                className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
              >
                {locale === "vi" ? "Hoàn thành ngày" : "Complete Day"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setCurrentDay(null); setPhase("map"); }}
              className="text-sm text-slate-400 hover:text-white"
            >
              {locale === "vi" ? "← Về bản đồ" : "← Back to map"}
            </button>
          </div>
        )}

        {phase === "key_takeaway" && content && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 p-8 text-center">
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider mb-2">
                {locale === "vi" ? "Điểm nhớ ngày " : "Day "}{currentDay} {locale === "vi" ? "" : "takeaway"}
              </p>
              <p className="text-2xl font-bold text-white">
                &ldquo;{locale === "vi" ? content.keyTakeawayVi : content.keyTakeawayEn}&rdquo;
              </p>
              {quizCorrect === content.quiz.length && (
                <p className="mt-3 text-emerald-400 font-semibold text-sm">
                  {locale === "vi" ? "✨ Thưởng Ngày Hoàn Hảo +100 XP!" : "✨ Perfect Day Bonus +100 XP!"}
                </p>
              )}
              <p className="text-slate-400 text-sm mt-4">
                {locale === "vi"
                  ? "Giữ tinh thần này khi bạn làm việc tại Leo Mây."
                  : "Carry this with you at Leo Mây."}
              </p>
              <button
                type="button"
                onClick={handleKeyTakeawayFinish}
                disabled={saving}
                className="mt-6 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
              >
                {locale === "vi" ? "Về bản đồ" : "Back to map"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LessonCard({
  section,
  locale,
  lessonIndex,
  total,
  selectedChoice,
  onSelectChoice,
  onNext,
  canProceed,
  saving,
}: {
  section: LessonSection;
  locale: Locale;
  lessonIndex: number;
  total: number;
  selectedChoice: number | null;
  onSelectChoice: (i: number) => void;
  onNext: () => void;
  canProceed: boolean;
  saving: boolean;
}) {
  const c = getLessonContent(section, locale);
  return (
    <div className="space-y-6">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lessonIndex + 1} / {total}</span>
      </div>
      <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">{c.title}</h2>
        <p className="text-slate-300 leading-relaxed mb-4">{c.content}</p>
        {section.type === "goodvsbad" && c.bad && c.good && (
          <div className="space-y-3 mt-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs font-semibold text-red-400 uppercase mb-1">{locale === "vi" ? "Chưa tốt" : "Avoid"}</p>
              <p className="text-slate-300 text-sm">&quot;{c.bad}&quot;</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <p className="text-xs font-semibold text-emerald-400 uppercase mb-1">{locale === "vi" ? "Tốt" : "Good"}</p>
              <p className="text-slate-300 text-sm">&quot;{c.good}&quot;</p>
            </div>
          </div>
        )}
        {section.type === "list" && c.items && (
          <ul className="space-y-2 mt-4">
            {c.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-300">
                <span className="w-6 h-6 rounded-full bg-amber-500/30 flex items-center justify-center text-xs font-bold">{(i + 1)}</span>
                {item}
              </li>
            ))}
          </ul>
        )}
        {section.type === "choice" && c.choices && (
          <div className="space-y-2 mt-4">
            {c.choices.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectChoice(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedChoice === i ? "border-amber-500 bg-amber-500/10" : "border-slate-600 hover:border-slate-500"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed || saving}
        className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
      >
        {locale === "vi" ? "Tiếp" : "Next"}
      </button>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="block mx-auto text-sm text-slate-400 hover:text-white"
      >
        {locale === "vi" ? "← Về bản đồ" : "← Back to map"}
      </button>
    </div>
  );
}

function ScenarioCard({
  scenario,
  locale,
  index,
  total,
  response,
  onResponseChange,
  result,
  onSubmit,
  onNext,
  saving,
}: {
  scenario: { id: string; titleEn: string; titleVi: string; promptEn: string; promptVi: string; hintEn: string; hintVi: string };
  locale: Locale;
  index: number;
  total: number;
  response: string;
  onResponseChange: (s: string) => void;
  result: { score: number; feedback: string; whyNot100: string | null; perfectAnswer: string; improved_answer: string } | null;
  onSubmit: () => void;
  onNext: () => void;
  saving: boolean;
}) {
  const c = { title: locale === "vi" ? scenario.titleVi : scenario.titleEn, prompt: locale === "vi" ? scenario.promptVi : scenario.promptEn, hint: locale === "vi" ? scenario.hintVi : scenario.hintEn };
  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-400">{index + 1} / {total} {locale === "vi" ? "Tình huống" : "Scenario"}</div>
      <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6">
        <h2 className="text-lg font-bold mb-2">{c.title}</h2>
        <p className="text-slate-300 mb-4">{c.prompt}</p>
        <p className="text-xs text-slate-500 mb-3">{c.hint}</p>
        {!result ? (
          <>
            <textarea
              value={response}
              onChange={(e) => onResponseChange(e.target.value)}
              placeholder={locale === "vi" ? "Viết phản hồi của bạn..." : "Type your response..."}
              className="w-full h-24 px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500 resize-none"
              rows={4}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={!response.trim() || saving}
              className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
            >
              {locale === "vi" ? "Gửi" : "Submit"}
            </button>
          </>
        ) : (
          <>
            <div className={`rounded-lg p-4 ${result.score >= 80 ? "bg-emerald-500/10 border border-emerald-500/30" : result.score >= 60 ? "bg-amber-500/10 border border-amber-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              <p className="font-bold text-lg">{result.score}/100</p>
              <p className="text-slate-300 text-sm mt-1">{result.feedback}</p>
            </div>
            {result.whyNot100 && (
              <div className="rounded-lg p-4 bg-slate-900/80 border border-slate-600">
                <p className="text-xs font-semibold text-amber-400 uppercase mb-2">
                  {locale === "vi" ? "Tại sao chưa 100 điểm?" : "Why not 100 points?"}
                </p>
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{result.whyNot100}</pre>
              </div>
            )}
            <div className="rounded-lg p-4 bg-emerald-500/5 border border-emerald-500/30">
              <p className="text-xs font-semibold text-emerald-400 uppercase mb-2">
                {locale === "vi" ? "Đáp án mẫu (100 điểm)" : "Perfect answer (100 points)"}
              </p>
              <p className="text-slate-300 text-sm italic">&quot;{result.perfectAnswer}&quot;</p>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="mt-4 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400"
            >
              {locale === "vi" ? "Tiếp" : "Next"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuizCard({
  question,
  locale,
  index,
  total,
  selectedChoice,
  onSelect,
  onNext,
  canProceed,
  saving,
}: {
  question: { questionEn: string; questionVi: string; options: { en: string; vi: string }[]; correctIndex: number; id?: string; explanationsEn?: string[]; explanationsVi?: string[] };
  locale: Locale;
  index: number;
  total: number;
  selectedChoice: number | null;
  onSelect: (i: number) => void;
  onNext: () => void;
  canProceed: boolean;
  saving: boolean;
}) {
  const q = getQuizContent(question, locale);
  const correct = selectedChoice === question.correctIndex;
  const explanations: string[] = (q as { explanations?: string[] }).explanations ?? [];
  const chosenExplanation = selectedChoice != null ? explanations[selectedChoice] : undefined;
  const correctExplanation = explanations[question.correctIndex];
  const correctOptionText = q.options[question.correctIndex];
  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-400">{index + 1} / {total} Quiz</div>
      <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6">
        <h2 className="text-lg font-bold mb-4">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              disabled={selectedChoice !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selectedChoice === i
                  ? correct
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-red-500 bg-red-500/10"
                  : "border-slate-600 hover:border-slate-500 disabled:opacity-80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {selectedChoice !== null && chosenExplanation && (
          <div className="mt-6 space-y-4 border-t border-slate-600 pt-4">
            <p className="text-xs font-semibold uppercase text-slate-400">
              {correct ? (locale === "vi" ? "Bạn chọn đúng" : "You chose correctly") : (locale === "vi" ? "Giải thích lựa chọn của bạn" : "Explanation for your choice")}
            </p>
            <div className={`rounded-xl p-4 text-sm ${correct ? "bg-emerald-500/10 border border-emerald-500/30 text-slate-200" : "bg-amber-500/10 border border-amber-500/30 text-slate-200"}`}>
              <p className="whitespace-pre-wrap">{chosenExplanation}</p>
            </div>
            {!correct && correctOptionText && (
              <>
                <p className="text-xs font-semibold uppercase text-emerald-400">
                  {locale === "vi" ? "Đáp án đúng" : "The right answer"}
                </p>
                <p className="text-slate-300 font-medium">&quot;{correctOptionText}&quot;</p>
                {correctExplanation && (
                  <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{correctExplanation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {selectedChoice !== null && (
        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
        >
          {index < total - 1 ? (locale === "vi" ? "Tiếp" : "Next") : (locale === "vi" ? "Xem kết quả" : "See results")}
        </button>
      )}
    </div>
  );
}
