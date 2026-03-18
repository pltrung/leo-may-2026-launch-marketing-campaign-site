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
  type QuizQuestion,
  type OnboardingPhase,
  HEARTS_MAX,
  PRIMARY_SKILL_BY_DAY,
} from "@/lib/onboardingContent";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";

type Phase = "map" | OnboardingPhase | "simulation_result" | "key_takeaway";

const ONBOARDING_LOCALE_KEY = "onboarding-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const s = localStorage.getItem(ONBOARDING_LOCALE_KEY);
  return s === "en" || s === "vi" ? s : "vi";
}

export default function OnboardingPage() {
  const { loading, hasAccess, adminFetch, role, signOut, staffDisplayName } = useAdminAuth();
  const [locale, setLocale] = useState<Locale>("vi");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [progress, setProgress] = useState<{
    xp_total: number;
    streak_days: number;
    hearts_remaining: number;
    skill_scores?: { communication: number; safety: number; sales: number; teamwork: number };
    day_completion: Record<
      number,
      {
        completed: boolean;
        lesson_index: number;
        current_step?: number;
        completed_at?: string | null;
        quiz_correct_count?: number | null;
        quiz_total?: number | null;
        xp_earned?: number;
      }
    >;
    final_score?: number | null;
    passed?: boolean | null;
    critical_fail?: boolean | null;
    certification_date?: string | null;
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
  const [simulationStepResults, setSimulationStepResults] = useState<{ correct?: boolean; score?: number; optionId?: string }[]>([]);
  const [simulationResultMode, setSimulationResultMode] = useState<"good" | "poor" | null>(null);
  const [simulationAiResponse, setSimulationAiResponse] = useState("");
  const [simulationAiResult, setSimulationAiResult] = useState<{
    score: number;
    feedback: string;
    whyNot100: string | null;
    perfectAnswer: string;
  } | null>(null);
  const [showKeyTakeaway, setShowKeyTakeaway] = useState(false);
  const [lessonReorderSubmitted, setLessonReorderSubmitted] = useState(false);
  const [hardScenarioIndex, setHardScenarioIndex] = useState(0);
  const [advancedLessonIndex, setAdvancedLessonIndex] = useState(0);
  const [rankingOrder, setRankingOrder] = useState<number[] | null>(null);
  const [rankingRevealed, setRankingRevealed] = useState(false);
  const [rapidIndex, setRapidIndex] = useState(0);
  const [rapidCorrectCount, setRapidCorrectCount] = useState(0);
  const [certificationScenarioScores, setCertificationScenarioScores] = useState<number[]>([]);
  const [certificationSimPassed, setCertificationSimPassed] = useState(false);
  const [certificationCriticalFail, setCertificationCriticalFail] = useState(false);
  const [certificationSimDecisionCorrect, setCertificationSimDecisionCorrect] = useState<boolean[]>([]);
  const [certificationResult, setCertificationResult] = useState<{
    total_score: number;
    passed: boolean;
    critical_fail: boolean;
    rapid_score: number;
    ai_score: number;
    simulation_score: number;
    quiz_score: number;
    weakest_skill?: "communication" | "safety" | "sales" | "teamwork";
    suggested_day?: number;
  } | null>(null);

  const setLocaleAndStore = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem(ONBOARDING_LOCALE_KEY, l);
  }, []);

  useEffect(() => {
    setLocaleAndStore(getStoredLocale());
  }, [setLocaleAndStore]);

  const fetchProgress = useCallback(async () => {
    try {
      const r = await adminFetch("/api/admin/onboarding/progress");
      const d = await r.json();
      if (d.day_completion != null) {
        setProgress({
          xp_total: d.xp_total ?? 0,
          streak_days: d.streak_days ?? 0,
          hearts_remaining: d.hearts_remaining ?? HEARTS_MAX,
          skill_scores: d.skill_scores ?? undefined,
          day_completion: d.day_completion ?? {},
          final_score: d.final_score ?? undefined,
          passed: d.passed ?? undefined,
          critical_fail: d.critical_fail ?? undefined,
          certification_date: d.certification_date ?? undefined,
        });
      }
    } catch {
      /* ignore */
    }
  }, [adminFetch]);

  useEffect(() => {
    if (hasAccess) void fetchProgress();
  }, [hasAccess, fetchProgress]);

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
  const rapidQuestion = content?.rapidDecisions?.[rapidIndex];

  useEffect(() => {
    if (phase !== "quiz" || !quizQuestion) {
      setRankingOrder(null);
      return;
    }
    const qt = (quizQuestion as QuizQuestion).quizType ?? "multiple_choice";
    if (qt === "ranking" && quizQuestion.options?.length) {
      setRankingOrder(quizQuestion.options.map((_, i) => i));
    } else {
      setRankingOrder(null);
    }
  }, [phase, quizIndex, quizQuestion?.id, (quizQuestion as QuizQuestion)?.quizType, quizQuestion?.options?.length]);

  useEffect(() => {
    if ((quizQuestion as QuizQuestion)?.quizType === "ranking") setRankingRevealed(false);
  }, [quizIndex, (quizQuestion as QuizQuestion)?.quizType]);

  const handleRankingSubmit = useCallback((correct: boolean) => {
    if (correct) setQuizCorrect((c) => c + 1);
    else updateProgress("lose_heart");
    setRankingRevealed(true);
  }, [updateProgress]);

  const isDayUnlocked = (day: number) => {
    if (!progress) return day === 1;
    if (day === 1) return true;
    const prev = progress.day_completion[day - 1];
    return !!prev?.completed;
  };

  const handleStartDay = (day: number) => {
    if (!isDayUnlocked(day)) return;
    const dayContent = getDayContent(day);
    if (!dayContent) return;
    setCurrentDay(day);
    setSelectedChoice(null);
    setShowKeyTakeaway(false);
    setLessonReorderSubmitted(false);
    setSimulationChoice(null);
    setSimulationStepResults([]);
    setSimulationAiResponse("");
    setSimulationAiResult(null);
    setSimulationResultMode(null);
    const completed = progress?.day_completion[day]?.completed ?? false;
    const savedStep = progress?.day_completion[day]?.current_step ?? 0;
    if (completed) {
      setCurrentDay(null);
      setPhase("map");
      return;
    }
    const { phase, lessonIndex, scenarioIndex, simulationStepIndex: simIdx, quizIndex, rapidIndex: savedRapidIndex } = stepToPhase(savedStep, dayContent);
    setPhase(phase as Phase);
    setLessonIndex(lessonIndex);
    setScenarioIndex(scenarioIndex);
    setSimulationStepIndex(simIdx);
    setQuizIndex(quizIndex);
    setRapidIndex(savedRapidIndex);
    setScenarioResponse("");
    setScenarioResult(null);
    setQuizCorrect(0);
    if (day === 7) {
      setRapidCorrectCount(0);
      setCertificationScenarioScores([]);
      setCertificationSimPassed(false);
      setCertificationCriticalFail(false);
      setCertificationSimDecisionCorrect([]);
      setCertificationResult(null);
    }
  };

  const handleLessonNext = () => {
    if (!content) return;
    setLessonReorderSubmitted(false);
    if (lessonIndex < content.sections.length - 1) {
      const nextStep = lessonIndex + 1;
      updateProgress("lesson", { day: currentDay, lesson_index: nextStep, current_step: nextStep });
      setLessonIndex(lessonIndex + 1);
      setSelectedChoice(null);
    } else {
      const L = content.sections.length;
      const R = content.rapidDecisions?.length ?? 0;
      if (R > 0) {
        const nextStep = phaseToStep("rapid_decisions", L - 1, 0, 0, 0, content, 0);
        updateProgress("save_step", { day: currentDay, current_step: nextStep });
        setPhase("rapid_decisions");
        setRapidIndex(0);
        setRapidCorrectCount(0);
        setScenarioIndex(0);
        setScenarioResponse("");
        setScenarioResult(null);
      } else {
        const nextStep = phaseToStep("scenario", L - 1, 0, 0, 0, content);
        updateProgress("lesson", { day: currentDay, lesson_index: L, current_step: nextStep });
        setPhase("scenario");
        setScenarioIndex(0);
        setScenarioResponse("");
        setScenarioResult(null);
      }
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
      if (!res.ok) {
        setScenarioResult({
          score: 0,
          feedback: d?.error ?? (locale === "vi" ? "Không thể chấm điểm." : "Could not evaluate."),
          whyNot100: null,
          perfectAnswer: locale === "vi" ? scenario.perfectAnswerVi : scenario.perfectAnswerEn,
          improved_answer: locale === "vi" ? scenario.perfectAnswerVi : scenario.perfectAnswerEn,
        });
        return;
      }
      setScenarioResult({
        score: d.score,
        feedback: d.feedback,
        whyNot100: d.whyNot100 ?? null,
        perfectAnswer: d.perfectAnswer ?? "",
        improved_answer: d.improved_answer ?? "",
      });
      const score = typeof d.score === "number" ? d.score : 0;
      const primarySkill = currentDay != null ? PRIMARY_SKILL_BY_DAY[currentDay] : null;
      if (primarySkill) {
        const delta = Math.min(5, Math.max(0, Math.floor(score / 20)));
        if (delta > 0) {
          updateProgress("update_skills", { skill_deltas: { [primarySkill]: delta } });
        }
      }
    } catch {
      setScenarioResult({
        score: 0,
        feedback: locale === "vi" ? "Lỗi kết nối. Xem đáp án mẫu và nhấn Tiếp." : "Connection error. See sample answer and click Next.",
        whyNot100: null,
        perfectAnswer: locale === "vi" ? scenario.perfectAnswerVi : scenario.perfectAnswerEn,
        improved_answer: locale === "vi" ? scenario.perfectAnswerVi : scenario.perfectAnswerEn,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleHardScenarioSubmit = async () => {
    if (!content?.hardModeScenarios?.length || !scenarioResponse.trim()) return;
    const hardScenario = content.hardModeScenarios[hardScenarioIndex];
    if (!hardScenario) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/onboarding/ai-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: currentDay,
          scenario_key: hardScenario.id,
          user_response: scenarioResponse.trim(),
          locale,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        const msg = d?.error ?? (locale === "vi" ? "Không thể chấm điểm. Thử lại." : "Could not evaluate. Try again.");
        setScenarioResult({
          score: 0,
          feedback: msg,
          whyNot100: msg,
          perfectAnswer: locale === "vi" ? hardScenario.perfectAnswerVi : hardScenario.perfectAnswerEn,
          improved_answer: locale === "vi" ? hardScenario.perfectAnswerVi : hardScenario.perfectAnswerEn,
        });
        return;
      }
      setScenarioResult({
        score: d.score,
        feedback: d.feedback,
        whyNot100: d.whyNot100 ?? null,
        perfectAnswer: d.perfectAnswer ?? "",
        improved_answer: d.improved_answer ?? "",
      });
      const score = typeof d.score === "number" ? d.score : 0;
      const primarySkill = currentDay != null ? PRIMARY_SKILL_BY_DAY[currentDay] : null;
      if (primarySkill) {
        const delta = Math.min(5, Math.max(0, Math.floor(score / 20)));
        if (delta > 0) {
          updateProgress("update_skills", { skill_deltas: { [primarySkill]: delta } });
        }
      }
    } catch {
      setScenarioResult({
        score: 0,
        feedback: locale === "vi" ? "Lỗi kết nối. Bạn vẫn có thể xem đáp án mẫu và nhấn Tiếp." : "Connection error. You can still see the sample answer and click Next.",
        whyNot100: null,
        perfectAnswer: locale === "vi" ? hardScenario.perfectAnswerVi : hardScenario.perfectAnswerEn,
        improved_answer: locale === "vi" ? hardScenario.perfectAnswerVi : hardScenario.perfectAnswerEn,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRapidSelect = (optionIndex: number) => {
    if (!content?.rapidDecisions || rapidQuestion == null) return;
    const R = content.rapidDecisions.length;
    if (optionIndex === rapidQuestion.correctIndex) setRapidCorrectCount((c) => c + 1);
    const L = content.sections.length;
    if (rapidIndex < R - 1) {
      const nextStep = phaseToStep("rapid_decisions", L - 1, 0, 0, 0, content, rapidIndex + 1);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setRapidIndex(rapidIndex + 1);
    } else {
      const nextStep = phaseToStep("scenario", L - 1, 0, 0, 0, content, R - 1);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setPhase("scenario");
      setScenarioIndex(0);
      setScenarioResponse("");
      setScenarioResult(null);
    }
  };

  const handleScenarioNext = () => {
    if (!content) return;
    if (currentDay === 7 && scenarioResult?.score != null) {
      setCertificationScenarioScores((prev) => [...prev, scenarioResult.score]);
    }
    setScenarioResult(null);
    setScenarioResponse("");
    const L = content.sections.length;
    const R = content.rapidDecisions?.length ?? 0;
    const S = content.scenarios.length;
    const Sim = content.simulation?.steps.length ?? 0;
    if (scenarioIndex < S - 1) {
      const nextStep = phaseToStep("scenario", L - 1, scenarioIndex + 1, 0, 0, content, R > 0 ? rapidIndex : undefined);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setScenarioIndex(scenarioIndex + 1);
    } else if (Sim > 0) {
      const nextStep = phaseToStep("simulation", L - 1, S - 1, 0, 0, content, R > 0 ? rapidIndex : undefined);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setPhase("simulation");
      setSimulationStepIndex(0);
      setSimulationChoice(null);
      setSimulationStepResults([]);
      setSimulationAiResponse("");
      setSimulationAiResult(null);
    } else {
      const nextStep = phaseToStep("quiz", L - 1, S - 1, Sim - 1, 0, content, R > 0 ? rapidIndex : undefined);
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
    const R = content.rapidDecisions?.length ?? 0;
    const S = content.scenarios.length;
    const isDecision = isSimulationStepDecision(simStep);
    const results = [...simulationStepResults];
    if (isDecision) {
      results.push({ correct: simulationChoice === simStep.correctChoiceId, optionId: simulationChoice ?? undefined });
    } else {
      results.push({ score: simulationAiResult?.score ?? 0 });
    }
    setSimulationStepResults(results);

    if (currentDay === 7 && content.simulation) {
      const steps = content.simulation.steps;
      const decisionCorrect = steps.map((s, i) => (s.type === "decision" ? results[i]?.correct === true : null)).filter((x): x is boolean => x !== null);
      setCertificationSimDecisionCorrect(decisionCorrect);
      const anyCritical = steps.some(
        (s, i) => s.type === "decision" && results[i]?.correct === false && (s as { criticalWrongIds?: string[] }).criticalWrongIds?.includes((results[i] as { optionId?: string }).optionId ?? "")
      );
      if (anyCritical) setCertificationCriticalFail(true);
    }

    if (simulationStepIndex < simSteps - 1) {
      const nextStep = phaseToStep("simulation", L - 1, S - 1, simulationStepIndex + 1, 0, content, R > 0 ? rapidIndex : undefined);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setSimulationStepIndex(simulationStepIndex + 1);
      setSimulationChoice(null);
      setSimulationAiResponse("");
      setSimulationAiResult(null);
    } else {
      const performedWell = results.every(
        (r) => (r.correct !== false) && (r.score === undefined || r.score >= 70)
      );
      if (currentDay === 7) setCertificationSimPassed(performedWell);
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
    const primarySkill = currentDay != null ? PRIMARY_SKILL_BY_DAY[currentDay] : null;
    if (primarySkill) {
      const delta = simulationResultMode === "good" ? 5 : 1;
      updateProgress("update_skills", { skill_deltas: { [primarySkill]: delta } });
    }
    const L = content.sections.length;
    const R = content.rapidDecisions?.length ?? 0;
    const S = content.scenarios.length;
    const simSteps = content.simulation.steps.length;
    const nextStep = phaseToStep("quiz", L - 1, S - 1, simSteps - 1, 0, content, R > 0 ? rapidIndex : undefined);
    updateProgress("save_step", { day: currentDay, current_step: nextStep });
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
    if (!content || !quizQuestion) return;
    setSelectedChoice(null);
    setRankingOrder(null);
    setRankingRevealed(false);
    const L = content.sections.length;
    const R = content.rapidDecisions?.length ?? 0;
    const S = content.scenarios.length;
    const simLen = content.simulation?.steps.length ?? 0;
    if (quizIndex < content.quiz.length - 1) {
      const nextStep = phaseToStep("quiz", L - 1, S - 1, simLen - 1, quizIndex + 1, content, R > 0 ? rapidIndex : undefined);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setQuizIndex(quizIndex + 1);
    } else {
      const nextStep = phaseToStep(currentDay === 7 ? "certification_result" : "reflection", L - 1, S - 1, simLen - 1, content.quiz.length - 1, content, R > 0 ? rapidIndex : undefined);
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      const perfect = quizCorrect === content.quiz.length;
      updateProgress("quiz", { day: currentDay, quiz_perfect: perfect });
      const primarySkill = currentDay != null ? PRIMARY_SKILL_BY_DAY[currentDay] : null;
      if (primarySkill) {
        const total = content.quiz.length;
        const delta = total === 0 ? 0 : quizCorrect >= total ? 5 : quizCorrect >= total - 1 ? 3 : quizCorrect >= total - 2 ? 1 : 0;
        if (delta > 0) {
          updateProgress("update_skills", { skill_deltas: { [primarySkill]: delta } });
        }
      }
      if (currentDay === 7) {
        const RAPID_WEIGHT = 15;
        const AI_WEIGHT = 25;
        const SIM_WEIGHT = 40;
        const QUIZ_WEIGHT = 20;
        const rapidTotal = 10;
        const rapid_score = (rapidCorrectCount / rapidTotal) * RAPID_WEIGHT;
        const scScores = certificationScenarioScores.length >= 3 ? certificationScenarioScores : certificationScenarioScores;
        const avgAi = scScores.length ? scScores.reduce((a, b) => a + b, 0) / scScores.length : 0;
        let ai_score = (avgAi / 100) * AI_WEIGHT;
        if (avgAi >= 90) ai_score = Math.min(AI_WEIGHT, ai_score + 2);
        const decisionSteps = certificationSimDecisionCorrect.length;
        const decisionCorrectCount = certificationSimDecisionCorrect.filter(Boolean).length;
        const decision_accuracy = decisionSteps ? decisionCorrectCount / decisionSteps : 0;
        const flow_completion = !certificationCriticalFail;
        const tone_score = certificationCriticalFail ? 0 : 1;
        const simAiAvg = 0;
        let simulation_score = decision_accuracy * 20 + simAiAvg * 0.1 + (flow_completion ? 5 : 0) + tone_score * 5;
        if (certificationCriticalFail) simulation_score = Math.max(0, simulation_score - 10);
        const quizTotal = content.quiz.length || 1;
        const quiz_score = (quizCorrect / quizTotal) * QUIZ_WEIGHT;
        const total_score = Math.round(rapid_score + ai_score + simulation_score + quiz_score);
        const finalCapped = Math.min(100, Math.max(0, total_score));
        const passed = finalCapped >= 80 && !certificationCriticalFail;
        const sections = [
          { key: "rapid" as const, score: rapid_score, max: RAPID_WEIGHT },
          { key: "ai" as const, score: ai_score, max: AI_WEIGHT },
          { key: "sim" as const, score: simulation_score, max: SIM_WEIGHT },
          { key: "quiz" as const, score: quiz_score, max: QUIZ_WEIGHT },
        ];
        const worst = sections.reduce((a, b) => (a.score / a.max <= b.score / b.max ? a : b));
        const weakest_skill: "communication" | "safety" | "sales" | "teamwork" =
          worst.key === "rapid" || worst.key === "ai" ? "communication" : worst.key === "sim" ? "safety" : "sales";
        const suggested_day = worst.key === "rapid" ? 1 : worst.key === "ai" ? 6 : worst.key === "sim" ? 6 : 4;
        setCertificationResult({
          total_score: finalCapped,
          passed,
          critical_fail: certificationCriticalFail,
          rapid_score,
          ai_score,
          simulation_score,
          quiz_score,
          weakest_skill,
          suggested_day,
        });
        adminFetch("/api/admin/onboarding/progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "certification_complete",
            final_score: finalCapped,
            passed,
            critical_fail: certificationCriticalFail,
            certification_date: new Date().toISOString(),
          }),
        }).then(() => fetchProgress()).catch(() => {});
      }
      setPhase(currentDay === 7 ? "certification_result" : "reflection");
    }
  };

  const handleReflectionSubmit = () => {
    setPhase("key_takeaway");
  };

  const handleKeyTakeawayFinish = () => {
    const perfect = content ? quizCorrect === content.quiz.length : false;
    updateProgress("day_complete", {
      day: currentDay,
      perfect_day: perfect,
      quiz_correct_count: content ? quizCorrect : undefined,
      quiz_total: content ? content.quiz.length : undefined,
    });
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

  const t = getMessages(locale).admin;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50">
      <header className="relative z-30 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur shrink-0">
        <div className="max-w-[1100px] mx-auto px-3 py-2 md:px-4 md:py-3 flex justify-end">
          <div className="relative">
                <button type="button" onClick={() => setHeaderMenuOpen((o) => !o)} className="p-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" aria-label="Menu">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                {headerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setHeaderMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[110] min-w-[180px] rounded-xl border border-slate-700 bg-slate-800 shadow-xl py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{locale === "vi" ? "Điều hướng" : "Navigation"}</div>
                      <a href="/admin" onClick={() => setHeaderMenuOpen(false)} className="block w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
                        {locale === "vi" ? "← Bảng điều khiển" : "← Dashboard"}
                      </a>
                      <div className="border-t border-slate-700 my-1" />
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{locale === "vi" ? "Tài khoản" : "Account"}</div>
                      <button type="button" onClick={() => { signOut(); setHeaderMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
                        {t.logout}
                      </button>
                      <div className="border-t border-slate-700 my-1" />
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{locale === "vi" ? "Ngôn ngữ" : "Preferences"}</div>
                      <div className="flex gap-0.5 p-2">
                        <button type="button" onClick={() => { setLocaleAndStore("en"); setHeaderMenuOpen(false); }} className={`flex-1 py-1 rounded-lg text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}>EN</button>
                        <button type="button" onClick={() => { setLocaleAndStore("vi"); setHeaderMenuOpen(false); }} className={`flex-1 py-1 rounded-lg text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}>VN</button>
                      </div>
                    </div>
                  </>
                )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="max-w-[1100px] mx-auto px-3 py-3 md:px-4 md:py-6">
          {phase === "map" ? (
            <>
              {/* Hero: brand-first, mobile-first */}
              <section className="text-center pt-4 pb-6 md:pt-8 md:pb-10">
                <div className="flex justify-center mb-6 md:mb-8">
                  <img
                    src="/logo-white.svg"
                    alt="Leo Mây"
                    className="w-[min(72vw,280px)] sm:w-[min(65vw,320px)] md:w-[min(55vw,380px)] h-auto drop-shadow-[0_0_40px_rgba(251,191,36,0.15)] animate-[float_4s_ease-in-out_infinite]"
                    style={{ animation: "float 4s ease-in-out infinite" }}
                  />
                </div>
                <style>{`@keyframes float { 0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 24px rgba(251,191,36,0.12)); } 50% { transform: translateY(-6px); filter: drop-shadow(0 0 32px rgba(251,191,36,0.2)); } }`}</style>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {locale === "vi" ? "Đào tạo Leo Mây" : "Leo Mây Onboarding"}
                </h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base">
                  Climb the Clouds
                </p>
              </section>

              {/* Certificate + analytics after passing 7-day certification */}
              {progress?.passed && progress.certification_date && (
                <section
                  className="max-w-2xl mx-auto mb-8 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-slate-800/95 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-[0_0_48px_rgba(245,158,11,0.12)]"
                  aria-label={locale === "vi" ? "Chứng nhận hoàn thành" : "Completion certificate"}
                >
                  <p className="text-center text-amber-400/90 text-[11px] md:text-xs font-semibold tracking-[0.25em] uppercase mb-2">
                    {locale === "vi" ? "Chứng nhận hoàn thành" : "Certificate of completion"}
                  </p>
                  <h2 className="text-center text-xl md:text-2xl font-bold text-white mb-1">
                    {staffDisplayName?.trim() || (locale === "vi" ? "Nhân viên" : "Staff member")}
                  </h2>
                  <p className="text-center text-slate-400 text-sm mb-4">
                    {locale === "vi"
                      ? "Đã hoàn thành chương trình đào tạo 7 ngày — Leo Mây"
                      : "Completed the 7-day Leo Mây onboarding program"}
                  </p>
                  <div className="flex justify-center mb-6">
                    <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-6 py-3">
                      <p className="text-center text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                        {locale === "vi" ? "Điểm chứng nhận" : "Final certification score"}
                      </p>
                      <p className="text-center text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">
                        {progress.final_score ?? "—"}
                        <span className="text-lg text-slate-500 font-semibold">/100</span>
                      </p>
                    </div>
                  </div>
                  {progress.skill_scores && (
                    <div className="mb-6">
                      <p className="text-center text-[10px] text-slate-500 uppercase tracking-wider mb-3">
                        {locale === "vi" ? "Kỹ năng (sau khóa)" : "Skill levels"}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                        {(
                          [
                            ["communication", locale === "vi" ? "Giao tiếp" : "Communication"],
                            ["safety", locale === "vi" ? "An toàn" : "Safety"],
                            ["sales", locale === "vi" ? "Bán hàng" : "Sales"],
                            ["teamwork", locale === "vi" ? "Làm nhóm" : "Teamwork"],
                          ] as const
                        ).map(([key, label]) => {
                          const v = progress.skill_scores![key] ?? 0;
                          return (
                            <div key={key} className="rounded-lg bg-slate-800/80 border border-slate-600/80 p-3 text-center">
                              <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                              <p className="text-xl font-bold text-amber-400 tabular-nums">{v}</p>
                              <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${Math.min(100, v)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-center text-[10px] text-slate-500 uppercase tracking-wider mb-3">
                      {locale === "vi" ? "7 ngày đào tạo" : "7-day journey"}
                    </p>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const dc = progress.day_completion[day];
                        const done = dc?.completed ?? false;
                        const q =
                          dc?.quiz_total != null && dc.quiz_total > 0
                            ? `${dc.quiz_correct_count ?? 0}/${dc.quiz_total}`
                            : null;
                        const xp = dc?.xp_earned != null && dc.xp_earned > 0 ? `+${dc.xp_earned} XP` : null;
                        return (
                          <div
                            key={day}
                            className={`rounded-lg border p-2 text-center ${
                              done ? "bg-emerald-500/20 border-emerald-500/50" : "bg-slate-800/50 border-slate-600 opacity-60"
                            }`}
                          >
                            <p className="text-xs font-bold text-white">{locale === "vi" ? `N${day}` : `D${day}`}</p>
                            {done ? <p className="text-emerald-400 text-sm mt-0.5">✓</p> : <p className="text-slate-600 text-xs mt-0.5">—</p>}
                            {q && <p className="text-[9px] text-slate-400 mt-1 leading-tight">{locale === "vi" ? `Quiz ${q}` : `Quiz ${q}`}</p>}
                            {xp && done && <p className="text-[9px] text-amber-400/80 mt-0.5">{xp}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-center text-slate-500 text-xs mt-5">
                    {locale === "vi" ? "Ngày cấp: " : "Issued: "}
                    {new Date(progress.certification_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </section>
              )}

              {/* Game-style progression */}
              {progress && (
                <div className="flex justify-center mb-6 md:mb-8">
                  <p className="text-slate-300 text-sm font-medium">
                    Level {Math.max(1, 1 + Math.floor(progress.xp_total / 200))} • {progress.xp_total} XP{" "}
                    <span className="inline-flex" aria-label="Hearts">
                      <span className="text-red-400">{"❤".repeat(progress.hearts_remaining)}</span>
                      <span className="text-slate-600">{"♡".repeat(HEARTS_MAX - progress.hearts_remaining)}</span>
                    </span>
                    {progress.streak_days > 0 && <span className="text-emerald-400 ml-1">🔥 {progress.streak_days}</span>}
                  </p>
                </div>
              )}

              {/* Journey-style day cards: horizontal flow, depth, glow */}
              <section className="max-w-2xl mx-auto">
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const unlocked = isDayUnlocked(day);
                    const completed = progress?.day_completion[day]?.completed ?? false;
                    const dc = getDayContent(day);
                    const isNext = unlocked && !completed && (day === 1 || progress?.day_completion[day - 1]?.completed);
                    const isCurrent = isNext || (unlocked && !completed && day === 1);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleStartDay(day)}
                        disabled={!unlocked}
                        className={`relative flex flex-col items-center justify-center rounded-2xl p-4 min-w-[72px] sm:min-w-[80px] transition-all duration-300 active:scale-[0.98] ${
                          completed
                            ? "bg-emerald-500/15 border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/10"
                            : unlocked
                            ? isCurrent
                              ? "bg-amber-500/20 border-2 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30"
                              : "bg-slate-700/80 border-2 border-slate-500 hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/10"
                            : "bg-slate-800/70 border-2 border-slate-600 opacity-70 cursor-not-allowed"
                        }`}
                      >
                        {completed && <span className="absolute top-2 right-2 text-emerald-400 text-sm">✓</span>}
                        <span className={`font-bold text-2xl ${completed ? "text-emerald-300" : unlocked ? "text-white" : "text-slate-500"}`}>{day}</span>
                        <span className="text-[10px] mt-1 opacity-90 text-center text-slate-400 line-clamp-2">
                          {dc ? (locale === "vi" ? dc.titleVi : dc.titleEn) : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Primary CTA */}
                {progress && (() => {
                  const dayToStart = [1, 2, 3, 4, 5, 6, 7].find((d) => isDayUnlocked(d) && !progress.day_completion[d]?.completed) ?? 1;
                  const canStart = isDayUnlocked(dayToStart);
                  const hasProgress = (progress.day_completion[dayToStart]?.current_step ?? 0) > 0;
                  const label = hasProgress
                    ? (locale === "vi" ? `Tiếp tục Ngày ${dayToStart}` : `Continue Day ${dayToStart}`)
                    : (locale === "vi" ? `Bắt đầu Ngày ${dayToStart}` : `Start Day ${dayToStart}`);
                  return (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={() => dayToStart != null && handleStartDay(dayToStart)}
                        disabled={!canStart}
                        className="px-8 py-4 rounded-2xl text-lg font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {label}
                      </button>
                    </div>
                  );
                })()}
              </section>
            </>
          ) : progress ? (
            <div className="flex flex-wrap items-center justify-center gap-2 py-2 border-b border-slate-800/50 mb-4">
              <span className="text-slate-400 text-sm">Level {Math.max(1, 1 + Math.floor(progress.xp_total / 200))} • {progress.xp_total} XP</span>
              <span className="text-red-400 text-sm">{"❤".repeat(progress.hearts_remaining)}{"♡".repeat(HEARTS_MAX - progress.hearts_remaining)}</span>
            </div>
          ) : null}

          <div className="max-w-2xl mx-auto">
        {phase === "lesson" && section && content && (
          <LessonCard
            section={section}
            locale={locale}
            lessonIndex={lessonIndex}
            total={content.sections.length}
            selectedChoice={selectedChoice}
            onSelectChoice={setSelectedChoice}
            onNext={handleLessonNext}
            onReorderSubmit={() => setLessonReorderSubmitted(true)}
            canProceed={
              (section.type !== "choice" && section.type !== "choose_better" && section.type !== "fix_sentence" && section.type !== "tap_mistake" && section.type !== "reorder_steps") ||
              (section.type === "reorder_steps" ? lessonReorderSubmitted : selectedChoice !== null)
            }
            saving={saving}
            onBackToMap={() => { setCurrentDay(null); setPhase("map"); }}
          />
        )}

        {phase === "rapid_decisions" && content?.rapidDecisions && rapidQuestion && (
          <section className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6 max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-bold text-amber-400">
              {locale === "vi" ? "Quyết định nhanh" : "Rapid decisions"} — {rapidIndex + 1} / {content.rapidDecisions.length}
            </h2>
            <p className="text-slate-200 font-medium">
              {locale === "vi" ? rapidQuestion.questionVi : rapidQuestion.questionEn}
            </p>
            <div className="space-y-2">
              {rapidQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRapidSelect(idx)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-800/80 hover:border-amber-500/50 hover:bg-slate-700/80 transition-all text-slate-200"
                >
                  {locale === "vi" ? opt.vi : opt.en}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {locale === "vi" ? "Giải thích sẽ hiện sau khi hoàn thành tất cả." : "Explanations shown after all questions."}
            </p>
          </section>
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
            canProceed={(quizQuestion as QuizQuestion).quizType === "ranking" ? rankingRevealed : selectedChoice !== null}
            saving={saving}
            rankingOrder={rankingOrder}
            onRankingChange={setRankingOrder}
            rankingRevealed={rankingRevealed}
            onRankingSubmit={handleRankingSubmit}
          />
        )}

        {phase === "certification_result" && content && currentDay === 7 && (
          <section className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6 max-w-md mx-auto space-y-6">
            {(certificationResult ?? (progress?.passed != null && progress?.final_score != null
              ? { passed: progress.passed, total_score: progress.final_score ?? 0, critical_fail: progress.critical_fail ?? false }
              : null)) ? (
              (() => {
                const result = certificationResult ?? {
                  passed: progress!.passed!,
                  total_score: progress!.final_score!,
                  critical_fail: progress!.critical_fail ?? false,
                  rapid_score: 0,
                  ai_score: 0,
                  simulation_score: 0,
                  quiz_score: 0,
                };
                return result.passed ? (
                  <>
                    <h2 className="text-2xl font-bold text-emerald-400">
                      {locale === "vi" ? "Bạn đã sẵn sàng" : "You are ready"}
                    </h2>
                    <p className="text-slate-300">
                      {locale === "vi" ? "Chứng nhận cuối: Đạt. Bạn đã chứng minh hành vi, giao tiếp và quy trình onboarding đúng. Có thể tiến tới thực tập thực tế." : "Final certification: Pass. You demonstrated correct behavior, communication, and onboarding flow. You may proceed to real-world internship."}
                    </p>
                    <p className="text-amber-400 font-semibold">Score: {result.total_score}/100</p>
                    <p className="text-slate-400 text-sm">
                      {locale === "vi" ? "Phần thưởng XP đã được cộng. Trở về bản đồ để xem tiến độ." : "XP reward applied. Return to map to see progress."}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetchProgress();
                        setCurrentDay(null);
                        setPhase("map");
                        setCertificationResult(null);
                      }}
                      className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400"
                    >
                      {locale === "vi" ? "← Quay lại bản đồ" : "← Back to map"}
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-red-400">
                      {locale === "vi" ? "Chưa đạt" : "Not yet"}
                    </h2>
                    <p className="text-slate-300">
                      {locale === "vi" ? "Tổng điểm dưới 80 hoặc có lỗi nghiêm trọng. Xem các mục yếu và ôn lại ngày được gợi ý." : "Total score below 80 or critical fail. Review weak areas and recommended day to revisit."}
                    </p>
                    <p className="text-slate-400">Score: {result.total_score}/100 (need ≥80)</p>
                    {result.critical_fail && (
                      <p className="text-red-300 text-sm">
                        {locale === "vi" ? "Lỗi nghiêm trọng: an toàn, bỏ qua bước onboarding, hoặc hành vi không đúng với người mới." : "Critical fail: safety, skipped onboarding steps, or incorrect behavior with newbie."}
                      </p>
                    )}
                    {certificationResult != null && (
                      <>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>Rapid: {certificationResult.rapid_score.toFixed(1)}/15 — AI: {certificationResult.ai_score.toFixed(1)}/25 — Sim: {certificationResult.simulation_score.toFixed(1)}/40 — Quiz: {certificationResult.quiz_score.toFixed(1)}/20</p>
                          {certificationResult.weakest_skill && (
                            <p>
                              {locale === "vi" ? "Kỹ năng cần cải thiện: " : "Weakest skill: "}
                              <span className="font-medium text-amber-400">
                                {certificationResult.weakest_skill === "communication" ? (locale === "vi" ? "Giao tiếp (C)" : "Communication (C)") : certificationResult.weakest_skill === "safety" ? (locale === "vi" ? "An toàn (S)" : "Safety (S)") : certificationResult.weakest_skill === "sales" ? (locale === "vi" ? "Bán hàng ($)" : "Sales ($)") : (locale === "vi" ? "Đội (T)" : "Teamwork (T)")}
                              </span>
                            </p>
                          )}
                          {certificationResult.suggested_day != null && (
                            <p>{locale === "vi" ? "Gợi ý ôn lại: Ngày " : "Suggested day to revisit: Day "}{certificationResult.suggested_day}</p>
                          )}
                        </div>
                      </>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setCurrentDay(null); setPhase("map"); setCertificationResult(null); }}
                        className="flex-1 py-2 rounded-xl border border-slate-500 text-slate-300 hover:bg-slate-700"
                      >
                        {locale === "vi" ? "Quay lại bản đồ" : "Back to map"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          adminFetch("/api/admin/onboarding/progress", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "reset_day", day: 7 }),
                          }).then(() => {
                            fetchProgress();
                            setCertificationResult(null);
                            setCertificationCriticalFail(false);
                            setCertificationSimDecisionCorrect([]);
                            setPhase("lesson");
                            setCurrentDay(7);
                            setLessonIndex(0);
                            setRapidIndex(0);
                            setRapidCorrectCount(0);
                            setCertificationScenarioScores([]);
                            setCertificationSimPassed(false);
                            setScenarioIndex(0);
                            setScenarioResponse("");
                            setScenarioResult(null);
                            setSimulationStepIndex(0);
                            setSimulationChoice(null);
                            setSimulationStepResults([]);
                            setSimulationResultMode(null);
                            setQuizIndex(0);
                            setQuizCorrect(0);
                          }).catch(() => {});
                        }}
                        className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30"
                      >
                        {locale === "vi" ? "Thử lại" : "Retry"}
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              <p className="text-slate-400">{locale === "vi" ? "Đang tính kết quả..." : "Computing result..."}</p>
            )}
          </section>
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
          </div>
        </div>
      </main>
    </div>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function LessonCard({
  section,
  locale,
  lessonIndex,
  total,
  selectedChoice,
  onSelectChoice,
  onNext,
  onReorderSubmit,
  canProceed,
  saving,
  onBackToMap,
}: {
  section: LessonSection;
  locale: Locale;
  lessonIndex: number;
  total: number;
  selectedChoice: number | null;
  onSelectChoice: (i: number) => void;
  onNext: () => void;
  onReorderSubmit?: () => void;
  canProceed: boolean;
  saving: boolean;
  onBackToMap?: () => void;
}) {
  const c = getLessonContent(section, locale);
  const [reorderOrder, setReorderOrder] = React.useState<(number | null)[]>([]);
  const [reorderSubmitted, setReorderSubmitted] = React.useState(false);
  const [reorderCorrect, setReorderCorrect] = React.useState<boolean | null>(null);
  const shuffledSteps = React.useMemo(() => (c.stepsOrder?.length ? shuffleArray(c.stepsOrder) : []), [section.id]);
  const correctReorder = React.useMemo(
    () => (c.stepsOrder?.length ? c.stepsOrder.map((s) => shuffledSteps.indexOf(s)) : []),
    [c.stepsOrder, shuffledSteps]
  );

  React.useEffect(() => {
    setReorderOrder(shuffledSteps.map(() => null));
    setReorderSubmitted(false);
    setReorderCorrect(null);
  }, [section.id, shuffledSteps.length]);

  const isReorderComplete = section.type === "reorder_steps" && reorderOrder.length === shuffledSteps.length && reorderOrder.every((x) => x !== null);
  const handleReorderNext = () => {
    if (section.type !== "reorder_steps" || !onReorderSubmit) return;
    if (!reorderSubmitted) {
      const correct = reorderOrder.length === correctReorder.length && reorderOrder.every((v, i) => v === correctReorder[i]);
      setReorderCorrect(correct);
      setReorderSubmitted(true);
      onReorderSubmit();
    } else {
      onNext();
    }
  };

  const showChoiceFeedback = (section.type === "choice" || section.type === "choose_better" || section.type === "fix_sentence" || section.type === "tap_mistake") && selectedChoice !== null;
  const isCorrectChoice = section.type === "choice" && c.correctChoiceIndex != null ? selectedChoice === c.correctChoiceIndex
    : (section.type === "choose_better" || section.type === "fix_sentence" || section.type === "tap_mistake") && c.correctIndex != null ? selectedChoice === c.correctIndex
    : false;

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
                  selectedChoice === i
                    ? (c.correctChoiceIndex != null && c.choiceExplanations?.length ? (i === c.correctChoiceIndex ? "border-emerald-500 bg-emerald-500/10" : "border-red-500/60 bg-red-500/10")
                    : "border-amber-500 bg-amber-500/10")
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                {opt}
                {showChoiceFeedback && selectedChoice === i && c.choiceExplanations?.[i] && (
                  <p className={`mt-2 text-xs ${i === c.correctChoiceIndex ? "text-emerald-300" : "text-red-300"}`}>{c.choiceExplanations[i]}</p>
                )}
              </button>
            ))}
          </div>
        )}
        {(section.type === "choose_better" || section.type === "fix_sentence") && c.options && (
          <div className="space-y-2 mt-4">
            {section.type === "fix_sentence" && c.wrongSentence && (
              <p className="text-slate-400 text-sm mb-2">&quot;{c.wrongSentence}&quot;</p>
            )}
            {c.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectChoice(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedChoice === i
                    ? (c.correctIndex != null ? (i === c.correctIndex ? "border-emerald-500 bg-emerald-500/10" : "border-red-500/60 bg-red-500/10") : "border-amber-500 bg-amber-500/10")
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                {opt}
                {showChoiceFeedback && selectedChoice === i && (
                  <p className={`mt-2 text-xs ${i === c.correctIndex ? "text-emerald-300" : "text-red-300"}`}>
                    {i === c.correctIndex ? (c.rightExplanation ?? "") : (c.wrongExplanation ?? "")}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
        {section.type === "tap_mistake" && c.options && (
          <div className="space-y-2 mt-4">
            {c.paragraph && <p className="text-slate-300 text-sm mb-2">{c.paragraph}</p>}
            <p className="text-xs text-slate-400 mb-2">{locale === "vi" ? "Chạm vào cụm từ sai:" : "Tap the wrong phrase:"}</p>
            {c.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectChoice(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedChoice === i
                    ? (c.correctIndex != null ? (i === c.correctIndex ? "border-emerald-500 bg-emerald-500/10" : "border-red-500/60 bg-red-500/10") : "border-amber-500 bg-amber-500/10")
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                &quot;{opt}&quot;
                {showChoiceFeedback && selectedChoice === i && (
                  <p className={`mt-2 text-xs ${i === c.correctIndex ? "text-emerald-300" : "text-red-300"}`}>
                    {i === c.correctIndex ? (c.rightExplanation ?? c.tapMistakeExplanation ?? "") : (c.wrongExplanation ?? c.tapMistakeExplanation ?? "")}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
        {section.type === "reorder_steps" && shuffledSteps.length > 0 && (
          <div className="space-y-3 mt-4">
            {shuffledSteps.map((_, pos) => (
              <div key={pos} className="flex items-center gap-2">
                <span className="text-slate-400 font-medium w-8">{pos + 1}.</span>
                <select
                  value={reorderOrder[pos] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setReorderOrder((prev) => {
                      const next = [...prev];
                      const existing = next.indexOf(v as number);
                      if (existing >= 0) next[existing] = null;
                      next[pos] = v;
                      return next;
                    });
                  }}
                  className="flex-1 rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm"
                >
                  <option value="">{locale === "vi" ? "Chọn..." : "Select..."}</option>
                  {shuffledSteps.map((step, idx) => (
                    <option key={idx} value={idx} disabled={reorderOrder.includes(idx) && reorderOrder.indexOf(idx) !== pos}>
                      {step}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {reorderSubmitted && (
              <div className={`rounded-xl p-4 mt-4 ${reorderCorrect ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                <p className={`text-sm font-medium ${reorderCorrect ? "text-emerald-300" : "text-red-300"}`}>
                  {reorderCorrect ? (c.rightExplanation ?? (locale === "vi" ? "Đúng thứ tự." : "Correct order.")) : (c.wrongExplanation ?? (locale === "vi" ? "Sai thứ tự." : "Wrong order."))}
                </p>
                {!reorderCorrect && c.stepsOrder?.length && (
                  <p className="text-xs text-slate-300 mt-2">
                    {locale === "vi" ? "Thứ tự đúng:" : "Correct order:"} {c.stepsOrder.join(" → ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={section.type === "reorder_steps" ? handleReorderNext : onNext}
        disabled={
          section.type === "reorder_steps"
            ? (!reorderSubmitted && !isReorderComplete) || saving
            : !canProceed || saving
        }
        className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50"
      >
        {section.type === "reorder_steps" && !reorderSubmitted
          ? (locale === "vi" ? "Kiểm tra thứ tự" : "Check order")
          : (locale === "vi" ? "Tiếp" : "Next")}
      </button>
      {onBackToMap && (
        <button
          type="button"
          onClick={onBackToMap}
          className="block mx-auto text-sm text-slate-400 hover:text-white"
        >
          {locale === "vi" ? "← Về bản đồ" : "← Back to map"}
        </button>
      )}
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
  rankingOrder,
  onRankingChange,
  rankingRevealed,
  onRankingSubmit,
}: {
  question: QuizQuestion & { questionEn: string; questionVi: string; options: { en: string; vi: string }[]; correctIndex: number; id?: string; explanationsEn?: string[]; explanationsVi?: string[] };
  locale: Locale;
  index: number;
  total: number;
  selectedChoice: number | null;
  onSelect: (i: number) => void;
  onNext: () => void;
  canProceed: boolean;
  saving: boolean;
  rankingOrder?: number[] | null;
  onRankingChange?: (order: number[]) => void;
  rankingRevealed?: boolean;
  onRankingSubmit?: (correct: boolean) => void;
}) {
  const q = getQuizContent(question, locale) as ReturnType<typeof getQuizContent> & { quizType?: string; correctOrder?: number[] };
  const quizType = q.quizType ?? "multiple_choice";
  const rankOrder = (quizType === "ranking" && question.options?.length) ? (rankingOrder ?? question.options.map((_, i) => i)) : null;
  const isRanking = quizType === "ranking" && q.correctOrder && rankOrder;
  const correct = isRanking
    ? q.correctOrder!.length === rankOrder.length && q.correctOrder!.every((v, i) => v === rankOrder[i])
    : selectedChoice === question.correctIndex;
  const explanations: string[] = (q as { explanations?: string[] }).explanations ?? [];
  const chosenExplanation = selectedChoice != null ? explanations[selectedChoice] : undefined;
  const correctExplanation = explanations[question.correctIndex];
  const correctOptionText = q.options[question.correctIndex];

  const moveRank = (from: number, dir: 1 | -1) => {
    if (!onRankingChange || !rankOrder) return;
    const to = from + dir;
    if (to < 0 || to >= rankOrder.length) return;
    const next = [...rankOrder];
    const a = next[from];
    next[from] = next[to];
    next[to] = a;
    onRankingChange(next);
  };

  if (quizType === "ranking" && q.correctOrder && rankOrder) {
    return (
      <div className="space-y-6">
        <div className="text-xs text-slate-400">{index + 1} / {total} Quiz — {locale === "vi" ? "Sắp xếp thứ tự" : "Rank order"}</div>
        <div className="rounded-2xl bg-slate-800/80 border border-slate-600 p-6">
          <h2 className="text-lg font-bold mb-4">{q.question}</h2>
          <div className="space-y-2">
            {rankOrder.map((optIdx, position) => (
              <div key={`${position}-${optIdx}`} className="flex items-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3">
                <span className="text-slate-400 text-sm w-6">{position + 1}.</span>
                <span className="flex-1 text-slate-200">{q.options[optIdx]}</span>
                {!rankingRevealed && (
                  <>
                    <button type="button" onClick={() => moveRank(position, -1)} disabled={position === 0} className="text-slate-400 hover:text-white disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveRank(position, 1)} disabled={position === rankOrder.length - 1} className="text-slate-400 hover:text-white disabled:opacity-30">↓</button>
                  </>
                )}
              </div>
            ))}
          </div>
          {rankingRevealed && (
            <div className="mt-6 space-y-4 border-t border-slate-600 pt-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                {correct ? (locale === "vi" ? "Đúng thứ tự" : "Correct order") : (locale === "vi" ? "Thứ tự đúng" : "Right order")}
              </p>
              <div className={`rounded-xl p-4 text-sm ${correct ? "bg-emerald-500/10 border border-emerald-500/30 text-slate-200" : "bg-amber-500/10 border border-amber-500/30 text-slate-200"}`}>
                {correct ? (
                  <p>{locale === "vi" ? "Bạn sắp xếp đúng. Thứ tự này tạo ấn tượng tốt và hỗ trợ thành viên đúng cách." : "You got the order right. This sequence creates the right impression and supports the member."}</p>
                ) : (
                  <>
                    <p className="mb-2">{locale === "vi" ? "Thứ tự đúng là:" : "The correct order is:"}</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {q.correctOrder!.map((idx) => (
                        <li key={idx}>{q.options[idx]}</li>
                      ))}
                    </ol>
                    {explanations[0] && <p className="mt-2 text-slate-300 whitespace-pre-wrap">{explanations[0]}</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {!rankingRevealed ? (
          <button type="button" onClick={() => onRankingSubmit?.(correct)} disabled={saving} className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50">
            {locale === "vi" ? "Kiểm tra thứ tự" : "Check order"}
          </button>
        ) : (
          <button type="button" onClick={onNext} disabled={saving} className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 disabled:opacity-50">
            {index < total - 1 ? (locale === "vi" ? "Tiếp" : "Next") : (locale === "vi" ? "Xem kết quả" : "See results")}
          </button>
        )}
      </div>
    );
  }

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
