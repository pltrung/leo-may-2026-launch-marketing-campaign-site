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
  type LessonSection,
  HEARTS_MAX,
} from "@/lib/onboardingContent";
import type { Locale } from "@/lib/i18n";

type Phase = "map" | "lesson" | "scenario" | "quiz" | "reflection";

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
    day_completion: Record<number, { completed: boolean; lesson_index: number; current_step?: number }>;
  } | null>(null);
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("map");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [scenarioResponse, setScenarioResponse] = useState("");
  const [scenarioResult, setScenarioResult] = useState<{ score: number; feedback: string; improved_answer: string } | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [saving, setSaving] = useState(false);

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
          day_completion: d.day_completion ?? {},
        });
      })
      .catch(() => {});
  }, [adminFetch]);

  useEffect(() => {
    if (hasAccess) fetchProgress();
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

  const isDayUnlocked = (day: number) => {
    if (!progress) return day === 1;
    if (day === 1) return true;
    return !!progress.day_completion[day - 1]?.completed;
  };

  const handleStartDay = (day: number) => {
    if (!isDayUnlocked(day)) return;
    const dayContent = getDayContent(day);
    if (!dayContent) return;
    setCurrentDay(day);
    setSelectedChoice(null);
    const completed = progress?.day_completion[day]?.completed ?? false;
    const savedStep = progress?.day_completion[day]?.current_step ?? 0;
    if (completed) {
      setPhase("lesson");
      setLessonIndex(0);
      setScenarioIndex(0);
      setQuizIndex(0);
      return;
    }
    const { phase, lessonIndex, scenarioIndex, quizIndex } = stepToPhase(savedStep, dayContent);
    setPhase(phase);
    setLessonIndex(lessonIndex);
    setScenarioIndex(scenarioIndex);
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
        }),
      });
      const d = await res.json();
      setScenarioResult({ score: d.score, feedback: d.feedback, improved_answer: d.improved_answer ?? "" });
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
    } else {
      const nextStep = content.sections.length + content.scenarios.length;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setPhase("quiz");
      setQuizIndex(0);
      setQuizCorrect(0);
    }
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
    if (quizIndex < content.quiz.length - 1) {
      const nextStep = content.sections.length + content.scenarios.length + quizIndex + 1;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      setQuizIndex(quizIndex + 1);
    } else {
      const nextStep = content.sections.length + content.scenarios.length + content.quiz.length;
      updateProgress("save_step", { day: currentDay, current_step: nextStep });
      const perfect = quizCorrect === content.quiz.length;
      updateProgress("quiz", { day: currentDay, quiz_perfect: perfect });
      setPhase("reflection");
    }
  };

  const handleReflectionSubmit = () => {
    updateProgress("day_complete", { day: currentDay });
    setCurrentDay(null);
    setPhase("map");
    setReflectionText("");
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
          <div className="flex items-center gap-3">
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
                const dc = getDayContent(day);
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
                    <span className="text-2xl font-bold">{day}</span>
                    <span className="text-[10px] mt-1 opacity-80">
                      {dc ? (locale === "vi" ? dc.titleVi : dc.titleEn) : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-slate-800/60 border border-slate-600 p-4 text-center text-slate-300 text-sm">
              {locale === "vi"
                ? "Mỗi ngày ~20–30 phút. XP: +10 mỗi bài, +50 hoàn thành ngày, +100 điểm quiz hoàn hảo."
                : "~20–30 min/day. XP: +10 per lesson, +50 day complete, +100 perfect quiz."}
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
  result: { score: number; feedback: string; improved_answer: string } | null;
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
  question: { questionEn: string; questionVi: string; options: { en: string; vi: string }[]; correctIndex: number; id?: string };
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
