/**
 * Onboarding content: 7-day training for staff/frontdesk at Leo Mây
 * Days 1–5: culture, safety, ownership, sales, teamwork. Day 6: Newbie experience mastery. Day 7: Final certification.
 * "Climb the Clouds, Build a Culture"
 */

import type { Locale } from "./i18n";

export type OnboardingRole = "staff" | "frontdesk" | "admin";

export interface LessonSection {
  id: string;
  titleEn: string;
  titleVi: string;
  contentEn: string;
  contentVi: string;
  type: "text" | "choice" | "goodvsbad" | "list" | "choose_better" | "fix_sentence" | "reorder_steps" | "tap_mistake";
  choices?: { en: string; vi: string }[];
  /** For type "choice": which index is correct (so we can show wrong-answer feedback). */
  correctChoiceIndex?: number;
  /** Per-option explanation (why wrong / why right, impact, example). Same length as choices. */
  choiceExplanationsEn?: string[];
  choiceExplanationsVi?: string[];
  good?: { en: string; vi: string };
  bad?: { en: string; vi: string };
  items?: { en: string; vi: string }[];
  /** choose_better: two options [wrong, right] or [right, wrong], correctIndex 0 or 1 */
  options?: { en: string; vi: string }[];
  correctIndex?: number;
  /** Why the wrong option is wrong, impact, correct behavior, example. */
  wrongExplanationEn?: string;
  wrongExplanationVi?: string;
  rightExplanationEn?: string;
  rightExplanationVi?: string;
  /** fix_sentence: the wrong sentence to fix */
  wrongSentenceEn?: string;
  wrongSentenceVi?: string;
  /** reorder_steps: steps in correct order (we shuffle for display) */
  stepsOrderEn?: string[];
  stepsOrderVi?: string[];
  /** tap_mistake: paragraph containing the wrong phrase */
  paragraphEn?: string;
  paragraphVi?: string;
  /** The phrase that is wrong (user taps to identify) */
  wrongPhraseEn?: string;
  wrongPhraseVi?: string;
  /** Why it's wrong, impact, correct phrasing */
  tapMistakeExplanationEn?: string;
  tapMistakeExplanationVi?: string;
}

export interface AIScenario {
  id: string;
  titleEn: string;
  titleVi: string;
  promptEn: string;
  promptVi: string;
  hintEn: string;
  hintVi: string;
  /** Detailed ideal response for 100 points. Teaches Leo Mây values. */
  perfectAnswerEn: string;
  perfectAnswerVi: string;
  /** Criteria for 100 — what we look for. Used in "why not 100" feedback. */
  rubricEn?: string[];
  rubricVi?: string[];
  goodKeywords?: string[];
  badKeywords?: string[];
}

export type QuizType = "multiple_choice" | "ranking" | "rewrite" | "scenario_judgment";

export interface QuizQuestion {
  id: string;
  questionEn: string;
  questionVi: string;
  options: { en: string; vi: string }[];
  correctIndex: number;
  /** Per-option explanation: why this option is right or wrong. Same length as options. */
  explanationsEn: string[];
  explanationsVi: string[];
  /** Varied quiz types for training simulator feel. Default multiple_choice. */
  quizType?: QuizType;
  /** For ranking: correct order of option indices (e.g. [2,0,1,3] = 3rd option first). */
  correctOrder?: number[];
}

export interface Reflection {
  id: string;
  promptEn: string;
  promptVi: string;
}

/** Base fields for every simulation step. */
export interface SimulationStepBase {
  id: string;
  sceneEn: string;
  sceneVi: string;
  characters: { id: string; labelEn: string; labelVi: string; state?: string }[];
  promptEn: string;
  promptVi: string;
}

/** Decision step: multiple choice; wrong choice shows why wrong, impact, correct behavior. */
export interface SimulationStepDecision extends SimulationStepBase {
  type: "decision";
  correctChoiceId: string;
  options: { id: string; textEn: string; textVi: string }[];
  wrongFeedbackEn: Record<string, string>;
  wrongFeedbackVi: Record<string, string>;
  correctFeedbackEn: string;
  correctFeedbackVi: string;
  /** Day 7 certification: option ids that cause critical_fail if chosen (e.g. skip safety, skip onboarding). */
  criticalWrongIds?: string[];
}

/** AI response step: free text evaluated like a scenario. */
export interface SimulationStepAI extends SimulationStepBase {
  type: "ai_response";
  hintEn: string;
  hintVi: string;
  perfectAnswerEn: string;
  perfectAnswerVi: string;
  goodKeywords?: string[];
  badKeywords?: string[];
  rubricEn?: string[];
  rubricVi?: string[];
}

export type SimulationStep = SimulationStepDecision | SimulationStepAI;

export function isSimulationStepDecision(s: SimulationStep): s is SimulationStepDecision {
  return s.type === "decision";
}

/** Good performance result screen (e.g. "Peak Hour Completed"). */
export interface SimulationResultGood {
  titleEn: string;
  titleVi: string;
  strengthsEn: string[];
  strengthsVi: string[];
  xpReward: number;
  skillDeltas: { communication?: number; safety?: number; sales?: number; teamwork?: number };
}

/** Poor performance result screen (e.g. "Needs Improvement"). */
export interface SimulationResultPoor {
  titleEn: string;
  titleVi: string;
  keyIssuesEn: string[];
  keyIssuesVi: string[];
  focusEn: string[];
  focusVi: string[];
}

export interface DaySimulation {
  id: string;
  titleEn: string;
  titleVi: string;
  steps: SimulationStep[];
  resultGood: SimulationResultGood;
  resultPoor: SimulationResultPoor;
}

export interface DayContent {
  day: number;
  titleEn: string;
  titleVi: string;
  roleFilter?: OnboardingRole[];
  /** End-of-day memory hook. */
  keyTakeawayEn: string;
  keyTakeawayVi: string;
  sections: LessonSection[];
  scenarios: AIScenario[];
  simulation?: DaySimulation;
  quiz: QuizQuestion[];
  reflection: Reflection;
  /** Unlockable after day complete: harder AI scenarios. */
  hardModeScenarios?: AIScenario[];
  /** Unlockable after day complete: extra lessons. */
  advancedLessons?: LessonSection[];
  /** Day 7 only: 10 fast MCQs, no explanations until end. */
  rapidDecisions?: QuizQuestion[];
  /** Day 7 only: intro copy (serious tone). */
  certificationIntroEn?: string;
  certificationIntroVi?: string;
}

function t(content: { en: string; vi: string }, locale: Locale) {
  return locale === "vi" ? content.vi : content.en;
}

export function getLessonContent(s: LessonSection, locale: Locale) {
  return {
    title: t({ en: s.titleEn, vi: s.titleVi }, locale),
    content: t({ en: s.contentEn, vi: s.contentVi }, locale),
    good: s.good ? t(s.good, locale) : undefined,
    bad: s.bad ? t(s.bad, locale) : undefined,
    choices: s.choices?.map((c) => t(c, locale)),
    items: s.items?.map((i) => t(i, locale)),
    correctChoiceIndex: s.correctChoiceIndex,
    choiceExplanations: locale === "vi" ? (s.choiceExplanationsVi ?? []) : (s.choiceExplanationsEn ?? []),
    options: s.options?.map((o) => t(o, locale)),
    correctIndex: s.correctIndex,
    wrongExplanation: s.wrongExplanationEn != null && s.wrongExplanationVi != null ? (locale === "vi" ? s.wrongExplanationVi : s.wrongExplanationEn) : undefined,
    rightExplanation: s.rightExplanationEn != null && s.rightExplanationVi != null ? (locale === "vi" ? s.rightExplanationVi : s.rightExplanationEn) : undefined,
    wrongSentence: s.wrongSentenceEn != null && s.wrongSentenceVi != null ? (locale === "vi" ? s.wrongSentenceVi : s.wrongSentenceEn) : undefined,
    stepsOrder: locale === "vi" ? (s.stepsOrderVi ?? []) : (s.stepsOrderEn ?? []),
    paragraph: s.paragraphEn != null && s.paragraphVi != null ? (locale === "vi" ? s.paragraphVi : s.paragraphEn) : undefined,
    wrongPhrase: s.wrongPhraseEn != null && s.wrongPhraseVi != null ? (locale === "vi" ? s.wrongPhraseVi : s.wrongPhraseEn) : undefined,
    tapMistakeExplanation: s.tapMistakeExplanationEn != null && s.tapMistakeExplanationVi != null ? (locale === "vi" ? s.tapMistakeExplanationVi : s.tapMistakeExplanationEn) : undefined,
  };
}

export function getScenarioContent(s: AIScenario, locale: Locale) {
  return {
    title: t({ en: s.titleEn, vi: s.titleVi }, locale),
    prompt: t({ en: s.promptEn, vi: s.promptVi }, locale),
    hint: t({ en: s.hintEn, vi: s.hintVi }, locale),
  };
}

export function getQuizContent(
  q: Pick<QuizQuestion, "questionEn" | "questionVi" | "options" | "quizType" | "correctOrder"> & { explanationsEn?: string[]; explanationsVi?: string[] },
  locale: Locale
) {
  return {
    question: t({ en: q.questionEn, vi: q.questionVi }, locale),
    options: q.options.map((o) => t(o, locale)),
    explanations: locale === "vi" ? (q.explanationsVi ?? []) : (q.explanationsEn ?? []),
    quizType: q.quizType ?? "multiple_choice",
    correctOrder: q.correctOrder,
  };
}

// XP constants
export const XP_LESSON = 10;
export const XP_DAY_COMPLETE = 50;
export const XP_PERFECT_QUIZ = 100;
export const XP_PERFECT_DAY_BONUS = 100;
/** XP awarded when Day 7 certification is passed. */
export const XP_CERTIFICATION_PASS = 100;
export const HEARTS_MAX = 5;
export const HEARTS_LOST_PER_MISTAKE = 1;

/** 24 hours in ms for day unlock. */
export const DAY_UNLOCK_HOURS_MS = 24 * 60 * 60 * 1000;

/** Primary skill updated by day (for skill score deltas from quiz/scenarios/simulation). */
export const PRIMARY_SKILL_BY_DAY: Record<number, "communication" | "safety" | "sales" | "teamwork"> = {
  1: "communication",
  2: "safety",
  3: "teamwork",
  4: "sales",
  5: "teamwork",
  6: "communication",
  7: "communication",
};

export const BADGES = {
  leo_may_certified: { en: "Leo Mây Certified", vi: "Chứng nhận Leo Mây" },
  front_desk_pro: { en: "Front Desk Pro", vi: "Chuyên gia quầy lễ tân" },
  route_master: { en: "Route Master", vi: "Bậc thầy tường" },
} as const;

// ========== DAY 1 — THE LEO MÂY WAY (CULTURE) ==========
export const DAY1: DayContent = {
  day: 1,
  titleEn: "The Leo Mây Way",
  titleVi: "Cách Leo Mây",
  keyTakeawayEn: "Community over ego",
  keyTakeawayVi: "Cộng đồng hơn cái tôi",
  sections: [
    {
      id: "d1s0_hook",
      type: "choice",
      titleEn: "Opening — What do you notice?",
      titleVi: "Mở đầu — Bạn chú ý gì?",
      contentEn: "A member just walked in. Before you do anything — what do you notice first?",
      contentVi: "Một thành viên vừa bước vào. Trước khi làm gì — bạn chú ý điều gì trước?",
      correctChoiceIndex: 2,
      choices: [
        { en: "Their bag or gear", vi: "Túi hoặc đồ của họ" },
        { en: "How busy the gym is", vi: "Phòng gym đông hay vắng" },
        { en: "Their body language and energy", vi: "Ngôn ngữ cơ thể và năng lượng của họ" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Focusing on gear first can make the member feel like an object. Impact: They may not feel seen as a person. Correct: Notice the person — their energy tells you if they're nervous, confident, or lost. Then you can respond in the right way.",
        "Why wrong: The gym's busyness is about you, not them. Impact: The member may feel invisible. Correct: Put the member first. Read their body language so you can greet them in a way that matches their state (nervous vs. confident).",
        "Correct. Their body language and energy tell you how to respond. Nervous? Warm and reassuring. Confident? Efficient and friendly. Lost? Guide them. Reading the person first is the foundation of the Leo Mây way.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Chú ý đồ trước khiến thành viên cảm thấy như đồ vật. Tác động: Họ có thể không cảm thấy được thấy như một con người. Đúng: Chú ý con người — năng lượng cho biết họ lo lắng, tự tin hay lạc lối. Rồi bạn mới phản hồi đúng cách.",
        "Sai vì: Sự đông đúc của phòng là về bạn, không phải họ. Tác động: Thành viên có thể cảm thấy vô hình. Đúng: Đặt thành viên lên trước. Đọc ngôn ngữ cơ thể để chào theo đúng trạng thái (lo vs tự tin).",
        "Đúng. Ngôn ngữ cơ thể và năng lượng cho biết cách phản hồi. Lo? Ấm áp và trấn an. Tự tin? Hiệu quả và thân thiện. Lạc? Hướng dẫn. Đọc người trước là nền tảng cách Leo Mây.",
      ],
    },
    {
      id: "d1s1",
      type: "choice",
      titleEn: "First Impression",
      titleVi: "Ấn tượng đầu tiên",
      contentEn: "A member walks into the gym. What do you do in the first 5 seconds?",
      contentVi: "Một thành viên bước vào phòng gym. Bạn làm gì trong 5 giây đầu tiên?",
      correctChoiceIndex: 1,
      choices: [
        { en: "Wave and say hi", vi: "Vẫy tay và chào" },
        { en: "Make eye contact, smile, walk toward them", vi: "Giao tiếp bằng mắt, mỉm cười, bước về phía họ" },
        { en: "Wait for them to come to you", vi: "Chờ họ đến" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Waving from a distance still feels distant. Impact: The member may not feel truly welcomed or know where to go. Correct: Move toward them with eye contact and a smile. Example: Make eye contact, smile, and walk toward them — \"Hi! First time or coming back?\"",
        "Correct. This creates the warm, present first impression we want. The member feels seen and welcomed.",
        "Why wrong: Waiting for them to approach can make them feel unwelcome or unsure. Impact: They may feel like they're interrupting or not know the next step. Correct: You go to them first. Example: Step out from behind the counter, make eye contact, smile, and say \"Hey, welcome! Need a hand?\"",
      ],
      choiceExplanationsVi: [
        "Sai vì: Vẫy từ xa vẫn tạo cảm giác xa cách. Tác động: Thành viên có thể không cảm thấy được chào đón thực sự. Đúng: Bước về phía họ với giao tiếp mắt và nụ cười. Ví dụ: Giao tiếp mắt, mỉm cười, bước lại — \"Chào! Lần đầu hay quay lại?\"",
        "Đúng. Cách này tạo ấn tượng đầu ấm áp, có mặt mà chúng ta muốn.",
        "Sai vì: Chờ họ đến có thể khiến họ cảm thấy không được chào hoặc không rõ bước tiếp. Tác động: Họ có thể cảm thấy đang làm phiền. Đúng: Bạn đến với họ trước. Ví dụ: Bước ra khỏi quầy, giao tiếp mắt, cười và nói \"Chào bạn! Cần tôi giúp gì?\"",
      ],
    },
    {
      id: "d1s2",
      type: "text",
      titleEn: "What is Leo Mây",
      titleVi: "Leo Mây là gì",
      contentEn: "Leo Mây is not just a gym. It is a space for growth.",
      contentVi: "Leo Mây không chỉ là phòng tập. Đây là nơi phát triển bản thân.",
    },
    {
      id: "d1s3",
      type: "text",
      titleEn: "Core Philosophy",
      titleVi: "Triết lý cốt lõi",
      contentEn: "Community over ego.",
      contentVi: "Cộng đồng hơn cái tôi.",
    },
    {
      id: "d1s4",
      type: "list",
      titleEn: "Energy Training",
      titleVi: "Luyện năng lượng",
      contentEn: "Three things to practice:",
      contentVi: "Ba điều cần luyện:",
      items: [
        { en: "Eye contact", vi: "Giao tiếp bằng mắt" },
        { en: "Smile", vi: "Mỉm cười" },
        { en: "Walk toward the member", vi: "Bước về phía thành viên" },
      ],
    },
    {
      id: "d1s5",
      type: "goodvsbad",
      titleEn: "Good vs Bad",
      titleVi: "Tốt và chưa tốt",
      contentEn: "Compare these approaches:",
      contentVi: "So sánh cách tiếp cận:",
      bad: { en: '"Go sign there"', vi: '"Đi ký kia đi"' },
      good: { en: '"Hey! First time? I got you 👌"', vi: '"Chào! Lần đầu à? Để tôi giúp nhé 👌"' },
    },
    {
      id: "d1s6",
      type: "list",
      titleEn: "Member Types",
      titleVi: "Các dạng thành viên",
      contentEn: "You will meet:",
      contentVi: "Bạn sẽ gặp:",
      items: [
        { en: "Nervous — needs reassurance", vi: "Lo lắng — cần động viên" },
        { en: "Confident — appreciates efficiency", vi: "Tự tin — đánh giá cao sự hiệu quả" },
        { en: "Lost — needs guidance", vi: "Bối rối — cần hướng dẫn" },
      ],
    },
    {
      id: "d1s7",
      type: "choose_better",
      titleEn: "Choose the better response",
      titleVi: "Chọn phản hồi tốt hơn",
      contentEn: "A member asks where to sign the waiver. Which response is better?",
      contentVi: "Thành viên hỏi ký waiver ở đâu. Phản hồi nào tốt hơn?",
      options: [
        { en: "\"Go sign there.\"", vi: "\"Đi ký kia đi.\"" },
        { en: "\"Hey! First time? I'll show you — it's right here. Want me to walk you through it?\"", vi: "\"Chào! Lần đầu à? Tôi chỉ cho bạn — ngay đây. Bạn muốn tôi hướng dẫn từng bước không?\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: Pointing without engagement feels cold. Impact: Member may feel like a number. Correct: Acknowledge them, show the way, offer to help. Example: \"I'll show you — it's right here. Need anything else?\"",
      wrongExplanationVi: "Sai vì: Chỉ tay mà không kết nối cảm giác lạnh. Tác động: Thành viên có thể cảm thấy như con số. Đúng: Chú ý họ, chỉ đường, đề nghị giúp. Ví dụ: \"Tôi chỉ cho bạn — ngay đây. Cần gì nữa không?\"",
      rightExplanationEn: "Correct. This is warm, personal, and helpful. It turns a transaction into a welcome.",
      rightExplanationVi: "Đúng. Cách này ấm áp, cá nhân và hữu ích. Biến giao dịch thành lời chào.",
    },
    {
      id: "d1s8",
      type: "fix_sentence",
      titleEn: "Fix the sentence",
      titleVi: "Sửa câu",
      contentEn: "A staff member said this to a nervous first-timer. Which fix is best?",
      contentVi: "Nhân viên nói thế này với người mới lo lắng. Sửa nào đúng nhất?",
      wrongSentenceEn: "\"Just go over there and read the form.\"",
      wrongSentenceVi: "\"Cứ đi kia đọc form đi.\"",
      options: [
        { en: "\"The form is over there.\"", vi: "\"Form ở kia.\"" },
        { en: "\"I'll show you — the waiver's right here. I can walk you through it if you like.\"", vi: "\"Tôi chỉ cho bạn — waiver ngay đây. Tôi có thể hướng dẫn từng bước nếu bạn muốn.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: Still distant; no offer to help. Impact: Nervous member may feel dismissed. Correct: Show and offer to walk through. Example: \"I'll show you — I can walk you through it if you like.\"",
      wrongExplanationVi: "Sai vì: Vẫn xa cách; không đề nghị giúp. Tác động: Thành viên lo có thể cảm thấy bị phớt lờ. Đúng: Chỉ và đề nghị hướng dẫn. Ví dụ: \"Tôi chỉ cho bạn — tôi có thể hướng dẫn từng bước nếu bạn muốn.\"",
      rightExplanationEn: "Correct. You show the way and offer support. The member feels guided, not pointed at.",
      rightExplanationVi: "Đúng. Bạn chỉ đường và đề nghị hỗ trợ. Thành viên cảm thấy được hướng dẫn, không bị chỉ tay.",
    },
    {
      id: "d1s_emotion",
      type: "choice",
      titleEn: "Emotion recognition",
      titleVi: "Nhận biết cảm xúc",
      contentEn: "A member is fidgeting, avoiding eye contact, and standing near the door. What are they most likely feeling?",
      contentVi: "Một thành viên bồn chồn, tránh ánh mắt, đứng gần cửa. Họ có khả năng đang cảm thấy gì?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Nervous or unsure", vi: "Lo lắng hoặc không chắc chắn" },
        { en: "Confident and in a hurry", vi: "Tự tin và đang vội" },
        { en: "Annoyed or impatient", vi: "Bực bội hoặc thiếu kiên nhẫn" },
      ],
      choiceExplanationsEn: [
        "Correct. Fidgeting and avoiding eye contact often signal nervousness or not knowing what to do. Impact: If you treat them as confident or rush them, they may feel more anxious. Correct behavior: warm, slow, reassuring — 'Hey, first time? I'm here to help.'",
        "Why wrong: Confident members usually make eye contact and move with purpose. Impact: If you're too quick or brief with someone who's actually nervous, they feel dismissed. Read the cues: fidgeting = need for reassurance.",
        "Why wrong: Annoyed people often show tension or crossed arms, not fidgeting. Impact: Treating a nervous member as annoyed can make them feel judged. Correct: assume they need support until they show otherwise.",
      ],
      choiceExplanationsVi: [
        "Đúng. Bồn chồn và tránh ánh mắt thường báo hiệu lo lắng hoặc không biết làm gì. Tác động: Nếu bạn đối xử như người tự tin hoặc vội, họ có thể thêm lo. Cách đúng: ấm áp, chậm rãi, trấn an — 'Chào, lần đầu à? Tôi ở đây để giúp.'",
        "Sai vì: Thành viên tự tin thường giao tiếp mắt và di chuyển có mục đích. Tác động: Nếu bạn quá nhanh với người đang lo, họ cảm thấy bị phớt lờ. Đọc tín hiệu: bồn chồn = cần động viên.",
        "Sai vì: Người bực thường thể hiện căng thẳng hoặc khoanh tay, không bồn chồn. Tác động: Coi thành viên lo là bực có thể khiến họ cảm thấy bị phán xét. Đúng: giả định họ cần hỗ trợ cho đến khi họ cho thấy khác.",
      ],
    },
    {
      id: "d1s_micro1",
      type: "choice",
      titleEn: "Micro challenge — Quick decision",
      titleVi: "Thử thách — Quyết định nhanh",
      contentEn: "Someone is at the counter. Someone else just walked in the door. Who do you acknowledge first?",
      contentVi: "Một người đang ở quầy. Một người khác vừa bước vào cửa. Bạn chào ai trước?",
      correctChoiceIndex: 0,
      choices: [
        { en: "The person at the counter — they were there first", vi: "Người ở quầy — họ đến trước" },
        { en: "The person at the door — so they don't leave", vi: "Người ở cửa — để họ không bỏ đi" },
        { en: "Whoever looks more impatient", vi: "Ai trông thiếu kiên nhẫn hơn" },
      ],
      choiceExplanationsEn: [
        "Correct. Acknowledge who was there first. Impact: If you skip the person at the counter, they feel invisible and disrespected. Quick rule: first come, first seen. You can say to the door: 'One sec!' so they feel acknowledged too.",
        "Why wrong: The person at the door hasn't waited yet. The person at the counter has. Impact: Skipping the counter person breaks trust and makes the gym feel chaotic. Correct: serve in order; briefly acknowledge the new arrival.",
        "Why wrong: 'Who looks more impatient' rewards pushy behavior and punishes patience. Impact: Members learn that being loud or impatient gets service — bad culture. Correct: order of arrival, then need (e.g. safety first).",
      ],
      choiceExplanationsVi: [
        "Đúng. Chào người đến trước. Tác động: Nếu bỏ qua người ở quầy, họ cảm thấy vô hình và không được tôn trọng. Quy tắc nhanh: ai đến trước, được chào trước. Bạn có thể nói với người ở cửa: 'Chờ chút nhé!'",
        "Sai vì: Người ở cửa chưa chờ. Người ở quầy đã chờ. Tác động: Bỏ qua người ở quầy làm mất niềm tin và cảm giác hỗn loạn. Đúng: phục vụ theo thứ tự; chào người mới đến ngắn gọn.",
        "Sai vì: 'Ai trông thiếu kiên nhẫn hơn' thưởng hành vi chen lấn và phạt sự kiên nhẫn. Tác động: Thành viên học rằng ồn ào hoặc thiếu kiên nhẫn mới được phục vụ — văn hóa xấu. Đúng: thứ tự đến, rồi nhu cầu (vd an toàn trước).",
      ],
    },
    {
      id: "d1s_micro2",
      type: "tap_mistake",
      titleEn: "Micro challenge — Mistake spotting",
      titleVi: "Thử thách — Tìm lỗi",
      contentEn: "Which phrase should you never say? Tap it.",
      contentVi: "Cụm nào bạn không bao giờ nên nói? Chạm vào đó.",
      paragraphEn: "Welcome to the gym. Just go over there and sign the form. Then you can climb. If you have questions, ask someone.",
      paragraphVi: "Chào mừng đến phòng gym. Cứ đi kia ký form. Rồi bạn có thể leo. Nếu có câu hỏi thì hỏi ai đó.",
      wrongPhraseEn: "Just go over there and sign the form",
      wrongPhraseVi: "Cứ đi kia ký form",
      options: [
        { en: "Just go over there and sign the form", vi: "Cứ đi kia ký form" },
        { en: "Welcome to the gym", vi: "Chào mừng đến phòng gym" },
      ],
      correctIndex: 0,
      rightExplanationEn: "Correct. You identified the phrase we never use. 'Just go over there' is dismissive and points instead of guides. We show and guide — 'I'll show you — the waiver's right here. Want me to walk you through it?'",
      rightExplanationVi: "Đúng. Bạn đã chỉ ra cụm chúng ta không dùng. 'Cứ đi kia' là từ chối và chỉ tay. Chúng ta chỉ và hướng dẫn — 'Tôi chỉ cho bạn — form ngay đây. Bạn muốn tôi hướng dẫn từng bước không?'",
      wrongExplanationEn: "That phrase is fine. The mistake is \"Just go over there and sign the form\" — we never point and dismiss. Tap the other phrase to identify the one you should never say.",
      wrongExplanationVi: "Cụm đó ổn. Lỗi là \"Cứ đi kia ký form\" — chúng ta không chỉ tay và từ chối. Chạm vào cụm kia để chỉ ra cụm không nên nói.",
      tapMistakeExplanationEn: "Why wrong: 'Just go over there' is dismissive and points instead of guides. Impact: Member feels like a number, not a person. Correct: 'I'll show you — the waiver's right here. Want me to walk you through it?'",
      tapMistakeExplanationVi: "Sai vì: 'Cứ đi kia' là từ chối và chỉ tay thay vì hướng dẫn. Tác động: Thành viên cảm thấy như con số. Đúng: 'Tôi chỉ cho bạn — form ngay đây. Bạn muốn tôi hướng dẫn từng bước không?'",
    },
  ],
  scenarios: [
    {
      id: "nervous_beginner",
      titleEn: "Nervous Beginner",
      titleVi: "Người mới lo lắng",
      promptEn: "A nervous first-timer says: 'I've never climbed before. I'm scared.' How do you respond?",
      promptVi: "Người mới lần đầu nói: 'Tôi chưa leo bao giờ. Tôi sợ lắm.' Bạn trả lời thế nào?",
      hintEn: "Show warmth and confidence. Normalize fear.",
      hintVi: "Thể hiện sự ấm áp và tự tin. Cho họ biết sợ là bình thường.",
      perfectAnswerEn: "Hey, welcome! First time is totally normal to feel nervous — lots of people feel that way. Climbing is new for everyone at some point. I'm here to help: we'll start with an easy route and I'll walk you through it. It's going to be fun, I promise. Ready when you are!",
      perfectAnswerVi: "Chào bạn! Lần đầu ai cũng hơi lo — điều đó hoàn toàn bình thường. Leo cũng mới với mọi người lúc ban đầu thôi. Tôi ở đây để giúp: chúng ta bắt đầu với đường dễ và tôi hướng dẫn từng bước. Sẽ vui lắm. Sẵn sàng thì bắt đầu nhé!",
      rubricEn: ["Welcome them warmly", "Normalize fear (everyone feels it)", "Offer to help", "Reassure without dismissing"],
      rubricVi: ["Chào đón ấm áp", "Chuẩn hóa nỗi sợ (ai cũng vậy)", "Đề nghị giúp đỡ", "Động viên mà không phủ nhận"],
      goodKeywords: ["welcome", "first", "help", "easy", "normal", "fun", "chào", "đầu", "giúp", "bình thường"],
      badKeywords: ["don't worry", "just", "easy", "it's nothing"],
    },
    {
      id: "confident_climber",
      titleEn: "Confident Climber",
      titleVi: "Người leo tự tin",
      promptEn: "A regular walks in, clearly in a hurry. How do you greet them?",
      promptVi: "Một người quen bước vào, rõ ràng đang vội. Bạn chào thế nào?",
      hintEn: "Be efficient but warm. No small talk overload.",
      hintVi: "Hiệu quả nhưng ấm áp. Không kéo dài chuyện phiếm.",
      perfectAnswerEn: "Hey! Ready to go? Great — you're all set.",
      perfectAnswerVi: "Chào! Sẵn sàng chưa? Nhanh nhé — bạn ổn rồi.",
      rubricEn: ["Quick acknowledgment", "Warm but brief", "No unnecessary small talk"],
      rubricVi: ["Chào nhanh", "Ấm áp nhưng gọn", "Không kéo dài chuyện phiếm"],
      goodKeywords: ["hi", "quick", "ready", "great", "chào", "nhanh"],
    },
    {
      id: "ignored_member",
      titleEn: "Ignored Member",
      titleVi: "Thành viên bị lơ",
      promptEn: "A member has been standing at the counter for 2 minutes while staff chatted. They look upset. What do you do?",
      promptVi: "Một thành viên đã đứng ở quầy 2 phút trong khi nhân viên nói chuyện. Họ trông khó chịu. Bạn làm gì?",
      hintEn: "Acknowledge them immediately. Apologize briefly.",
      hintVi: "Chú ý họ ngay. Xin lỗi ngắn gọn.",
      perfectAnswerEn: "Hi, sorry about the wait! You've been there a minute — how can I help you?",
      perfectAnswerVi: "Chào bạn, xin lỗi vì để chờ! Bạn đã đứng một lát — tôi có thể giúp gì cho bạn?",
      rubricEn: ["Acknowledge immediately", "Brief apology", "Focus on helping them now"],
      rubricVi: ["Chú ý ngay", "Xin lỗi ngắn gọn", "Tập trung giúp họ"],
      goodKeywords: ["sorry", "you", "help", "xin lỗi", "bạn", "giúp"],
    },
  ],
  simulation: {
    id: "day1_multi",
    titleEn: "Peak hour at the front desk",
    titleVi: "Giờ cao điểm ở quầy",
    steps: [
      {
        type: "decision",
        id: "step1",
        sceneEn: "Member A (nervous, first time) is at the counter. Member B (regular, in a hurry) just walked in. Your teammate is busy with a group.",
        sceneVi: "Thành viên A (lo lắng, lần đầu) đang ở quầy. Thành viên B (quen, đang vội) vừa bước vào. Đồng đội của bạn đang bận với một nhóm.",
        characters: [
          { id: "nervous", labelEn: "Member A (nervous)", labelVi: "Thành viên A (lo lắng)" },
          { id: "impatient", labelEn: "Member B (in a hurry)", labelVi: "Thành viên B (vội)" },
        ],
        promptEn: "Who do you respond to first?",
        promptVi: "Bạn phản hồi ai trước?",
        correctChoiceId: "nervous",
        options: [
          { id: "nervous", textEn: "Acknowledge Member A first — they were there first and are nervous", textVi: "Chú ý Thành viên A trước — họ đến trước và đang lo" },
          { id: "impatient", textEn: "Help Member B first — they're in a hurry", textVi: "Giúp Thành viên B trước — họ đang vội" },
        ],
        wrongFeedbackEn: {
          impatient: "Wrong. Member B is in a hurry, but Member A was there first and is nervous. If you skip A, they feel invisible and their anxiety grows. Impact: A may leave or never return. Correct behavior: acknowledge who was there first; say to B: 'One sec!' then focus on A.",
        },
        wrongFeedbackVi: {
          impatient: "Sai. Thành viên B đang vội nhưng Thành viên A đến trước và đang lo. Nếu bỏ qua A, họ cảm thấy vô hình và lo lắng tăng. Tác động: A có thể bỏ đi hoặc không quay lại. Cách đúng: chú ý người đến trước; nói với B: 'Chờ chút nhé!' rồi tập trung vào A.",
        },
        correctFeedbackEn: "Correct. Member A was there first and is nervous — they need to feel seen. Acknowledge B briefly then help A. Community over ego.",
        correctFeedbackVi: "Đúng. Thành viên A đến trước và đang lo — họ cần cảm thấy được chú ý. Chào B ngắn gọn rồi giúp A. Cộng đồng hơn cái tôi.",
      },
      {
        type: "ai_response",
        id: "step2",
        sceneEn: "You've turned to Member A. They're clearly nervous and say: 'I've never done this before. I'm scared I'll look stupid.'",
        sceneVi: "Bạn đã quay sang Thành viên A. Họ rõ ràng lo lắng và nói: 'Tôi chưa bao giờ làm điều này. Tôi sợ trông mình ngớ ngẩn.'",
        characters: [
          { id: "nervous", labelEn: "Member A", labelVi: "Thành viên A" },
        ],
        promptEn: "What do you say to them? (Type your response)",
        promptVi: "Bạn nói gì với họ? (Gõ phản hồi của bạn)",
        hintEn: "Normalize fear. Reassure. Offer to help. Warm tone.",
        hintVi: "Chuẩn hóa nỗi sợ. Động viên. Đề nghị giúp. Giọng ấm áp.",
        perfectAnswerEn: "Hey, no worries at all — lots of people feel that way their first time. You won't look stupid; we're here to help and everyone starts somewhere. I'll walk you through it. Ready when you are!",
        perfectAnswerVi: "Chào bạn, không sao — nhiều người lần đầu cũng vậy. Bạn sẽ không trông ngớ ngẩn đâu; chúng tôi ở đây để giúp và ai cũng bắt đầu từ đâu đó. Tôi sẽ hướng dẫn từng bước. Sẵn sàng thì bắt đầu nhé!",
        goodKeywords: ["help", "first", "worries", "normal", "giúp", "đầu", "bình thường"],
        badKeywords: ["stupid", "easy", "just", "ngớ ngẩn", "dễ mà"],
        rubricEn: ["Normalize fear", "Reassure", "Offer to help"],
        rubricVi: ["Chuẩn hóa nỗi sợ", "Động viên", "Đề nghị giúp"],
      },
      {
        type: "decision",
        id: "step3",
        sceneEn: "Member B (still waiting) calls out: 'I just need a quick check-in. Can you hurry?' Member A is filling the waiver. You're with A.",
        sceneVi: "Thành viên B (vẫn đang chờ) gọi: 'Tôi chỉ cần check-in nhanh thôi. Làm nhanh được không?' Thành viên A đang điền form. Bạn đang ở với A.",
        characters: [
          { id: "nervous", labelEn: "Member A (with you)", labelVi: "Thành viên A (đang với bạn)" },
          { id: "impatient", labelEn: "Member B (calling)", labelVi: "Thành viên B (đang gọi)" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "ack_both",
        options: [
          { id: "ack_both", textEn: "Acknowledge B: 'One sec!' — then stay with A until they're ready, then check in B", textVi: "Chào B: 'Chờ chút nhé!' — rồi ở với A đến khi họ xong, sau đó check-in B" },
          { id: "drop_a", textEn: "Leave A and go check in B to avoid conflict", textVi: "Bỏ A và đi check-in B để tránh xung đột" },
        ],
        wrongFeedbackEn: {
          drop_a: "Wrong. Leaving A mid-process makes them feel abandoned and increases anxiety. Impact: A may not complete sign-up; trust is broken. Correct behavior: acknowledge B briefly so they feel seen, but finish with A first — then serve B. Both members get clear communication.",
        },
        wrongFeedbackVi: {
          drop_a: "Sai. Bỏ A giữa chừng khiến họ cảm thấy bị bỏ rơi và lo lắng tăng. Tác động: A có thể không hoàn tất; niềm tin mất. Cách đúng: chào B ngắn gọn để họ thấy được chú ý, nhưng hoàn tất với A trước — rồi mới phục vụ B.",
        },
        correctFeedbackEn: "Correct. Acknowledge B so they don't feel ignored, but don't abandon A. Finish with A, then serve B. Clear communication and prioritization.",
        correctFeedbackVi: "Đúng. Chào B để họ không cảm thấy bị lờ, nhưng không bỏ A. Hoàn tất với A rồi phục vụ B. Giao tiếp và ưu tiên rõ ràng.",
      },
      {
        type: "decision",
        id: "step4",
        sceneEn: "A is done with the waiver. B is next. Your teammate is still busy. You have two people to help onto the wall. How do you coordinate?",
        sceneVi: "A đã xong form. B là người tiếp theo. Đồng đội vẫn bận. Bạn có hai người cần hướng dẫn lên tường. Bạn phối hợp thế nào?",
        characters: [
          { id: "teammate", labelEn: "Teammate (busy)", labelVi: "Đồng đội (bận)" },
        ],
        promptEn: "Best approach?",
        promptVi: "Cách làm tốt nhất?",
        correctChoiceId: "signal",
        options: [
          { id: "signal", textEn: "Signal teammate: 'Got two ready — can you take one?' Then brief both members so they know the plan", textVi: "Ra hiệu đồng đội: 'Hai người sẵn sàng — bạn nhận một nhé?' Rồi brief cả hai để họ biết kế hoạch" },
          { id: "solo", textEn: "Handle both yourself; don't bother teammate", textVi: "Tự xử cả hai; không làm phiền đồng đội" },
        ],
        wrongFeedbackEn: {
          solo: "Wrong. Trying to handle both alone can mean rushed service and safety risk. Impact: members may feel hurried or unsupervised. Correct behavior: quick team coordination — signal teammate, brief members so everyone knows who's helping whom. Team coordination keeps everyone safe and seen.",
        },
        wrongFeedbackVi: {
          solo: "Sai. Cố xử cả hai một mình có thể dẫn đến phục vụ vội và rủi ro an toàn. Tác động: thành viên có thể cảm thấy bị vội hoặc không được giám sát. Cách đúng: phối hợp nhanh với đồng đội — ra hiệu, brief thành viên để mọi người biết ai giúp ai.",
        },
        correctFeedbackEn: "Correct. Signal teammate and brief both members. Team coordination keeps the floor safe and both members feel guided.",
        correctFeedbackVi: "Đúng. Ra hiệu đồng đội và brief cả hai. Phối hợp đội giữ sàn an toàn và cả hai đều được hướng dẫn.",
      },
    ],
    resultGood: {
      titleEn: "Peak hour completed",
      titleVi: "Hoàn thành giờ cao điểm",
      strengthsEn: ["Prioritization", "Communication", "Team coordination"],
      strengthsVi: ["Ưu tiên", "Giao tiếp", "Phối hợp đội"],
      xpReward: 120,
      skillDeltas: { communication: 8, teamwork: 10 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Missed prioritization (who was first)", "Weak communication tone with nervous member", "Left member feeling invisible or rushed"],
      keyIssuesVi: ["Bỏ lỡ ưu tiên (ai đến trước)", "Giọng giao tiếp yếu với thành viên lo lắng", "Để thành viên cảm thấy vô hình hoặc bị vội"],
      focusEn: ["→ Acknowledge who was there first", "→ Stay proactive with both members", "→ Keep Leo Mây energy: warm, clear, team-minded"],
      focusVi: ["→ Chú ý ai đến trước", "→ Chủ động với cả hai thành viên", "→ Giữ năng lượng Leo Mây: ấm áp, rõ ràng, tinh thần đội"],
    },
  },
  quiz: [
    {
      id: "q1_rank",
      quizType: "ranking" as const,
      questionEn: "Put these in the right order when a member walks in:",
      questionVi: "Sắp xếp đúng thứ tự khi thành viên bước vào:",
      options: [
        { en: "Make eye contact and walk toward them", vi: "Giao tiếp mắt và bước về phía họ" },
        { en: "Ask what they need (waiver, check-in, etc.)", vi: "Hỏi họ cần gì (waiver, check-in, v.v.)" },
        { en: "Smile and greet them", vi: "Mỉm cười và chào họ" },
        { en: "Help them with the next step", vi: "Giúp họ bước tiếp theo" },
      ],
      correctIndex: 0,
      correctOrder: [0, 2, 1, 3],
      explanationsEn: [
        "First: you notice and move toward them (presence).",
        "Then: smile and greet (warmth).",
        "Then: ask what they need (connection).",
        "Then: help with the next step (action). Wrong order (e.g. asking need before greeting) can feel cold or transactional.",
      ],
      explanationsVi: [
        "Trước: bạn chú ý và bước về phía họ (có mặt).",
        "Rồi: mỉm cười và chào (ấm áp).",
        "Rồi: hỏi họ cần gì (kết nối).",
        "Rồi: giúp bước tiếp theo (hành động). Thứ tự sai (vd hỏi nhu cầu trước khi chào) có thể cảm giác lạnh hoặc giao dịch.",
      ],
    },
    {
      id: "q1",
      quizType: "multiple_choice" as const,
      questionEn: "In the first 5 seconds when a member walks in, you should:",
      questionVi: "Trong 5 giây đầu khi thành viên bước vào, bạn nên:",
      options: [
        { en: "Wait for them to approach", vi: "Chờ họ đến" },
        { en: "Make eye contact, smile, and walk toward them", vi: "Giao tiếp bằng mắt, mỉm cười và bước về phía họ" },
        { en: "Nod from across the room", vi: "Gật đầu từ xa" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. If you wait for them to approach, the member may feel unwelcome or unsure where to go. Think from their perspective: they’re new or returning — they need to feel seen. At Leo Mây we go to the member first. Example: step out from behind the counter, make eye contact, and say 'Hey, welcome! Need a hand?'",
        "Correct. Eye contact says 'I see you.' A smile says 'you’re welcome here.' Walking toward them says 'I’m here to help.' Together this creates the first impression we want: warm, present, and member-first. Example: as soon as they’re in the door, look up, smile, and walk over — 'Hi! First time or coming back?'",
        "Wrong. A nod from across the room feels distant and impersonal. The member might think you’re busy or not interested. We want them to feel that someone is there for them. At Leo Mây the standard is: move toward the member and greet them in the first few seconds.",
      ],
      explanationsVi: [
        "Sai. Nếu bạn chờ họ đến, thành viên có thể cảm thấy không được chào đón hoặc không biết đi đâu. Hãy đặt mình vào vị trí họ: họ mới hoặc quay lại — họ cần cảm thấy được chú ý. Ở Leo Mây chúng ta chủ động đến với thành viên trước. Ví dụ: bước ra khỏi quầy, giao tiếp mắt và nói 'Chào bạn! Cần tôi giúp gì?'",
        "Đúng. Giao tiếp mắt nói 'Tôi thấy bạn.' Nụ cười nói 'Bạn được chào đón.' Bước về phía họ nói 'Tôi ở đây để giúp.' Kết hợp tạo ấn tượng đầu tiên chúng ta muốn: ấm áp, có mặt, và thành viên là trung tâm. Ví dụ: ngay khi họ vào cửa, ngẩng lên, cười và bước lại — 'Chào! Lần đầu hay quay lại?'",
        "Sai. Gật đầu từ xa cảm giác xa cách và vô cảm. Thành viên có thể nghĩ bạn đang bận hoặc không quan tâm. Chúng ta muốn họ cảm thấy có người sẵn sàng cho họ. Chuẩn Leo Mây là: di chuyển về phía thành viên và chào trong vài giây đầu.",
      ],
    },
    {
      id: "q2",
      quizType: "scenario_judgment" as const,
      questionEn: "A member is confused and a teammate says 'That's not my job.' What does Leo Mây stand for?",
      questionVi: "Một thành viên bối rối và đồng đội nói 'Đó không phải việc của tôi.' Leo Mây đại diện cho điều gì?",
      options: [
        { en: "Fitness over fun", vi: "Thể dục hơn vui" },
        { en: "Community over ego", vi: "Cộng đồng hơn cái tôi" },
        { en: "Speed over service", vi: "Nhanh hơn phục vụ" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. We don’t put fitness above fun — we believe climbing and growth go together with joy and connection. The gym is a place where people belong, not just train.",
        "Correct. Community over ego means we put the group and the member before our own convenience or pride. Examples: help a confused member even if it’s 'not your job'; clean a spill you didn’t make; step in when a teammate is overwhelmed. That’s the Leo Mây way.",
        "Wrong. Speed can make people feel rushed or invisible. We prioritize service and presence: take the time to greet, help, and make each person feel seen. Rushing through check-in or ignoring someone who’s waiting breaks trust.",
      ],
      explanationsVi: [
        "Sai. Chúng ta không đặt thể dục lên trên vui — chúng ta tin leo và phát triển đi cùng niềm vui và kết nối. Gym là nơi mọi người thuộc về, không chỉ tập.",
        "Đúng. Cộng đồng hơn cái tôi nghĩa là chúng ta đặt nhóm và thành viên lên trước sự tiện lợi hay cái tôi của mình. Ví dụ: giúp thành viên bối rối dù 'không phải việc của bạn'; dọn nước đổ bạn không làm; hỗ trợ khi đồng đội quá tải. Đó là cách Leo Mây.",
        "Sai. Tốc độ có thể khiến người ta cảm thấy bị vội hay vô hình. Chúng ta ưu tiên phục vụ và có mặt: dành thời gian chào, giúp và khiến mỗi người cảm thấy được chú ý. Làm check-in vội hay lờ người đang chờ làm mất niềm tin.",
      ],
    },
    {
      id: "q3",
      quizType: "rewrite" as const,
      questionEn: "A staff member said: 'Go sign there.' Which is the best rewrite in Leo Mây tone?",
      questionVi: 'Khi bạn nói "Đi ký kia đi" với thành viên, nên thay bằng:',
      options: [
        { en: '"Over there"', vi: '"Ở kia"' },
        { en: '"Hey! First time? I got you"', vi: '"Chào! Lần đầu à? Để tôi giúp nhé"' },
        { en: '"Read the form"', vi: '"Đọc form đi"' },
      ],
      correctIndex: 1,
      explanationsEn: [
        '"Over there" is still cold and hands-off. The member may feel like a number. We want to show we’re with them: guide, don’t point. Example of better: "I’ll show you — it’s right here. Need anything else?"',
        "Correct. This is warm, personal, and helpful. It acknowledges they might be new, offers support, and shows you’re there for them. It turns a transaction into a welcome. Example: 'Hey! First time? I got you — the waiver’s here, and I can walk you through it if you like.'",
        "Wrong. 'Read the form' sounds like a command and can make the member feel stupid or unwelcome. They might already be nervous. Use a friendly tone and offer to help: 'I got you' or 'Want me to walk you through it?'",
      ],
      explanationsVi: [
        '"Ở kia" vẫn lạnh và buông tay. Thành viên có thể cảm thấy như một con số. Chúng ta muốn cho thấy chúng ta đi cùng họ: hướng dẫn, không chỉ tay. Ví dụ tốt hơn: "Tôi chỉ cho bạn — ngay đây. Cần gì nữa không?"',
        "Đúng. Cách nói này ấm áp, cá nhân và hữu ích. Nó thừa nhận họ có thể là người mới, đề nghị hỗ trợ và cho thấy bạn ở đó vì họ. Biến giao dịch thành lời chào. Ví dụ: 'Chào! Lần đầu à? Để tôi giúp nhé — form ở đây, tôi có thể hướng dẫn từng bước nếu bạn muốn.'",
        "Sai. 'Đọc form đi' nghe như mệnh lệnh và có thể khiến thành viên cảm thấy ngu hoặc không được chào. Họ có thể đã lo. Dùng giọng thân thiện và đề nghị giúp: 'Để tôi giúp nhé' hoặc 'Bạn muốn tôi hướng dẫn từng bước không?'",
      ],
    },
    {
      id: "q4",
      questionEn: "Three energy elements to practice are:",
      questionVi: "Ba yếu tố năng lượng cần luyện là:",
      options: [
        { en: "Speed, tone, volume", vi: "Tốc độ, giọng nói, âm lượng" },
        { en: "Eye contact, smile, walk toward member", vi: "Giao tiếp mắt, mỉm cười, bước về phía thành viên" },
        { en: "Paperwork, keys, badge", vi: "Giấy tờ, chìa khóa, thẻ" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Speed, tone, and volume are about delivery, not presence. What we practice first is being physically and emotionally present: see the person, show warmth, and move toward them. Those three set the energy.",
        "Correct. These three create the 'Leo Mây energy': (1) Eye contact — you see them as a person. (2) Smile — you’re glad they’re here. (3) Walk toward them — you’re ready to help. Practice these in the first 5 seconds every time.",
        "Wrong. Paperwork, keys, and badge are tasks, not energy. The energy comes from how you show up: visible, warm, and approaching. Do the admin after you’ve connected with the member.",
      ],
      explanationsVi: [
        "Sai. Tốc độ, giọng, âm lượng là về cách nói, không phải sự có mặt. Điều chúng ta luyện trước là có mặt về thể chất và cảm xúc: thấy người, thể hiện ấm áp và di chuyển về phía họ. Ba điều đó tạo năng lượng.",
        "Đúng. Ba điều này tạo 'năng lượng Leo Mây': (1) Giao tiếp mắt — bạn thấy họ là một con người. (2) Mỉm cười — bạn vui họ đến. (3) Bước về phía họ — bạn sẵn sàng giúp. Luyện trong 5 giây đầu mỗi lần.",
        "Sai. Giấy tờ, chìa khóa, thẻ là công việc, không phải năng lượng. Năng lượng đến từ cách bạn xuất hiện: thấy được, ấm áp và tiến lại gần. Làm thủ tục sau khi đã kết nối với thành viên.",
      ],
    },
    {
      id: "q5",
      questionEn: "A nervous member needs:",
      questionVi: "Thành viên lo lắng cần:",
      options: [
        { en: "To be ignored until they relax", vi: "Bị lơ cho đến khi bình tĩnh" },
        { en: "Reassurance and warmth", vi: "Động viên và sự ấm áp" },
        { en: "A quick check-in only", vi: "Chỉ check-in nhanh" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Put yourself in their shoes: they’re nervous because they don’t know what to expect. Ignoring them makes them feel invisible and can increase anxiety. They may leave or never come back. At Leo Mây we meet nervous members with reassurance, not distance.",
        "Correct. A nervous member is often afraid of looking stupid or not belonging. Reassurance (e.g. 'Lots of people feel that way', 'We’ll start easy') and warmth (smile, tone, taking time) help them feel safe. Example: 'Hey, first time? No worries — we’ll take it step by step. I’m here if you need anything.'",
        "Wrong. A quick check-in alone can feel dismissive. They need to feel seen and supported first. If you rush through, they may think you don’t care. Take a moment to acknowledge how they feel and offer support, then do check-in.",
      ],
      explanationsVi: [
        "Sai. Đặt mình vào vị trí họ: họ lo vì không biết sẽ thế nào. Lờ họ khiến họ cảm thấy vô hình và có thể tăng lo lắng. Họ có thể bỏ đi hoặc không quay lại. Ở Leo Mây chúng ta đón thành viên lo lắng bằng động viên, không phải khoảng cách.",
        "Đúng. Thành viên lo lắng thường sợ trông ngớ ngẩn hoặc không thuộc về. Động viên (vd 'Nhiều người cũng vậy', 'Chúng ta bắt đầu dễ thôi') và sự ấm áp (nụ cười, giọng nói, dành thời gian) giúp họ cảm thấy an toàn. Ví dụ: 'Chào, lần đầu à? Không sao — chúng ta làm từng bước. Tôi ở đây nếu bạn cần.'",
        "Sai. Chỉ check-in nhanh có thể cảm giác như phủ nhận. Họ cần cảm thấy được thấy và được hỗ trợ trước. Nếu bạn làm vội, họ có thể nghĩ bạn không quan tâm. Dành chút thời gian thừa nhận cảm xúc của họ và đề nghị hỗ trợ, rồi mới check-in.",
      ],
    },
  ],
  reflection: {
    id: "r1",
    promptEn: "What energy should Leo Mây feel like?",
    promptVi: "Leo Mây nên mang cảm giác năng lượng như thế nào?",
  },
  hardModeScenarios: [
    {
      id: "hard_angry_member",
      titleEn: "Hard: Angry member",
      titleVi: "Khó: Thành viên tức giận",
      promptEn: "A member is angry: 'I've been waiting 10 minutes and nobody helped me. This is ridiculous.' How do you respond?",
      promptVi: "Một thành viên tức giận: 'Tôi đợi 10 phút rồi không ai giúp. Thật vô lý.' Bạn trả lời thế nào?",
      hintEn: "Acknowledge their frustration first. Apologize. Then fix it. No excuses.",
      hintVi: "Thừa nhận sự bực bội trước. Xin lỗi. Rồi xử lý. Không bào chữa.",
      perfectAnswerEn: "I'm really sorry — you shouldn't have had to wait that long. That's on us. Let me help you right now. What do you need?",
      perfectAnswerVi: "Tôi rất xin lỗi — bạn không nên phải chờ lâu như vậy. Đó là lỗi của chúng tôi. Để tôi giúp bạn ngay. Bạn cần gì?",
      rubricEn: ["Acknowledge frustration", "Apologize without excuses", "Offer to fix it now"],
      rubricVi: ["Thừa nhận bực bội", "Xin lỗi không bào chữa", "Đề nghị xử lý ngay"],
      goodKeywords: ["sorry", "apologize", "help", "now", "xin lỗi", "giúp", "ngay"],
      badKeywords: ["but", "busy", "everyone", "chỉ", "bận"],
    },
  ],
  advancedLessons: [
    {
      id: "d1_adv_1",
      type: "text",
      titleEn: "Advanced: Micro-behaviors",
      titleVi: "Nâng cao: Hành vi nhỏ",
      contentEn: "The best staff don't just smile — they match energy. A nervous member gets calm, steady tone. A rushed regular gets quick, clear efficiency. Watch and adapt.",
      contentVi: "Nhân viên giỏi không chỉ mỉm cười — họ điều chỉnh năng lượng. Thành viên lo lắng cần giọng bình tĩnh. Người vội cần nhanh, rõ ràng. Quan sát và thích nghi.",
    },
  ],
};

// ========== DAY 2 — EXPERIENCE & SAFETY ==========
export const DAY2: DayContent = {
  day: 2,
  titleEn: "Experience & Safety",
  titleVi: "Trải nghiệm & An toàn",
  keyTakeawayEn: "Guide safely, never guarantee",
  keyTakeawayVi: "Hướng dẫn an toàn, không bao giờ đảm bảo tuyệt đối",
  sections: [
    {
      id: "d2s0_hook",
      type: "choice",
      titleEn: "Opening — Safety first",
      titleVi: "Mở đầu — An toàn trước",
      contentEn: "A first-timer says: 'Is it safe? I'm scared I'll fall.' What do you notice first?",
      contentVi: "Người lần đầu nói: 'Có an toàn không? Tôi sợ ngã.' Bạn chú ý điều gì trước?",
      correctChoiceIndex: 1,
      choices: [
        { en: "Reassure them that nothing will happen", vi: "Trấn an rằng không sao cả" },
        { en: "Acknowledge their fear and explain how we minimize risk", vi: "Thừa nhận nỗi sợ và giải thích cách chúng ta giảm thiểu rủi ro" },
        { en: "Tell them everyone falls sometimes", vi: "Nói rằng ai cũng ngã đôi khi" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Promising nothing will happen is a guarantee we never give. Impact: Legal and trust issues if something happens. Correct: Acknowledge fear, explain our safety measures, never guarantee.",
        "Correct. We acknowledge the emotion, then explain how we guide safely (harness, mats, progression). We never say '100% safe' — we minimize risk and support them.",
        "Why wrong: Can sound dismissive of their fear. Impact: They may feel unheard. Correct: Acknowledge fear first, then explain how we manage risk and support beginners.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Hứa không sao là đảm bảo chúng ta không bao giờ đưa. Tác động: Vấn đề pháp lý và niềm tin nếu có chuyện. Đúng: Thừa nhận sợ, giải thích biện pháp an toàn, không đảm bảo.",
        "Đúng. Chúng ta thừa nhận cảm xúc, rồi giải thích cách hướng dẫn an toàn (dây, thảm, tiến độ). Không nói '100% an toàn' — chúng ta giảm thiểu rủi ro và hỗ trợ.",
        "Sai vì: Có thể nghe như phủ nhận nỗi sợ. Tác động: Họ có thể cảm thấy không được lắng nghe. Đúng: Thừa nhận sợ trước, rồi giải thích cách quản lý rủi ro.",
      ],
    },
    {
      id: "d2s1",
      type: "text",
      titleEn: "Fear is Normal",
      titleVi: "Sợ là bình thường",
      contentEn: "Fear is normal. Climbers — especially beginners — often feel scared. Your job is to acknowledge it, not dismiss it.",
      contentVi: "Sợ là bình thường. Người leo — đặc biệt người mới — thường cảm thấy sợ. Việc của bạn là thừa nhận, không phủ nhận.",
    },
    {
      id: "d2s2",
      type: "list",
      titleEn: "Common Beginner Thoughts",
      titleVi: "Suy nghĩ thường gặp của người mới",
      contentEn: "Members might think:",
      contentVi: "Thành viên có thể nghĩ:",
      items: [
        { en: '"I\'m scared"', vi: '"Tôi sợ"' },
        { en: '"I\'m too weak"', vi: '"Tôi yếu lắm"' },
      ],
    },
    {
      id: "d2s3",
      type: "goodvsbad",
      titleEn: "Safety Language",
      titleVi: "Ngôn ngữ an toàn",
      contentEn: "Never guarantee safety. Use correct framing:",
      contentVi: "Không bao giờ đảm bảo an toàn tuyệt đối. Dùng cách nói đúng:",
      bad: { en: '"This is 100% safe"', vi: '"Cái này 100% an toàn"' },
      good: { en: '"We guide you safely, but risks exist. We minimize them."', vi: '"Chúng tôi hướng dẫn an toàn, nhưng rủi ro vẫn có. Chúng tôi giảm thiểu."' },
    },
    {
      id: "d2s4",
      type: "list",
      titleEn: "First Climb Flow",
      titleVi: "Luồng leo lần đầu",
      contentEn: "Guide new climbers through:",
      contentVi: "Hướng dẫn người mới qua:",
      items: [
        { en: "Proper shoes", vi: "Giày phù hợp" },
        { en: "Warm up", vi: "Khởi động" },
        { en: "Start with an easy route", vi: "Bắt đầu với đường dễ" },
      ],
    },
    {
      id: "d2s5",
      type: "list",
      titleEn: "Legal Rules",
      titleVi: "Quy tắc pháp lý",
      contentEn: "Never:",
      contentVi: "Không bao giờ:",
      items: [
        { en: "Guarantee safety", vi: "Đảm bảo an toàn tuyệt đối" },
        { en: "Dismiss fear", vi: "Phủ nhận nỗi sợ" },
      ],
    },
    {
      id: "d2s6",
      type: "reorder_steps",
      titleEn: "Put the steps in order",
      titleVi: "Sắp xếp đúng thứ tự",
      contentEn: "What is the correct order for a first-time climber? Drag or select the right sequence.",
      contentVi: "Thứ tự đúng cho người leo lần đầu là gì? Chọn đúng thứ tự.",
      stepsOrderEn: ["Proper shoes", "Warm up", "Start with an easy route"],
      stepsOrderVi: ["Giày phù hợp", "Khởi động", "Bắt đầu với đường dễ"],
      wrongExplanationEn: "Why wrong: Wrong order can increase injury risk or confuse the member. Impact: They may skip warm-up and get hurt, or feel lost. Correct order: Shoes → Warm up → Easy route. Example: \"Let's get you in the right shoes, do a quick warm-up, then we'll find an easy route.\"",
      wrongExplanationVi: "Sai vì: Thứ tự sai tăng rủi ro chấn thương hoặc làm thành viên bối rối. Tác động: Họ có thể bỏ khởi động và bị thương. Thứ tự đúng: Giày → Khởi động → Đường dễ. Ví dụ: \"Chúng ta đi giày đúng, khởi động nhanh, rồi tìm đường dễ.\"",
      rightExplanationEn: "Correct. This order keeps the member safe and sets them up for a good first experience.",
      rightExplanationVi: "Đúng. Thứ tự này giữ thành viên an toàn và tạo trải nghiệm đầu tốt.",
    },
    {
      id: "d2s7",
      type: "tap_mistake",
      titleEn: "Tap the mistake",
      titleVi: "Chạm vào câu sai",
      contentEn: "Which phrase should you never say? Tap it.",
      contentVi: "Cụm từ nào bạn không bao giờ nên nói? Chạm vào đó.",
      paragraphEn: "We have great routes here. This is 100% safe for everyone. We minimize risks with proper gear and supervision.",
      paragraphVi: "Chúng tôi có đường leo tuyệt. Cái này 100% an toàn cho mọi người. Chúng tôi giảm thiểu rủi ro bằng đồ và giám sát đúng.",
      wrongPhraseEn: "This is 100% safe for everyone",
      wrongPhraseVi: "Cái này 100% an toàn cho mọi người",
      options: [
        { en: "This is 100% safe for everyone", vi: "Cái này 100% an toàn cho mọi người" },
        { en: "We minimize risks with proper gear", vi: "Chúng tôi giảm thiểu rủi ro bằng đồ đúng" },
      ],
      correctIndex: 0,
      tapMistakeExplanationEn: "Why wrong: We never guarantee 100% safety — climbing has inherent risks. Impact: Legal and trust risk; if something happens, the member may feel misled. Correct phrasing: \"We guide you safely and work to minimize risks.\"",
      tapMistakeExplanationVi: "Sai vì: Chúng ta không bao giờ đảm bảo 100% an toàn — leo có rủi ro vốn có. Tác động: Rủi ro pháp lý và tin cậy. Cách nói đúng: \"Chúng tôi hướng dẫn an toàn và giảm thiểu rủi ro.\"",
      wrongExplanationEn: "That phrase is correct — we do minimize risks. The mistake is guaranteeing \"100% safe.\"",
      wrongExplanationVi: "Cụm đó đúng — chúng ta giảm thiểu rủi ro. Sai là đảm bảo \"100% an toàn\".",
      rightExplanationEn: "Correct. You identified the phrase we must never say. We guide safely; we don't guarantee 100%.",
      rightExplanationVi: "Đúng. Bạn đã chỉ ra cụm không bao giờ nên nói. Chúng ta hướng dẫn an toàn; không đảm bảo 100%.",
    },
    {
      id: "d2s_micro1",
      type: "choice",
      titleEn: "Micro challenge — Risk-based decision",
      titleVi: "Thử thách — Quyết định theo rủi ro",
      contentEn: "A member wants to try a hard route on their first visit. They say they've done outdoor climbing. What do you do?",
      contentVi: "Thành viên muốn thử đường khó ngay lần đầu. Họ nói đã leo ngoài trời. Bạn làm gì?",
      correctChoiceIndex: 1,
      choices: [
        { en: "Let them try — they said they have experience", vi: "Cho họ thử — họ nói đã có kinh nghiệm" },
        { en: "Suggest starting with an easy route to learn our walls, then progress", vi: "Đề xuất bắt đầu đường dễ để làm quen tường, rồi nâng dần" },
        { en: "Refuse until they complete a safety briefing", vi: "Từ chối cho đến khi họ hoàn thành briefing an toàn" },
      ],
      choiceExplanationsEn: [
        "Why wrong: We don't take 'I have experience' at face value for first visit. Impact: Injury risk; our walls and rules may differ. Correct: Recommend starting easy so we assess and they learn our setup, then progress safely.",
        "Correct. We minimize risk by having them start easy, learn our walls, and progress. We don't dismiss their experience — we frame it as learning our space first.",
        "Why wrong: Refusing outright can feel hostile. We can do safety briefing AND suggest easy start. Impact: Member may feel unwelcome. Correct: Brief + suggest easy route first, then they can progress.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Chúng ta không tin 'đã có kinh nghiệm' ngay lần đầu. Tác động: Rủi ro chấn thương; tường và quy tắc có thể khác. Đúng: Đề xuất bắt đầu dễ để đánh giá và họ làm quen.",
        "Đúng. Chúng ta giảm rủi ro bằng cách bắt đầu dễ, làm quen tường, rồi nâng dần. Không phủ nhận kinh nghiệm — đặt khung là học không gian của chúng ta trước.",
        "Sai vì: Từ chối thẳng có thể cảm giác thù địch. Có thể vừa briefing vừa đề xuất đường dễ. Đúng: Brief + đề xuất đường dễ trước, rồi họ có thể nâng dần.",
      ],
    },
    {
      id: "d2s_micro2",
      type: "fix_sentence",
      titleEn: "Micro challenge — Correction",
      titleVi: "Thử thách — Sửa câu",
      contentEn: "A staff member said this to a nervous beginner. Which fix is correct?",
      contentVi: "Nhân viên nói thế này với người mới lo. Sửa nào đúng?",
      wrongSentenceEn: "\"Don't worry, nothing bad will happen.\"",
      wrongSentenceVi: "\"Đừng lo, không có gì xấu xảy ra đâu.\"",
      options: [
        { en: "\"You'll be fine.\"", vi: "\"Bạn sẽ ổn thôi.\"" },
        { en: "\"It's normal to feel nervous. We're here to guide you and minimize risks — we'll start easy.\"", vi: "\"Cảm thấy lo là bình thường. Chúng tôi ở đây để hướng dẫn và giảm thiểu rủi ro — chúng ta bắt đầu dễ thôi.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: 'You'll be fine' still implies a guarantee. Impact: Same legal and trust issue. Correct: Acknowledge fear, explain our role (guide, minimize risk), no guarantee.",
      wrongExplanationVi: "Sai vì: 'Bạn sẽ ổn' vẫn ngụ ý đảm bảo. Đúng: Thừa nhận sợ, giải thích vai trò (hướng dẫn, giảm rủi ro), không đảm bảo.",
      rightExplanationEn: "Correct. We acknowledge the feeling, explain how we support (guide, minimize risk), and don't promise nothing will happen.",
      rightExplanationVi: "Đúng. Chúng ta thừa nhận cảm xúc, giải thích cách hỗ trợ, không hứa không có gì xảy ra.",
    },
  ],
  scenarios: [
    {
      id: "scared_climber",
      titleEn: "Scared Climber",
      titleVi: "Người leo sợ",
      promptEn: "A climber says: 'I'm too scared to try.' How do you respond?",
      promptVi: "Một người leo nói: 'Tôi sợ quá không dám thử.' Bạn trả lời thế nào?",
      hintEn: "Acknowledge the fear. Offer support. Don't push.",
      hintVi: "Thừa nhận nỗi sợ. Đề nghị hỗ trợ. Không ép.",
      perfectAnswerEn: "I understand — that's a totally normal feeling. Lots of climbers feel that way, especially at first. I'm here to support you. We can start whenever you're ready, or just watch for a bit if that helps. No pressure. What would feel best for you?",
      perfectAnswerVi: "Tôi hiểu — đó là cảm giác hoàn toàn bình thường. Nhiều người leo cũng vậy, đặc biệt lúc đầu. Tôi ở đây để hỗ trợ bạn. Chúng ta có thể bắt đầu khi bạn sẵn sàng, hoặc chỉ xem một chút cũng được. Không ép. Bạn muốn thế nào?",
      rubricEn: ["Acknowledge the fear", "Normalize it", "Offer support", "Don't push or dismiss"],
      rubricVi: ["Thừa nhận nỗi sợ", "Chuẩn hóa", "Đề nghị hỗ trợ", "Không ép hay phủ nhận"],
      goodKeywords: ["understand", "normal", "support", "ready", "hiểu", "bình thường", "hỗ trợ"],
      badKeywords: ["don't be scared", "easy", "just do it"],
    },
    {
      id: "overconfident_climber",
      titleEn: "Overconfident Climber",
      titleVi: "Người leo quá tự tin",
      promptEn: "A climber skips warm-up and heads straight to a hard route. What do you say?",
      promptVi: "Một người leo bỏ khởi động và đi thẳng đến đường khó. Bạn nói gì?",
      hintEn: "Kindly suggest warm-up. Safety first.",
      hintVi: "Nhẹ nhàng gợi ý khởi động. An toàn trước.",
      perfectAnswerEn: "Hey! Quick suggestion — doing a short warm-up first helps prevent injuries and gets your muscles ready. It only takes a couple minutes. Want me to show you a few moves?",
      perfectAnswerVi: "Này! Gợi ý nhé — khởi động một chút trước giúp tránh chấn thương và làm cơ sẵn sàng. Chỉ vài phút thôi. Tôi chỉ vài động tác nhé?",
      rubricEn: ["Kindly suggest warm-up", "Explain why (prevent injury)", "Offer to help"],
      rubricVi: ["Nhẹ nhàng gợi ý khởi động", "Giải thích lý do (tránh chấn thương)", "Đề nghị giúp"],
      goodKeywords: ["warm", "suggest", "prevent", "khởi động", "đề xuất", "tránh"],
    },
    {
      id: "parent_child",
      titleEn: "Parent with Child",
      titleVi: "Phụ huynh và trẻ",
      promptEn: "A parent asks: 'Is it safe for my 6-year-old?' How do you respond?",
      promptVi: "Phụ huynh hỏi: 'Con tôi 6 tuổi có an toàn không?' Bạn trả lời thế nào?",
      hintEn: "Explain our approach. Don't guarantee. Emphasize supervision.",
      hintVi: "Giải thích cách chúng ta làm. Không đảm bảo tuyệt đối. Nhấn mạnh giám sát.",
      perfectAnswerEn: "We have lots of kids that age. We guide them safely — proper harness, easy routes, and close supervision. We never say it's 100% safe because climbing has risks, but we minimize them and make sure an adult is with them. Would you like to see the kids area first?",
      perfectAnswerVi: "Chúng tôi có nhiều bé tầm tuổi đó. Chúng tôi hướng dẫn an toàn — dây đai đúng, đường dễ, và giám sát sát sao. Chúng tôi không đảm bảo 100% an toàn vì leo có rủi ro, nhưng chúng tôi giảm thiểu và đảm bảo có người lớn đi cùng. Bạn muốn xem khu trẻ trước không?",
      rubricEn: ["Explain our approach", "Don't guarantee 100% safety", "Emphasize supervision and guidance"],
      rubricVi: ["Giải thích cách chúng ta làm", "Không đảm bảo 100% an toàn", "Nhấn mạnh giám sát và hướng dẫn"],
      goodKeywords: ["supervision", "guide", "minimize", "giám sát", "hướng dẫn", "giảm"],
    },
  ],
  simulation: {
    id: "day2_safety",
    titleEn: "Safety first",
    titleVi: "An toàn trước",
    steps: [
      {
        type: "decision",
        id: "step1",
        sceneEn: "A parent and child (age 6) are at the counter. The parent asks if it's safe. A regular member is waiting behind them to check in.",
        sceneVi: "Phụ huynh và trẻ (6 tuổi) ở quầy. Phụ huynh hỏi có an toàn không. Một thành viên quen đang chờ check-in phía sau.",
        characters: [
          { id: "parent", labelEn: "Parent (safety question)", labelVi: "Phụ huynh (câu hỏi an toàn)" },
          { id: "regular", labelEn: "Regular (waiting)", labelVi: "Thành viên quen (đang chờ)" },
        ],
        promptEn: "Who do you address first, and why?",
        promptVi: "Bạn trả lời ai trước, và tại sao?",
        correctChoiceId: "parent",
        options: [
          { id: "parent", textEn: "Address the parent first — safety questions need a clear, honest answer", textVi: "Trả lời phụ huynh trước — câu hỏi an toàn cần câu trả lời rõ, trung thực" },
          { id: "regular", textEn: "Check in the regular first — they're in a hurry", textVi: "Check-in thành viên quen trước — họ đang vội" },
        ],
        wrongFeedbackEn: {
          regular: "Wrong. The parent is asking about safety for a child. If you serve the regular first, the parent may feel dismissed or that you don't take their concern seriously. Safety and reassurance come first; then you can quickly check in the regular. Guide safely, never guarantee.",
        },
        wrongFeedbackVi: {
          regular: "Sai. Phụ huynh đang hỏi về an toàn cho trẻ. Nếu bạn phục vụ thành viên quen trước, phụ huynh có thể cảm thấy bị coi thường. An toàn và động viên trước; sau đó check-in nhanh. Hướng dẫn an toàn, không đảm bảo tuyệt đối.",
        },
        correctFeedbackEn: "Correct. Address the parent first. Safety questions deserve a clear, honest answer (we guide safely, we don't guarantee). The regular can wait a moment. Then acknowledge them: 'One sec!' and check them in.",
        correctFeedbackVi: "Đúng. Trả lời phụ huynh trước. Câu hỏi an toàn cần câu trả lời rõ, trung thực (chúng ta hướng dẫn an toàn, không đảm bảo tuyệt đối). Thành viên quen chờ chút. Sau đó chào họ: 'Chờ chút nhé!' rồi check-in.",
      },
      {
        type: "decision",
        id: "step2",
        sceneEn: "You've answered the parent: we guide safely, we don't guarantee 100%. The regular is still waiting. The parent says: 'So is it safe or not?'",
        sceneVi: "Bạn đã trả lời phụ huynh: chúng tôi hướng dẫn an toàn, không đảm bảo 100%. Thành viên quen vẫn chờ. Phụ huynh nói: 'Vậy là an toàn hay không?'",
        characters: [
          { id: "honest", labelEn: "Stay honest", labelVi: "Giữ trung thực" },
          { id: "guarantee", labelEn: "Say 100% safe to reassure", labelVi: "Nói 100% an toàn để trấn an" },
        ],
        promptEn: "How do you respond?",
        promptVi: "Bạn trả lời thế nào?",
        correctChoiceId: "honest",
        options: [
          { id: "honest", textEn: "Repeat clearly: we minimize risks and supervise closely, but we never say 100% — that's our policy and it keeps everyone informed", textVi: "Nhắc lại rõ: chúng tôi giảm thiểu rủi ro và giám sát sát, nhưng không nói 100% — đó là chính sách và giúp mọi người được thông tin" },
          { id: "guarantee", textEn: "Say 'Yes, it's 100% safe' to reassure the parent", textVi: "Nói 'Có, 100% an toàn' để trấn an phụ huynh" },
        ],
        wrongFeedbackEn: {
          guarantee: "Wrong. We never guarantee 100% safety — legally and ethically risky. Impact: If something happens, the parent may feel misled; we could be liable. Correct: Stay honest; explain we minimize risks and supervise. Example: 'We take safety seriously and minimize risks — we just don't say 100% because climbing has inherent risks.'",
        },
        wrongFeedbackVi: {
          guarantee: "Sai. Chúng ta không bao giờ đảm bảo 100% an toàn — rủi ro pháp lý và đạo đức. Tác động: Nếu có chuyện, phụ huynh có thể cảm thấy bị lừa. Đúng: Giữ trung thực; giải thích chúng ta giảm thiểu rủi ro và giám sát.",
        },
        correctFeedbackEn: "Correct. We guide safely, never guarantee. Honest communication builds trust.",
        correctFeedbackVi: "Đúng. Chúng ta hướng dẫn an toàn, không đảm bảo. Giao tiếp trung thực xây niềm tin.",
      },
      {
        type: "decision",
        id: "step3",
        sceneEn: "Parent is satisfied. You turn to the regular. They say: 'Took a while.' What do you say?",
        sceneVi: "Phụ huynh hài lòng. Bạn quay sang thành viên quen. Họ nói: 'Lâu quá.' Bạn nói gì?",
        characters: [
          { id: "ack", labelEn: "Acknowledge briefly", labelVi: "Chào ngắn gọn" },
          { id: "ignore", labelEn: "Ignore the comment, just check in", labelVi: "Lờ comment, chỉ check-in" },
        ],
        promptEn: "Best response?",
        promptVi: "Phản hồi tốt nhất?",
        correctChoiceId: "ack",
        options: [
          { id: "ack", textEn: "\"Sorry for the wait — safety question needed a proper answer. You're up!\"", textVi: "\"Xin lỗi vì chờ — câu hỏi an toàn cần trả lời đúng. Đến lượt bạn!\"" },
          { id: "ignore", textEn: "Say nothing about the wait; just scan and check in", textVi: "Không nói gì về việc chờ; chỉ quét và check-in" },
        ],
        wrongFeedbackEn: {
          ignore: "Wrong. Ignoring their comment can feel dismissive. Impact: They may feel unheard or frustrated. Correct: Brief acknowledgment, then serve. Example: 'Sorry for the wait — you're up!'",
        },
        wrongFeedbackVi: {
          ignore: "Sai. Lờ comment có thể khiến họ cảm thấy bị phớt lờ. Tác động: Họ có thể cảm thấy không được nghe. Đúng: Chào ngắn gọn rồi phục vụ.",
        },
        correctFeedbackEn: "Correct. Acknowledge briefly, then move on. Both members feel seen.",
        correctFeedbackVi: "Đúng. Chào ngắn gọn rồi tiếp tục. Cả hai đều cảm thấy được chú ý.",
      },
    ],
    resultGood: {
      titleEn: "Safety briefing completed",
      titleVi: "Hoàn thành phần an toàn",
      strengthsEn: ["Prioritized safety question", "Clear safety language", "Member confidence"],
      strengthsVi: ["Ưu tiên câu hỏi an toàn", "Ngôn ngữ an toàn rõ", "Sự tự tin thành viên"],
      xpReward: 100,
      skillDeltas: { safety: 10, communication: 5 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Safety question not prioritized", "Unclear or guaranteed safety language", "Parent or member felt dismissed"],
      keyIssuesVi: ["Câu hỏi an toàn chưa được ưu tiên", "Ngôn ngữ an toàn không rõ hoặc đảm bảo tuyệt đối", "Phụ huynh hoặc thành viên cảm thấy bị coi thường"],
      focusEn: ["→ Address safety questions first", "→ Guide safely, never guarantee", "→ Keep Leo Mây energy: honest, clear"],
      focusVi: ["→ Trả lời câu hỏi an toàn trước", "→ Hướng dẫn an toàn, không đảm bảo tuyệt đối", "→ Giữ năng lượng Leo Mây: trung thực, rõ ràng"],
    },
  },
  quiz: [
    {
      id: "q1",
      questionEn: "When a climber says they're scared, you should:",
      questionVi: "Khi người leo nói họ sợ, bạn nên:",
      options: [
        { en: "Tell them not to worry", vi: "Bảo họ đừng lo" },
        { en: "Acknowledge the fear and offer support", vi: "Thừa nhận nỗi sợ và đề nghị hỗ trợ" },
        { en: "Ignore it and continue", vi: "Lờ đi và tiếp tục" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Think why they said they’re scared: they’re being vulnerable. 'Don’t worry' dismisses that feeling — it can make them feel unheard or silly. They may shut down or feel they can’t share again. Instead, acknowledge: 'I get it — that’s normal. I’m here to help when you’re ready.'",
        "Correct. First feel empathy: they’re scared for a reason (new, past experience, etc.). Acknowledging the fear validates them. Offering support (e.g. 'We can go slow', 'I’ll be right here') builds trust. Example: 'A lot of people feel that way at first. Want to try an easy one together? No pressure.'",
        "Wrong. Ignoring their fear is the worst option. They trusted you enough to say they’re scared. If you continue as if they didn’t speak, they feel invisible and unsupported. They might not try at all or leave. Always acknowledge first, then offer support.",
      ],
      explanationsVi: [
        "Sai. Hãy nghĩ tại sao họ nói họ sợ: họ đang dễ tổn thương. 'Đừng lo' phủ nhận cảm giác đó — có thể khiến họ cảm thấy không được nghe hoặc ngớ ngẩn. Họ có thể đóng lại hoặc không dám chia sẻ nữa. Thay vào đó hãy thừa nhận: 'Tôi hiểu — bình thường mà. Tôi ở đây khi bạn sẵn sàng.'",
        "Đúng. Trước hết đồng cảm: họ sợ vì lý do (mới, trải nghiệm trước, v.v.). Thừa nhận nỗi sợ là xác nhận họ. Đề nghị hỗ trợ (vd 'Chúng ta làm chậm', 'Tôi ở ngay đây') xây niềm tin. Ví dụ: 'Nhiều người lúc đầu cũng vậy. Bạn muốn thử đường dễ cùng tôi không? Không ép.'",
        "Sai. Lờ nỗi sợ của họ là lựa chọn tệ nhất. Họ đủ tin bạn để nói họ sợ. Nếu bạn tiếp tục như không nghe, họ cảm thấy vô hình và không được hỗ trợ. Họ có thể không thử hoặc bỏ đi. Luôn thừa nhận trước, rồi đề nghị hỗ trợ.",
      ],
    },
    {
      id: "q2",
      questionEn: "Correct safety language is:",
      questionVi: "Ngôn ngữ an toàn đúng là:",
      options: [
        { en: '"This is 100% safe"', vi: '"Cái này 100% an toàn"' },
        { en: '"We guide you safely, but risks exist"', vi: '"Chúng tôi hướng dẫn an toàn, nhưng rủi ro vẫn có"' },
        { en: '"Nothing bad ever happens"', vi: '"Không có gì xấu xảy ra"' },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Saying '100% safe' is legally and ethically risky. Climbing has inherent risks. If something happens, the member may feel misled and we could be liable. We never guarantee absolute safety; we explain how we minimize risk and support them.",
        "Correct. This is honest and clear: we take safety seriously and guide people, but we don’t pretend risk doesn’t exist. It builds trust and sets the right expectation. Example: 'We’ll guide you safely — harness, belay, easy start. There are always some risks in climbing, but we work to minimize them.'",
        "Wrong. 'Nothing bad ever happens' is false and dangerous. It can encourage overconfidence or, if something does happen, destroy trust. We’re transparent: we minimize risk and support you, but we don’t promise zero risk.",
      ],
      explanationsVi: [
        "Sai. Nói '100% an toàn' rủi ro về pháp lý và đạo đức. Leo có rủi ro vốn có. Nếu có chuyện, thành viên có thể cảm thấy bị lừa và chúng ta có thể chịu trách nhiệm. Chúng ta không bao giờ đảm bảo an toàn tuyệt đối; chúng ta giải thích cách chúng ta giảm rủi ro và hỗ trợ họ.",
        "Đúng. Cách nói này trung thực và rõ: chúng ta coi trọng an toàn và hướng dẫn mọi người, nhưng chúng ta không giả vờ rủi ro không tồn tại. Nó xây dựng niềm tin và đặt kỳ vọng đúng. Ví dụ: 'Chúng tôi hướng dẫn an toàn — dây, belay, bắt đầu dễ. Leo luôn có một chút rủi ro, nhưng chúng tôi giảm thiểu.'",
        "Sai. 'Không có gì xấu xảy ra' là sai và nguy hiểm. Có thể khuyến khích tự tin thái quá hoặc, nếu có chuyện, phá vỡ niềm tin. Chúng ta minh bạch: chúng ta giảm rủi ro và hỗ trợ bạn, nhưng không hứa không rủi ro.",
      ],
    },
    {
      id: "q3",
      questionEn: "First climb flow includes:",
      questionVi: "Luồng leo lần đầu bao gồm:",
      options: [
        { en: "Shoes, warm-up, easy route", vi: "Giày, khởi động, đường dễ" },
        { en: "Go straight to hard route", vi: "Đi thẳng đến đường khó" },
        { en: "Skip warm-up if in a hurry", vi: "Bỏ khởi động nếu vội" },
      ],
      correctIndex: 0,
      explanationsEn: [
        "Correct. Proper shoes prevent slips and protect feet. Warm-up reduces injury risk. Starting with an easy route builds confidence and technique. This flow keeps the member safe and sets them up for a good experience. Example: 'Let’s get you in the right shoes, do a quick warm-up, then we’ll find an easy route to start.'",
        "Wrong. Going straight to a hard route increases injury risk and can overwhelm a beginner. They may get discouraged or hurt. We always guide new climbers through shoes, warm-up, and an easy start. That’s how we care for their safety and experience.",
        "Wrong. Skipping warm-up 'if in a hurry' puts the member at risk. We don’t compromise safety for speed. If they’re in a rush, we can do a short warm-up and still start easy — we don’t skip steps that protect them.",
      ],
      explanationsVi: [
        "Đúng. Giày phù hợp tránh trượt và bảo vệ chân. Khởi động giảm rủi ro chấn thương. Bắt đầu đường dễ xây sự tự tin và kỹ thuật. Luồng này giữ thành viên an toàn và tạo trải nghiệm tốt. Ví dụ: 'Chúng ta đi giày đúng, khởi động nhanh, rồi tìm đường dễ để bắt đầu.'",
        "Sai. Đi thẳng đường khó tăng rủi ro chấn thương và có thể làm người mới quá tải. Họ có thể nản hoặc bị thương. Chúng ta luôn hướng dẫn người mới qua giày, khởi động và bắt đầu dễ. Đó là cách chúng ta chăm sóc an toàn và trải nghiệm của họ.",
        "Sai. Bỏ khởi động 'nếu vội' đặt thành viên vào rủi ro. Chúng ta không đánh đổi an toàn lấy tốc độ. Nếu họ vội, chúng ta có thể khởi động ngắn và vẫn bắt đầu dễ — không bỏ qua bước bảo vệ họ.",
      ],
    },
    {
      id: "q4",
      questionEn: "You should never:",
      questionVi: "Bạn không bao giờ nên:",
      options: [
        { en: "Suggest warm-up", vi: "Đề xuất khởi động" },
        { en: "Guarantee 100% safety", vi: "Đảm bảo 100% an toàn" },
        { en: "Acknowledge fear", vi: "Thừa nhận nỗi sợ" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Suggesting warm-up is good — we should do it. The thing we never do is guarantee 100% safety. So 'suggest warm-up' is something we should do, not something we should never do.",
        "Correct. We never guarantee 100% safety. Climbing has inherent risks; saying it’s completely safe is misleading and can create legal and trust issues. We say we guide safely and minimize risk, and we acknowledge that risks exist.",
        "Wrong. Acknowledging fear is something we should do. We never dismiss or ignore when someone says they’re scared. So 'acknowledge fear' is the right thing to do, not something we should never do.",
      ],
      explanationsVi: [
        "Sai. Đề xuất khởi động là tốt — chúng ta nên làm. Điều chúng ta không bao giờ làm là đảm bảo 100% an toàn. Vì vậy 'đề xuất khởi động' là việc nên làm, không phải việc không bao giờ làm.",
        "Đúng. Chúng ta không bao giờ đảm bảo 100% an toàn. Leo có rủi ro vốn có; nói hoàn toàn an toàn là gây hiểu lầm và có thể tạo vấn đề pháp lý và niềm tin. Chúng ta nói chúng ta hướng dẫn an toàn và giảm rủi ro, và thừa nhận rủi ro tồn tại.",
        "Sai. Thừa nhận nỗi sợ là việc nên làm. Chúng ta không bao giờ phủ nhận hay lờ đi khi ai đó nói họ sợ. Vì vậy 'thừa nhận nỗi sợ' là điều đúng cần làm, không phải điều không bao giờ làm.",
      ],
    },
    {
      id: "q5",
      questionEn: "With a parent and child, emphasize:",
      questionVi: "Với phụ huynh và trẻ, nhấn mạnh:",
      options: [
        { en: "No risks at all", vi: "Không có rủi ro" },
        { en: "Supervision and our guidance", vi: "Giám sát và hướng dẫn của chúng tôi" },
        { en: "Let kids run free", vi: "Để trẻ tự do" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Saying 'no risks at all' is untrue and can create false confidence. Parents need honest information to decide. We explain how we minimize risk through supervision and guidance, but we don’t claim zero risk.",
        "Correct. Parents are worried about their child — empathize with that. We emphasize that we provide close supervision and structured guidance (harness, easy routes, rules). That’s how we keep kids safe and give parents confidence. Example: 'We have lots of kids. We keep an eye on them, use proper gear, and start with easy routes. A parent or guardian stays with them.'",
        "Wrong. 'Let kids run free' is unsafe and not what we do. Kids need supervision and clear guidance. Telling a parent we let kids run free would worry them and doesn’t reflect our actual practice. We emphasize supervision and guidance instead.",
      ],
      explanationsVi: [
        "Sai. Nói 'không có rủi ro' là không đúng và có thể tạo tự tin sai. Phụ huynh cần thông tin trung thực để quyết định. Chúng ta giải thích cách chúng ta giảm rủi ro qua giám sát và hướng dẫn, nhưng không tuyên bố không rủi ro.",
        "Đúng. Phụ huynh lo cho con — hãy đồng cảm với điều đó. Chúng ta nhấn mạnh chúng ta giám sát sát và hướng dẫn có cấu trúc (dây, đường dễ, quy tắc). Đó là cách chúng ta giữ trẻ an toàn và cho phụ huynh yên tâm. Ví dụ: 'Chúng tôi có nhiều bé. Chúng tôi trông chừng, dùng đồ bảo hộ đúng và bắt đầu đường dễ. Phụ huynh hoặc người giám hộ ở cùng.'",
        "Sai. 'Để trẻ tự do' không an toàn và không phải cách chúng ta làm. Trẻ cần giám sát và hướng dẫn rõ. Nói với phụ huynh chúng ta để trẻ chạy tự do sẽ khiến họ lo và không phản ánh thực tế. Chúng ta nhấn mạnh giám sát và hướng dẫn.",
      ],
    },
  ],
  reflection: {
    id: "r2",
    promptEn: "How can you make a scared climber feel supported?",
    promptVi: "Làm sao bạn có thể khiến người leo sợ cảm thấy được hỗ trợ?",
  },
  hardModeScenarios: [
    {
      id: "hard_parent_worried",
      titleEn: "Hard: Anxious parent",
      titleVi: "Khó: Phụ huynh lo lắng",
      promptEn: "A parent says: 'My kid wants to try but I've read about accidents. How do you guarantee their safety?' How do you respond?",
      promptVi: "Phụ huynh nói: 'Con tôi muốn thử nhưng tôi đọc về tai nạn. Làm sao các bạn đảm bảo an toàn?' Bạn trả lời thế nào?",
      hintEn: "Never guarantee. Explain supervision and risk minimization. Empathize with their concern.",
      hintVi: "Không bao giờ đảm bảo tuyệt đối. Giải thích giám sát và giảm thiểu rủi ro. Đồng cảm với lo lắng của họ.",
      perfectAnswerEn: "I totally get that — as a parent you want to know they're in good hands. We don't guarantee 100% safety because climbing has inherent risks, but we minimize them: harness, trained staff, easy routes for beginners, and we're right there. Would you like to see the kids area and our setup first?",
      perfectAnswerVi: "Tôi hiểu — làm cha mẹ bạn muốn biết con được an toàn. Chúng tôi không đảm bảo 100% an toàn vì leo có rủi ro, nhưng chúng tôi giảm thiểu: dây, nhân viên được đào tạo, đường dễ cho người mới, và chúng tôi ở ngay bên cạnh. Bạn có muốn xem khu trẻ em trước không?",
      rubricEn: ["Empathize", "Never guarantee", "Explain mitigation", "Offer to show"],
      rubricVi: ["Đồng cảm", "Không đảm bảo tuyệt đối", "Giải thích giảm thiểu", "Đề nghị cho xem"],
      goodKeywords: ["understand", "minimize", "supervision", "harness", "hiểu", "giảm thiểu", "giám sát"],
      badKeywords: ["100%", "guarantee", "never", "đảm bảo tuyệt đối"],
    },
  ],
  advancedLessons: [
    {
      id: "d2_adv_1",
      type: "text",
      titleEn: "Advanced: Fear psychology",
      titleVi: "Nâng cao: Tâm lý nỗi sợ",
      contentEn: "Fear is information. When someone says they're scared, they're asking for reassurance and control. Give both: 'Lots of people feel that. We'll go at your pace. You can stop anytime.'",
      contentVi: "Sợ là thông tin. Khi ai đó nói họ sợ, họ cần được trấn an và cảm giác kiểm soát. Cho cả hai: 'Nhiều người cũng vậy. Chúng ta đi theo nhịp của bạn. Bạn có thể dừng bất cứ lúc nào.'",
    },
  ],
};

// ========== DAY 3 — ROLE & RESPONSIBILITY ==========
export const DAY3: DayContent = {
  day: 3,
  titleEn: "Role & Responsibility",
  titleVi: "Vai trò & Trách nhiệm",
  keyTakeawayEn: "If you see it, you own it",
  keyTakeawayVi: "Thấy là xử lý",
  sections: [
    {
      id: "d3s0_hook",
      type: "choice",
      titleEn: "Opening — Who owns it?",
      titleVi: "Mở đầu — Ai chịu trách nhiệm?",
      contentEn: "You see a spill. A member is at the counter. Your teammate is busy. What do you notice first?",
      contentVi: "Bạn thấy nước đổ. Một thành viên đang ở quầy. Đồng đội đang bận. Bạn chú ý điều gì trước?",
      correctChoiceIndex: 0,
      choices: [
        { en: "The spill is a hazard — I should handle it", vi: "Nước đổ là nguy cơ — tôi nên xử lý" },
        { en: "The member is waiting — let someone else clean", vi: "Thành viên đang chờ — để người khác dọn" },
        { en: "It's not my area — I'll ignore it", vi: "Không phải khu của tôi — tôi sẽ lờ đi" },
      ],
      choiceExplanationsEn: [
        "Correct. If you see it, you own it. The spill is a safety risk; the member can wait a few seconds while you signal them and fix the hazard. Ownership means taking responsibility when you notice something.",
        "Why wrong: 'Let someone else' is passing the buck. Impact: The spill may cause a slip; the member may also feel ignored if no one acts. Correct: You handle the hazard, acknowledge the member briefly, then help them.",
        "Why wrong: 'Not my area' breaks the Leo Mây culture. Impact: Hazard stays, member experience suffers. We don't ignore what we see — we own it. Correct: Handle the spill, then serve the member.",
      ],
      choiceExplanationsVi: [
        "Đúng. Thấy là xử lý. Nước đổ là rủi ro an toàn; thành viên có thể chờ vài giây trong khi bạn ra hiệu và xử lý. Làm chủ nghĩa là chịu trách nhiệm khi bạn nhận ra.",
        "Sai vì: 'Để người khác' là đùn đẩy. Tác động: Nước đổ có thể gây trượt; thành viên có thể cảm thấy bị lờ. Đúng: Bạn xử lý nguy cơ, chào thành viên ngắn gọn, rồi giúp họ.",
        "Sai vì: 'Không phải khu tôi' phá văn hóa Leo Mây. Đúng: Xử lý nước đổ, rồi phục vụ thành viên.",
      ],
    },
    {
      id: "d3s1",
      type: "text",
      titleEn: "Your Role Matters",
      titleVi: "Vai trò của bạn quan trọng",
      contentEn: "Your role impacts everything — member experience, safety, and culture. Own it.",
      contentVi: "Vai trò của bạn ảnh hưởng mọi thứ — trải nghiệm thành viên, an toàn và văn hóa. Hãy làm chủ nó.",
    },
    {
      id: "d3s2",
      type: "goodvsbad",
      titleEn: "Staff vs Frontdesk",
      titleVi: "Staff vs Frontdesk",
      contentEn: "Staff focus on routes, coaching, tasks. Frontdesk focus on check-in, members, sales. Both need the same culture.",
      contentVi: "Staff tập trung tường, coaching, nhiệm vụ. Frontdesk tập trung check-in, thành viên, bán hàng. Cả hai cần cùng văn hóa.",
    },
    {
      id: "d3s3",
      type: "text",
      titleEn: "Ownership Mindset",
      titleVi: "Tư duy làm chủ",
      contentEn: "If you see something — you own it. A mess? Clean it. A confused member? Help them.",
      contentVi: "Thấy gì — bạn xử lý. Bẩn? Dọn. Thành viên bối rối? Giúp họ.",
    },
    {
      id: "d3s4",
      type: "list",
      titleEn: "Handoff Checklist",
      titleVi: "Checklist chuyển giao",
      contentEn: "When handing a member to another team:",
      contentVi: "Khi chuyển thành viên sang bộ phận khác:",
      items: [
        { en: "Escort them (don't just point)", vi: "Đưa họ đi (đừng chỉ tay)" },
        { en: "Introduce the member and their need", vi: "Giới thiệu thành viên và nhu cầu" },
        { en: "Stay until the handoff is clear", vi: "Ở lại đến khi chuyển giao rõ ràng" },
      ],
    },
    {
      id: "d3s5",
      type: "choose_better",
      titleEn: "Choose the better response",
      titleVi: "Chọn phản hồi tốt hơn",
      contentEn: "A member asks about membership but you're staff (not frontdesk). Which response is better?",
      contentVi: "Thành viên hỏi về gói nhưng bạn là staff (không phải frontdesk). Phản hồi nào tốt hơn?",
      options: [
        { en: "\"That's not my job. Go to the counter.\"", vi: "\"Đó không phải việc tôi. Ra quầy đi.\"" },
        { en: "\"I'll take you to the counter — they can help with that.\"", vi: "\"Tôi đưa bạn ra quầy — họ sẽ giúp việc đó.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: Dismissive; member feels rejected. Impact: They may leave or feel unwelcome. Correct: Escort and hand off. Example: \"I'll take you to the counter — they can help with that.\"",
      wrongExplanationVi: "Sai vì: Từ chối; thành viên cảm thấy bị xua đuổi. Tác động: Họ có thể bỏ đi. Đúng: Đưa đi và chuyển giao. Ví dụ: \"Tôi đưa bạn ra quầy — họ sẽ giúp việc đó.\"",
      rightExplanationEn: "Correct. You own the moment and hand off properly. The member feels helped.",
      rightExplanationVi: "Đúng. Bạn làm chủ tình huống và chuyển giao đúng cách.",
    },
    {
      id: "d3s6",
      type: "text",
      titleEn: "Same culture",
      titleVi: "Cùng văn hóa",
      contentEn: "Staff and frontdesk have different main tasks but the same Leo Mây culture: warmth, ownership, member first.",
      contentVi: "Staff và frontdesk có nhiệm vụ chính khác nhau nhưng cùng văn hóa Leo Mây: ấm áp, làm chủ, thành viên trước.",
    },
    {
      id: "d3s_micro1",
      type: "choice",
      titleEn: "Micro challenge — Decision tree",
      titleVi: "Thử thách — Cây quyết định",
      contentEn: "A member asks about membership. You're staff (routes). What's the right next step?",
      contentVi: "Thành viên hỏi về gói. Bạn là staff (tường). Bước tiếp đúng là gì?",
      correctChoiceIndex: 1,
      choices: [
        { en: "Say 'That's frontdesk' and point", vi: "Nói 'Đó là frontdesk' và chỉ tay" },
        { en: "Escort them to frontdesk and introduce their need", vi: "Đưa họ đến quầy và giới thiệu nhu cầu" },
        { en: "Try to answer yourself even if unsure", vi: "Cố trả lời dù không chắc" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Pointing and dismissing feels cold. Impact: Member may feel like a number. Correct: Escort and hand off — introduce them and their need so frontdesk can help. Ownership includes the handoff.",
        "Correct. You own the moment: you don't leave them to find their way. You escort, introduce, and stay until the handoff is clear. That's the Leo Mây way.",
        "Why wrong: Giving wrong info hurts trust. Impact: Member may get confused or make a wrong decision. Correct: Escort to the right person and let frontdesk give accurate info.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Chỉ tay và từ chối cảm giác lạnh. Đúng: Đưa đi và chuyển giao — giới thiệu họ và nhu cầu để frontdesk giúp.",
        "Đúng. Bạn làm chủ tình huống: đưa đi, giới thiệu, ở lại đến khi chuyển giao rõ. Đó là cách Leo Mây.",
        "Sai vì: Thông tin sai làm mất niềm tin. Đúng: Đưa đến đúng người để frontdesk cung cấp thông tin chính xác.",
      ],
    },
    {
      id: "d3s_micro2",
      type: "choice",
      titleEn: "Micro challenge — Prioritization",
      titleVi: "Thử thách — Ưu tiên",
      contentEn: "Spill on floor. Member at counter. Teammate with a group. What do you do first?",
      contentVi: "Nước đổ trên sàn. Thành viên ở quầy. Đồng đội đang với nhóm. Bạn làm gì trước?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Signal member 'One sec', block or clean spill, then help member", vi: "Ra hiệu thành viên 'Chờ chút', chặn hoặc dọn, rồi giúp thành viên" },
        { en: "Help the member first, then clean", vi: "Giúp thành viên trước, rồi dọn" },
        { en: "Call for teammate to clean while you help member", vi: "Gọi đồng đội dọn trong khi bạn giúp thành viên" },
      ],
      choiceExplanationsEn: [
        "Correct. Safety first: the spill is a slip hazard. Quick acknowledgment to the member, fix the hazard, then serve. They wait a few seconds but everyone stays safe.",
        "Why wrong: Helping first while leaving the spill risks someone (member or another) slipping. Impact: Injury. Correct: Brief signal, fix hazard, then help. Safety before service when the hazard is immediate.",
        "Why wrong: Teammate is with a group — pulling them away may not be right. If you see the spill, you own it. Impact: Delay or confusion. Correct: You handle it; signal member so they feel seen.",
      ],
      choiceExplanationsVi: [
        "Đúng. An toàn trước: nước đổ là nguy cơ trượt. Chào thành viên nhanh, xử lý nguy cơ, rồi phục vụ.",
        "Sai vì: Giúp trước mà để nước đổ có thể khiến ai đó trượt. Đúng: Ra hiệu ngắn, xử lý nguy cơ, rồi giúp.",
        "Sai vì: Đồng đội đang với nhóm. Thấy là bạn xử lý. Đúng: Bạn xử lý; ra hiệu thành viên để họ thấy được chú ý.",
      ],
    },
  ],
  scenarios: [
    {
      id: "role_scenario_1",
      titleEn: "Ownership",
      titleVi: "Làm chủ",
      promptEn: "You see a spill. No one else notices. What do you do?",
      promptVi: "Bạn thấy nước đổ. Không ai chú ý. Bạn làm gì?",
      hintEn: "Own it.",
      hintVi: "Xử lý đi.",
      perfectAnswerEn: "I'd clean it up or get a mop right away. If I see it, I own it — that's the Leo Mây way. No one else noticed, but a spill is a safety risk and bad for the vibe. I'll handle it.",
      perfectAnswerVi: "Tôi sẽ dọn ngay hoặc lấy cây lau. Thấy là xử lý — đó là cách Leo Mây. Không ai chú ý nhưng nước đổ là rủi ro an toàn và ảnh hưởng không khí. Tôi xử lý.",
      rubricEn: ["Take ownership", "Act immediately", "Don't wait for someone else"],
      rubricVi: ["Làm chủ", "Hành động ngay", "Không chờ người khác"],
    },
    {
      id: "role_scenario_2",
      titleEn: "Handoff",
      titleVi: "Chuyển giao",
      promptEn: "A member needs something only frontdesk can do. You're staff. What do you do?",
      promptVi: "Thành viên cần việc chỉ frontdesk làm được. Bạn là staff. Bạn làm gì?",
      hintEn: "Escort, introduce, don't abandon.",
      hintVi: "Đưa đi, giới thiệu, đừng bỏ mặc.",
      perfectAnswerEn: "I'd walk them to frontdesk and introduce them: 'This is [Name] — they need help with [X].' I wouldn't just point and say 'go over there.' That feels cold. I'd make sure they're handed off properly.",
      perfectAnswerVi: "Tôi đưa họ đến quầy lễ tân và giới thiệu: 'Đây là [Tên] — họ cần hỗ trợ [X].' Tôi không chỉ chỉ tay nói 'đi kia'. Cảm giác lạnh. Tôi đảm bảo chuyển giao đúng cách.",
      rubricEn: ["Escort, don't point", "Introduce the member", "Don't abandon them"],
      rubricVi: ["Đưa đi, không chỉ tay", "Giới thiệu thành viên", "Không bỏ mặc"],
    },
    {
      id: "role_scenario_3",
      titleEn: "Busy Moment",
      titleVi: "Lúc bận",
      promptEn: "You're busy. A member waits. Another staff is free. What do you do?",
      promptVi: "Bạn đang bận. Một thành viên chờ. Một staff khác rảnh. Bạn làm gì?",
      hintEn: "Signal your teammate. Don't ignore the member.",
      hintVi: "Ra hiệu đồng đội. Đừng lờ thành viên.",
      perfectAnswerEn: "I'd make eye contact with the member first — 'One sec!' — then signal my teammate to help. I wouldn't let them stand there ignored. Community over ego: the member comes first.",
      perfectAnswerVi: "Tôi giao tiếp mắt với thành viên trước — 'Chờ chút nhé!' — rồi ra hiệu đồng đội giúp. Tôi không để họ đứng đó bị lơ. Cộng đồng hơn cái tôi: thành viên quan trọng nhất.",
      rubricEn: ["Acknowledge the member", "Signal teammate", "Don't ignore"],
      rubricVi: ["Chú ý thành viên", "Ra hiệu đồng đội", "Đừng lờ"],
    },
  ],
  simulation: {
    id: "day3_ownership",
    titleEn: "Who handles it?",
    titleVi: "Ai xử lý?",
    steps: [
      {
        type: "decision",
        id: "step1",
        sceneEn: "You see a spill on the floor. A member is at the counter. Your teammate is with a group. Who handles the spill?",
        sceneVi: "Bạn thấy nước đổ trên sàn. Một thành viên đang ở quầy. Đồng đội đang với một nhóm. Ai xử lý nước đổ?",
        characters: [
          { id: "you", labelEn: "You (handle it)", labelVi: "Bạn (xử lý)" },
          { id: "teammate", labelEn: "Wait for teammate", labelVi: "Chờ đồng đội" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "you",
        options: [
          { id: "you", textEn: "I handle it — signal the member 'One sec', clean or block the spill, then help them", textVi: "Tôi xử lý — ra hiệu thành viên 'Chờ chút', dọn hoặc chặn vết đổ, rồi giúp họ" },
          { id: "teammate", textEn: "Wait for teammate to finish and they can clean it", textVi: "Chờ đồng đội xong rồi họ dọn" },
        ],
        wrongFeedbackEn: {
          teammate: "Wrong. If you see it, you own it. Leaving the spill for someone else risks a member slipping. Acknowledge the member briefly, then fix the hazard. Ownership means you take responsibility when you notice something.",
        },
        wrongFeedbackVi: {
          teammate: "Sai. Thấy là xử lý. Để nước đổ cho người khác có thể khiến thành viên trượt. Chào thành viên ngắn gọn rồi xử lý nguy cơ. Làm chủ nghĩa là bạn chịu trách nhiệm khi bạn nhận ra.",
        },
        correctFeedbackEn: "Correct. If you see it, you own it. Don't pass the buck. Quick signal to the member, deal with the spill (clean or block), then help them. That's the Leo Mây way.",
        correctFeedbackVi: "Đúng. Thấy là xử lý. Không đùn đẩy. Ra hiệu nhanh với thành viên, xử lý nước đổ (dọn hoặc chặn), rồi giúp họ. Đó là cách Leo Mây.",
      },
      {
        type: "decision",
        id: "step2",
        sceneEn: "A member asks about membership prices. You're staff (wall). Who should answer?",
        sceneVi: "Thành viên hỏi giá gói. Bạn là staff (tường). Ai nên trả lời?",
        characters: [
          { id: "escort", labelEn: "Escort to frontdesk", labelVi: "Đưa ra quầy" },
          { id: "point", labelEn: "Point and say 'Ask at the counter'", labelVi: "Chỉ tay và nói 'Hỏi ở quầy'" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "escort",
        options: [
          { id: "escort", textEn: "I'll take you to the counter — they can give you the details", textVi: "Tôi đưa bạn ra quầy — họ sẽ cho bạn thông tin chi tiết" },
          { id: "point", textEn: "Ask at the counter (point)", textVi: "Hỏi ở quầy (chỉ tay)" },
        ],
        wrongFeedbackEn: {
          point: "Wrong. Pointing feels cold; the member may feel dismissed. Impact: They may get lost or feel unwelcome. Correct: Escort them to frontdesk and hand off. Example: 'I'll take you to the counter — they can help with that.'",
        },
        wrongFeedbackVi: {
          point: "Sai. Chỉ tay cảm giác lạnh; thành viên có thể cảm thấy bị phớt lờ. Đúng: Đưa họ ra quầy và chuyển giao.",
        },
        correctFeedbackEn: "Correct. You own the moment: escort and hand off. The member feels helped.",
        correctFeedbackVi: "Đúng. Bạn làm chủ tình huống: đưa đi và chuyển giao. Thành viên cảm thấy được giúp.",
      },
      {
        type: "decision",
        id: "step3",
        sceneEn: "You're busy with a group. A member is waiting at the desk. A frontdesk teammate is free. What do you do?",
        sceneVi: "Bạn đang bận với một nhóm. Một thành viên đang chờ ở quầy. Đồng đội frontdesk rảnh. Bạn làm gì?",
        characters: [
          { id: "signal", labelEn: "Signal teammate to help", labelVi: "Ra hiệu đồng đội giúp" },
          { id: "ignore", labelEn: "Keep working; they'll wait", labelVi: "Tiếp tục làm; họ sẽ chờ" },
        ],
        promptEn: "Best action?",
        promptVi: "Hành động tốt nhất?",
        correctChoiceId: "signal",
        options: [
          { id: "signal", textEn: "Make eye contact with the member — 'One sec!' — then signal teammate to help", textVi: "Giao tiếp mắt với thành viên — 'Chờ chút!' — rồi ra hiệu đồng đội giúp" },
          { id: "ignore", textEn: "Keep working; the member will wait", textVi: "Tiếp tục làm; thành viên sẽ chờ" },
        ],
        wrongFeedbackEn: {
          ignore: "Wrong. Letting the member stand there ignored hurts the experience. Impact: They may leave or feel invisible. Correct: Acknowledge them and get help. Example: 'One sec!' then signal your teammate.",
        },
        wrongFeedbackVi: {
          ignore: "Sai. Để thành viên đứng đó bị lờ làm hỏng trải nghiệm. Đúng: Chú ý họ và nhờ đồng đội giúp.",
        },
        correctFeedbackEn: "Correct. Member first: acknowledge, then hand off. Community over ego.",
        correctFeedbackVi: "Đúng. Thành viên trước: chú ý rồi chuyển giao. Cộng đồng hơn cái tôi.",
      },
    ],
    resultGood: {
      titleEn: "Ownership in action",
      titleVi: "Làm chủ trong hành động",
      strengthsEn: ["Ownership (saw it, handled it)", "Member acknowledged", "Hazard removed"],
      strengthsVi: ["Làm chủ (thấy là xử lý)", "Thành viên được chú ý", "Nguy cơ được xử lý"],
      xpReward: 100,
      skillDeltas: { teamwork: 8 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Passed the buck instead of owning", "Spill left — member at risk", "Member may feel unheard"],
      keyIssuesVi: ["Đùn đẩy thay vì làm chủ", "Nước đổ còn — thành viên gặp rủi ro", "Thành viên có thể cảm thấy không được nghe"],
      focusEn: ["→ If you see it, you own it", "→ Acknowledge member briefly, then fix", "→ Keep Leo Mây energy: proactive"],
      focusVi: ["→ Thấy là xử lý", "→ Chào thành viên ngắn gọn rồi xử lý", "→ Giữ năng lượng Leo Mây: chủ động"],
    },
  },
  quiz: [
    {
      id: "q1",
      questionEn: "Ownership means:",
      questionVi: "Làm chủ có nghĩa:",
      options: [{ en: "Ignore problems", vi: "Lờ vấn đề" }, { en: "If you see it, you own it", vi: "Thấy là xử lý" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Ignoring problems is the opposite of ownership. If you see a spill, a confused member, or something broken and you ignore it, the problem stays and the member or team suffers. Ownership means you take responsibility when you notice something.",
        "Correct. If you see it, you own it: you don’t wait for someone else or assume it’s 'not your job.' Example: you see a spill — you clean it or get it cleaned. You see a member looking lost — you help or find someone who can. That’s the Leo Mây way.",
      ],
      explanationsVi: [
        "Sai. Lờ vấn đề là ngược với làm chủ. Nếu bạn thấy nước đổ, thành viên bối rối hay thứ gì hỏng mà bạn lờ đi, vấn đề vẫn đó và thành viên hoặc đội chịu thiệt. Làm chủ nghĩa là bạn chịu trách nhiệm khi bạn nhận ra điều gì.",
        "Đúng. Thấy là xử lý: bạn không chờ người khác hay cho rằng 'không phải việc mình.' Ví dụ: thấy nước đổ — bạn dọn hoặc nhờ dọn. Thấy thành viên lạc — bạn giúp hoặc tìm người giúp. Đó là cách Leo Mây.",
      ],
    },
    {
      id: "q2",
      questionEn: "Staff focus on:",
      questionVi: "Staff tập trung:",
      options: [{ en: "Check-in only", vi: "Chỉ check-in" }, { en: "Routes, coaching, tasks", vi: "Tường, coaching, nhiệm vụ" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Check-in is mainly frontdesk. Staff focus on the wall: routes, coaching climbers, and operational tasks (e.g. setting, safety, floor). Both roles matter; they’re just different. Knowing this helps you hand off correctly (e.g. membership question → frontdesk).",
        "Correct. Staff focus on routes, coaching, and tasks around the wall and floor. That doesn’t mean they ignore members — they still greet and help — but their primary responsibility is the climbing experience and operations, not check-in or sales.",
      ],
      explanationsVi: [
        "Sai. Check-in chủ yếu là frontdesk. Staff tập trung tường: đường leo, coaching người leo và nhiệm vụ vận hành (vd set route, an toàn, sàn). Cả hai vai trò đều quan trọng; chỉ khác nhau. Biết điều này giúp bạn chuyển giao đúng (vd câu hỏi gói → frontdesk).",
        "Đúng. Staff tập trung tường, coaching và nhiệm vụ quanh tường và sàn. Không có nghĩa họ lờ thành viên — họ vẫn chào và giúp — nhưng trách nhiệm chính là trải nghiệm leo và vận hành, không phải check-in hay bán hàng.",
      ],
    },
    {
      id: "q3",
      questionEn: "Frontdesk focus on:",
      questionVi: "Frontdesk tập trung:",
      options: [{ en: "Routes only", vi: "Chỉ tường" }, { en: "Check-in, members, sales", vi: "Check-in, thành viên, bán hàng" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Routes are staff territory. Frontdesk focus on the front: check-in, helping members with membership and visits, and sales (memberships, merch) in a helpful way. Both teams share the same culture but have different main duties.",
        "Correct. Frontdesk focus on check-in, member service (questions, visits, waivers), and sales (memberships, merch) — always in a helpful, non-pushy way. They’re the first face members see, so warmth and efficiency both matter.",
      ],
      explanationsVi: [
        "Sai. Tường là phần staff. Frontdesk tập trung phía trước: check-in, giúp thành viên về gói và lượt đến, và bán hàng (gói, hàng) theo cách hữu ích. Cả hai đội cùng văn hóa nhưng nhiệm vụ chính khác nhau.",
        "Đúng. Frontdesk tập trung check-in, phục vụ thành viên (câu hỏi, lượt đến, form) và bán hàng (gói, hàng) — luôn theo cách hữu ích, không ép. Họ là gương mặt đầu tiên thành viên thấy nên ấm áp và hiệu quả đều quan trọng.",
      ],
    },
    {
      id: "q4",
      questionEn: "When you see a spill:",
      questionVi: "Khi thấy nước đổ:",
      options: [{ en: "Wait for someone else", vi: "Chờ người khác" }, { en: "Clean it or get it cleaned", vi: "Dọn hoặc nhờ dọn" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Waiting for someone else is not ownership. While you wait, someone could slip. The member experience and safety are everyone’s responsibility. If you see it, you own it: clean it yourself or quickly get whoever can do it.",
        "Correct. You see it, you own it. A spill is a safety risk and bad for the vibe. Clean it or get it cleaned right away. Don’t assume 'someone else' will do it — that someone is you when you’re the one who noticed.",
      ],
      explanationsVi: [
        "Sai. Chờ người khác không phải làm chủ. Trong lúc chờ, ai đó có thể trượt. Trải nghiệm và an toàn thành viên là trách nhiệm của mọi người. Thấy là xử lý: tự dọn hoặc nhanh chóng nhờ người có thể dọn.",
        "Đúng. Thấy là xử lý. Nước đổ là rủi ro an toàn và ảnh hưởng không khí. Dọn hoặc nhờ dọn ngay. Đừng cho rằng 'ai đó' sẽ làm — người đó là bạn khi bạn là người nhận ra.",
      ],
    },
    {
      id: "q5",
      questionEn: "Both staff and frontdesk need:",
      questionVi: "Cả staff và frontdesk cần:",
      options: [{ en: "Different cultures", vi: "Văn hóa khác nhau" }, { en: "The same Leo Mây culture", vi: "Cùng văn hóa Leo Mây" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. We don’t have different cultures for different roles. Whether you’re on the wall or at the desk, we all share the same values: community over ego, warmth, ownership, and putting the member first. Different jobs, same culture.",
        "Correct. Staff and frontdesk have different main tasks, but the same Leo Mây culture: welcome people, own what you see, help each other, and put the member and community first. That’s what makes the gym feel consistent and trustworthy.",
      ],
      explanationsVi: [
        "Sai. Chúng ta không có văn hóa khác nhau cho từng vai trò. Dù bạn ở tường hay quầy, tất cả cùng giá trị: cộng đồng hơn cái tôi, ấm áp, làm chủ và đặt thành viên lên trước. Công việc khác, văn hóa giống nhau.",
        "Đúng. Staff và frontdesk có nhiệm vụ chính khác nhau nhưng cùng văn hóa Leo Mây: chào đón, làm chủ những gì thấy, giúp nhau và đặt thành viên cùng cộng đồng lên trước. Đó là điều khiến gym nhất quán và đáng tin.",
      ],
    },
  ],
  reflection: { id: "r3", promptEn: "What does ownership mean to you?", promptVi: "Làm chủ có nghĩa gì với bạn?" },
  hardModeScenarios: [
    {
      id: "hard_conflict",
      titleEn: "Hard: Teammate conflict",
      titleVi: "Khó: Xung đột đồng đội",
      promptEn: "A member says: 'That other staff was rude to me.' You didn't see it. What do you say?",
      promptVi: "Thành viên nói: 'Nhân viên kia thô lỗ với tôi.' Bạn không thấy. Bạn nói gì?",
      hintEn: "Don't defend or blame. Listen. Apologize for their experience. Offer to help now.",
      hintVi: "Đừng bênh vực hay đổ lỗi. Lắng nghe. Xin lỗi vì trải nghiệm của họ. Đề nghị giúp ngay.",
      perfectAnswerEn: "I'm sorry you had that experience — that's not what we want for you here. I wasn't there so I can't speak to what happened, but I'm here now. What can I do to help you?",
      perfectAnswerVi: "Tôi xin lỗi vì bạn đã trải qua điều đó — đó không phải điều chúng tôi muốn. Tôi không có ở đó nên tôi không biết chuyện gì xảy ra, nhưng tôi ở đây bây giờ. Tôi có thể giúp gì cho bạn?",
      rubricEn: ["Apologize for experience", "Don't defend teammate", "Offer help now"],
      rubricVi: ["Xin lỗi vì trải nghiệm", "Không bênh đồng đội", "Đề nghị giúp ngay"],
      goodKeywords: ["sorry", "experience", "help", "xin lỗi", "giúp"],
      badKeywords: ["they", "maybe", "you must", "chắc", "bạn nhầm"],
    },
  ],
  advancedLessons: [
    {
      id: "d3_adv_1",
      type: "text",
      titleEn: "Advanced: Handoff script",
      titleVi: "Nâng cao: Kịch bản chuyển giao",
      contentEn: "When handing off: 'This is [Name] — they need [X].' Then to the member: 'You're in good hands with [Name].' Stay until the other person has taken over.",
      contentVi: "Khi chuyển giao: 'Đây là [Tên] — họ cần [X].' Rồi với thành viên: 'Bạn sẽ được [Tên] hỗ trợ.' Ở lại đến khi người kia đã nhận.",
    },
  ],
};

// ========== DAY 4 — SALES & SYSTEM ==========
export const DAY4: DayContent = {
  day: 4,
  titleEn: "Sales & System",
  titleVi: "Bán hàng & Hệ thống",
  keyTakeawayEn: "Selling is helping",
  keyTakeawayVi: "Bán hàng là giúp đỡ",
  sections: [
    {
      id: "d4s0_hook",
      type: "choice",
      titleEn: "Opening — Sales conversation",
      titleVi: "Mở đầu — Hội thoại bán hàng",
      contentEn: "A day-pass member says they love the gym and come every week. What do you notice first?",
      contentVi: "Thành viên vé ngày nói họ rất thích gym và đến mỗi tuần. Bạn chú ý điều gì trước?",
      correctChoiceIndex: 1,
      choices: [
        { en: "They're a sales target", vi: "Họ là đối tượng bán hàng" },
        { en: "They might benefit from a membership — and we can help", vi: "Họ có thể hưởng lợi từ gói thành viên — và chúng ta có thể giúp" },
        { en: "Just check them in and say nothing", vi: "Chỉ check-in và không nói gì" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Seeing them as a 'target' leads to pushy behavior. Impact: Member feels pressured and may avoid the counter. Correct: We help by matching them with what fits — membership can save them money and deepen belonging.",
        "Correct. Selling is helping. They're already engaged; a natural mention of membership (save money, belong) can help them — no pressure. We're not pushing; we're offering something that fits.",
        "Why wrong: Not mentioning membership when they love the gym and come often misses a chance to help. Impact: They may overpay with day passes or feel we don't care. Correct: Natural, brief mention — no pressure.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Coi họ là 'đối tượng' dẫn đến ép. Đúng: Chúng ta giúp bằng cách kết nối với thứ phù hợp — gói có thể tiết kiệm và gắn bó.",
        "Đúng. Bán là giúp. Họ đã gắn bó; nhắc gói tự nhiên (tiết kiệm, thuộc về) có thể giúp họ — không ép. Chúng ta không ép; chúng ta đề xuất thứ phù hợp.",
        "Sai vì: Không nhắc gói khi họ thích và đến thường bỏ lỡ cơ hội giúp. Đúng: Nhắc ngắn gọn, tự nhiên — không ép.",
      ],
    },
    {
      id: "d4s1",
      type: "text",
      titleEn: "Selling = Helping",
      titleVi: "Bán = Giúp",
      contentEn: "Selling is helping. You're not pushing — you're matching members with what they need.",
      contentVi: "Bán hàng là giúp đỡ. Bạn không ép — bạn kết nối thành viên với thứ họ cần.",
    },
    {
      id: "d4s2",
      type: "text",
      titleEn: "Merch Conversation",
      titleVi: "Chuyện hàng",
      contentEn: "Natural mentions: 'Love that shirt? We have it.' Not: 'Buy this.'",
      contentVi: "Nhắc tự nhiên: 'Thích áo đó không? Chúng ta có.' Không: 'Mua cái này đi.'",
    },
    {
      id: "d4s3",
      type: "list",
      titleEn: "System Basics",
      titleVi: "Hệ thống cơ bản",
      contentEn: "You will use:",
      contentVi: "Bạn sẽ dùng:",
      items: [
        { en: "Check-in — scan QR, verify membership", vi: "Check-in — quét QR, xác nhận gói" },
        { en: "POS — add items, checkout", vi: "POS — thêm món, thanh toán" },
        { en: "Inventory — stock in/out", vi: "Kho — nhập/xuất" },
      ],
    },
    {
      id: "d4s4",
      type: "fix_sentence",
      titleEn: "Fix the sentence",
      titleVi: "Sửa câu",
      contentEn: "A member is browsing chalk bags. Which response is better?",
      contentVi: "Thành viên đang xem túi phấn. Phản hồi nào tốt hơn?",
      wrongSentenceEn: "\"You need to buy one of these.\"",
      wrongSentenceVi: "\"Bạn cần mua một cái này.\"",
      options: [
        { en: "\"You need to buy one of these.\"", vi: "\"Bạn cần mua một cái này.\"" },
        { en: "\"Those are popular — we have a few colors if you want to try one.\"", vi: "\"Loại đó nhiều người dùng — chúng tôi có vài màu nếu bạn muốn thử.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: Pushy; member may feel pressured. Impact: They may leave or lose trust. Correct: Natural, helpful mention. Example: \"Those are popular — we have a few colors if you want to try one.\"",
      wrongExplanationVi: "Sai vì: Ép; thành viên có thể cảm thấy bị áp lực. Tác động: Họ có thể bỏ đi. Đúng: Nhắc tự nhiên, hữu ích. Ví dụ: \"Loại đó nhiều người dùng — chúng tôi có vài màu nếu bạn muốn thử.\"",
      rightExplanationEn: "Correct. Natural and helpful — selling is helping.",
      rightExplanationVi: "Đúng. Tự nhiên và hữu ích — bán là giúp.",
    },
    {
      id: "d4s5",
      type: "text",
      titleEn: "Check-in flow",
      titleVi: "Luồng check-in",
      contentEn: "Scan QR → verify membership or day-pass → confirm they're in. Quick and clear.",
      contentVi: "Quét QR → xác nhận gói hoặc vé ngày → xác nhận đã vào. Nhanh và rõ.",
    },
    {
      id: "d4s6",
      type: "list",
      titleEn: "When to mention membership",
      titleVi: "Khi nào nhắc gói",
      contentEn: "Good moments:",
      contentVi: "Thời điểm tốt:",
      items: [
        { en: "They come often (save money)", vi: "Họ đến thường (tiết kiệm)" },
        { en: "They love the gym (belong)", vi: "Họ thích gym (thuộc về)" },
        { en: "Never push — natural mention only", vi: "Không ép — chỉ nhắc tự nhiên" },
      ],
    },
    {
      id: "d4s_micro1",
      type: "choose_better",
      titleEn: "Micro challenge — Persuasion",
      titleVi: "Thử thách — Thuyết phục",
      contentEn: "Member says: 'I'm not sure I need a membership.' Which response is better?",
      contentVi: "Thành viên nói: 'Tôi không chắc cần gói.' Phản hồi nào tốt hơn?",
      options: [
        { en: "\"You should get one — everyone does.\"", vi: "\"Bạn nên mua — ai cũng vậy.\"" },
        { en: "\"No pressure at all. If you're here often, it can save you money — just something to consider when you're ready.\"", vi: "\"Không ép đâu. Nếu bạn đến thường, có thể tiết kiệm — chỉ gợi ý khi bạn sẵn sàng.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: 'You should' and 'everyone does' is pushy. Impact: Member feels pressured and may resist. Correct: Acknowledge, offer value (save money), leave the door open. No pressure.",
      wrongExplanationVi: "Sai vì: 'Bạn nên' và 'ai cũng vậy' là ép. Đúng: Thừa nhận, đưa giá trị (tiết kiệm), mở cửa. Không ép.",
      rightExplanationEn: "Correct. We help by informing; we don't push. They feel respected and may consider it when ready.",
      rightExplanationVi: "Đúng. Chúng ta giúp bằng cách thông tin; không ép. Họ cảm thấy được tôn trọng.",
    },
    {
      id: "d4s_micro2",
      type: "choice",
      titleEn: "Micro challenge — When to mention",
      titleVi: "Thử thách — Khi nào nhắc",
      contentEn: "A member is buying a day pass. They've never been before. Do you mention membership?",
      contentVi: "Thành viên đang mua vé ngày. Họ chưa từng đến. Bạn có nhắc gói không?",
      correctChoiceIndex: 1,
      choices: [
        { en: "Yes — push membership now", vi: "Có — ép gói ngay" },
        { en: "Brief, no-pressure mention — e.g. if they love it, membership saves money; no obligation", vi: "Nhắc ngắn, không ép — vd nếu họ thích, gói tiết kiệm; không bắt buộc" },
        { en: "No — never mention until they ask", vi: "Không — không nhắc cho đến khi họ hỏi" },
      ],
      choiceExplanationsEn: [
        "Why wrong: Pushing on first visit feels aggressive. Impact: They may not return. Correct: Let them experience first; a light mention (if you love it, we have memberships) is enough. No pressure.",
        "Correct. A brief, no-pressure mention plants the seed. They can enjoy today and consider later. We're helping by informing, not selling hard.",
        "Why wrong: Never mentioning can mean they never learn. A one-line mention (e.g. 'If you end up loving it, we have memberships') is helpful, not pushy. Correct: One natural mention, then focus on their visit.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Ép ngay lần đầu cảm giác gây hấn. Đúng: Để họ trải nghiệm trước; nhắc nhẹ là đủ.",
        "Đúng. Nhắc ngắn, không ép gieo ý. Họ tận hưởng hôm nay và cân nhắc sau. Chúng ta giúp bằng thông tin.",
        "Sai vì: Không bao giờ nhắc khiến họ không biết. Một câu nhắc tự nhiên là hữu ích. Đúng: Một lần nhắc, rồi tập trung vào lượt của họ.",
      ],
    },
  ],
  scenarios: [
    {
      id: "sales_1",
      titleEn: "Upsell",
      titleVi: "Upsell",
      promptEn: "A day-pass member loves the gym. How do you mention membership?",
      promptVi: "Thành viên vé ngày rất thích gym. Bạn nhắc gói thế nào?",
      hintEn: "Help, don't push.",
      hintVi: "Giúp, đừng ép.",
      perfectAnswerEn: "Sounds like you're enjoying it! If you're here often, a membership could save you money — and you'd be part of the community. No pressure at all. Just thought I'd mention it in case it helps.",
      perfectAnswerVi: "Có vẻ bạn thích lắm! Nếu bạn thường xuyên đến, gói thành viên có thể tiết kiệm hơn — và bạn sẽ là một phần cộng đồng. Không ép đâu. Chỉ nhắc trong trường hợp hữu ích.",
      rubricEn: ["Natural, not pushy", "Frame as helping", "Offer value (save money, community)"],
      rubricVi: ["Tự nhiên, không ép", "Đặt trong góc độ giúp", "Đưa giá trị (tiết kiệm, cộng đồng)"],
    },
    {
      id: "sales_2",
      titleEn: "Merch",
      titleVi: "Hàng",
      promptEn: "Member admires a chalk bag. What do you say?",
      promptVi: "Thành viên thích túi phấn. Bạn nói gì?",
      hintEn: "Natural mention.",
      hintVi: "Nhắc tự nhiên.",
      perfectAnswerEn: "Nice one, right? We have those — and a few other colors. Let me know if you want to check them out.",
      perfectAnswerVi: "Đẹp nhỉ? Chúng tôi có — và vài màu khác. Báo tôi nếu bạn muốn xem.",
      rubricEn: ["Natural, conversational", "Brief mention", "No pressure"],
      rubricVi: ["Tự nhiên, hội thoại", "Nhắc ngắn gọn", "Không ép"],
    },
    {
      id: "sales_3",
      titleEn: "Check-in Flow",
      titleVi: "Luồng check-in",
      promptEn: "Describe the check-in flow in one sentence.",
      promptVi: "Mô tả luồng check-in trong một câu.",
      hintEn: "QR → verify → confirm",
      hintVi: "QR → xác nhận → hoàn tất",
      perfectAnswerEn: "Scan their QR, verify membership or day-pass, confirm they're in, and they're good to go.",
      perfectAnswerVi: "Quét mã QR, xác nhận gói thành viên hoặc vé ngày, xác nhận họ đã check-in, xong.",
      rubricEn: ["QR scan", "Verify membership", "Confirm"],
      rubricVi: ["Quét QR", "Xác nhận gói", "Hoàn tất"],
    },
  ],
  simulation: {
    id: "day4_checkin",
    titleEn: "Check-in or upsell?",
    titleVi: "Check-in hay gợi ý?",
    steps: [
      {
        type: "decision",
        id: "step1",
        sceneEn: "A day-pass member is at the counter. They've been coming often. They say they love the gym. Do you mention membership?",
        sceneVi: "Thành viên vé ngày ở quầy. Họ đến thường. Họ nói rất thích gym. Bạn có nhắc gói thành viên không?",
        characters: [
          { id: "mention", labelEn: "Mention membership (help)", labelVi: "Nhắc gói (giúp)" },
          { id: "silent", labelEn: "Just check them in, say nothing", labelVi: "Chỉ check-in, không nói gì" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "mention",
        options: [
          { id: "mention", textEn: "Mention it naturally — e.g. if they're here often, a membership could save them money; no pressure", textVi: "Nhắc tự nhiên — vd nếu họ đến thường, gói có thể tiết kiệm; không ép" },
          { id: "silent", textEn: "Just check them in and say nothing about membership", textVi: "Chỉ check-in và không nói gì về gói" },
        ],
        wrongFeedbackEn: {
          silent: "Wrong. Selling is helping. If they love the gym and come often, not mentioning membership misses a chance to help them save and belong. Do it naturally: 'Sounds like you're here a lot — a membership might save you. No pressure.'",
        },
        wrongFeedbackVi: {
          silent: "Sai. Bán là giúp. Nếu họ thích gym và đến thường, không nhắc gói là bỏ lỡ cơ hội giúp họ tiết kiệm và thuộc về. Nhắc tự nhiên: 'Có vẻ bạn đến nhiều — gói có thể tiết kiệm. Không ép.'",
        },
        correctFeedbackEn: "Correct. Selling is helping. Mention membership in a low-pressure way when it fits — e.g. they come often, they'd save money. You're not pushing; you're making it easier for them to get what's right.",
        correctFeedbackVi: "Đúng. Bán là giúp. Nhắc gói một cách thoải mái khi phù hợp — vd họ đến thường, họ sẽ tiết kiệm. Bạn không ép; bạn giúp họ dễ có thứ phù hợp.",
      },
      {
        type: "decision",
        id: "step2",
        sceneEn: "They say they're not sure about committing. Do you push or back off?",
        sceneVi: "Họ nói chưa chắc về việc đăng ký. Bạn ép hay lùi?",
        characters: [
          { id: "backoff", labelEn: "Back off, no pressure", labelVi: "Lùi, không ép" },
          { id: "push", labelEn: "Push once more", labelVi: "Ép thêm lần nữa" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "backoff",
        options: [
          { id: "backoff", textEn: "No pressure at all — just so you know the option. Enjoy your session!", textVi: "Không ép đâu — chỉ để bạn biết lựa chọn. Tận hưởng buổi leo!" },
          { id: "push", textEn: "You should really get it — it's a great deal", textVi: "Bạn nên đăng ký đi — giá tốt lắm" },
        ],
        wrongFeedbackEn: {
          push: "Wrong. Pushing after they said they're not sure feels salesy and can hurt trust. Impact: They may feel pressured and avoid the desk next time. Correct: Back off warmly. Example: 'No pressure at all — just so you know. Enjoy!'",
        },
        wrongFeedbackVi: {
          push: "Sai. Ép sau khi họ nói chưa chắc cảm giác bán hàng và làm mất tin cậy. Đúng: Lùi ấm áp.",
        },
        correctFeedbackEn: "Correct. No pressure. You've given the info; the rest is their choice. That's Leo Mây.",
        correctFeedbackVi: "Đúng. Không ép. Bạn đã cho thông tin; còn lại là lựa chọn của họ.",
      },
      {
        type: "decision",
        id: "step3",
        sceneEn: "Another member is at the counter with a QR code. They're in a hurry. What's your priority?",
        sceneVi: "Thành viên khác ở quầy với mã QR. Họ đang vội. Ưu tiên của bạn là gì?",
        characters: [
          { id: "fast", labelEn: "Check them in fast, no extras", labelVi: "Check-in nhanh, không thêm" },
          { id: "upsell", labelEn: "Mention membership first", labelVi: "Nhắc gói trước" },
        ],
        promptEn: "Best approach?",
        promptVi: "Cách tốt nhất?",
        correctChoiceId: "fast",
        options: [
          { id: "fast", textEn: "Scan, verify, confirm — quick and clear. Maybe a brief 'Have a good one!'", textVi: "Quét, xác nhận, xong — nhanh và rõ. Có thể 'Chúc leo vui!' ngắn gọn" },
          { id: "upsell", textEn: "Before scanning: 'Have you thought about a membership?'", textVi: "Trước khi quét: 'Bạn đã nghĩ đến gói chưa?'" },
        ],
        wrongFeedbackEn: {
          upsell: "Wrong. When they're in a hurry, adding an upsell can feel pushy and slow them down. Impact: They may get frustrated. Correct: Match their energy — fast check-in first. You can mention membership when they're not rushed.",
        },
        wrongFeedbackVi: {
          upsell: "Sai. Khi họ vội, thêm upsell có thể cảm giác ép và làm chậm. Đúng: Khớp năng lượng — check-in nhanh trước.",
        },
        correctFeedbackEn: "Correct. Match the member: when they're in a hurry, be efficient first. Selling is helping at the right moment.",
        correctFeedbackVi: "Đúng. Khớp thành viên: khi họ vội, hiệu quả trước. Bán là giúp đúng lúc.",
      },
    ],
    resultGood: {
      titleEn: "Selling as helping completed",
      titleVi: "Hoàn thành bán hàng là giúp",
      strengthsEn: ["Natural membership mention", "Low-pressure tone", "Member felt helped"],
      strengthsVi: ["Nhắc gói tự nhiên", "Giọng không ép", "Thành viên cảm thấy được giúp"],
      xpReward: 100,
      skillDeltas: { sales: 10, communication: 5 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Missed chance to help (membership)", "Silent check-in when mention would help", "Member may overpay or feel unsupported"],
      keyIssuesVi: ["Bỏ lỡ cơ hội giúp (gói)", "Check-in im lặng khi nhắc sẽ hữu ích", "Thành viên có thể trả nhiều hơn hoặc cảm thấy không được hỗ trợ"],
      focusEn: ["→ Selling is helping — mention when it fits", "→ Natural, no pressure", "→ Keep Leo Mây energy: helpful, not pushy"],
      focusVi: ["→ Bán là giúp — nhắc khi phù hợp", "→ Tự nhiên, không ép", "→ Giữ năng lượng Leo Mây: hữu ích, không ép"],
    },
  },
  quiz: [
    {
      id: "q1",
      questionEn: "Selling at Leo Mây means:",
      questionVi: "Bán hàng ở Leo Mây là:",
      options: [{ en: "Pushing products", vi: "Ép mua" }, { en: "Helping members find what they need", vi: "Giúp thành viên tìm thứ họ cần" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Pushing products can make members feel pressured and distrustful. If they sense you only care about the sale, they may leave or not come back. At Leo Mây we match members with what actually helps them — membership, gear, etc. — not push for the sake of numbers.",
        "Correct. Selling here is helping: you listen to what the member wants or needs and suggest what fits (e.g. a membership if they come often, a chalk bag if they’re looking at one). You’re not pushing; you’re making it easier for them to get what’s right for them. Example: 'You’re here a lot — a monthly pass might save you money. No pressure, just so you know.'",
      ],
      explanationsVi: [
        "Sai. Ép mua có thể khiến thành viên cảm thấy bị áp lực và mất tin. Nếu họ cảm nhận bạn chỉ quan tâm doanh số, họ có thể bỏ đi hoặc không quay lại. Ở Leo Mây chúng ta kết nối thành viên với thứ thực sự giúp họ — gói, đồ — không ép vì số liệu.",
        "Đúng. Bán ở đây là giúp: bạn lắng nghe thành viên muốn hay cần gì và gợi ý thứ phù hợp (vd gói nếu họ đến thường, túi phấn nếu họ đang xem). Bạn không ép; bạn giúp họ dễ có thứ đúng. Ví dụ: 'Bạn đến nhiều — gói tháng có thể tiết kiệm. Không ép, chỉ để bạn biết.'",
      ],
    },
    {
      id: "q2",
      questionEn: "Merch talk should be:",
      questionVi: "Nói về hàng nên:",
      options: [{ en: "Aggressive", vi: "Hung hăng" }, { en: "Natural and helpful", vi: "Tự nhiên và hữu ích" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Aggressive merch talk (e.g. 'You need to buy this', repeated pushing) makes members uncomfortable. They may feel like a target and lose trust. We want them to feel helped, not sold to.",
        "Correct. Merch talk should feel natural and helpful: you notice what they’re interested in and mention it in a low-pressure way. Example: they’re looking at chalk bags — 'Those are popular. We have a few colors if you want to try one.' Not: 'Buy this now.' Natural and helpful builds trust and often leads to a sale because the member feels respected.",
      ],
      explanationsVi: [
        "Sai. Nói về hàng hung hăng (vd 'Bạn phải mua cái này', ép nhiều lần) khiến thành viên khó chịu. Họ có thể cảm thấy như mục tiêu và mất tin. Chúng ta muốn họ cảm thấy được giúp, không bị bán.",
        "Đúng. Nói về hàng nên tự nhiên và hữu ích: bạn để ý họ quan tâm gì và nhắc trong không khí thoải mái. Ví dụ: họ đang xem túi phấn — 'Loại đó nhiều người dùng. Chúng tôi có vài màu nếu bạn muốn thử.' Không: 'Mua cái này đi.' Tự nhiên và hữu ích xây tin và thường dẫn đến mua vì thành viên cảm thấy được tôn trọng.",
      ],
    },
    {
      id: "q3",
      questionEn: "Check-in uses:",
      questionVi: "Check-in dùng:",
      options: [{ en: "Manual entry only", vi: "Chỉ nhập tay" }, { en: "QR scan, verify membership", vi: "Quét QR, xác nhận gói" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. We don’t rely on manual entry only. Check-in is built around scanning the member’s QR (or card), verifying their membership or day-pass status, and confirming they’re in. Manual entry may be a fallback, but the standard flow is QR → verify → confirm.",
        "Correct. Check-in flow: scan their QR (or membership/card), verify that their membership or day-pass is valid, confirm they’re checked in. Quick and clear. Example: 'Scan here — you’re good. Have a great session.'",
      ],
      explanationsVi: [
        "Sai. Chúng ta không chỉ dựa vào nhập tay. Check-in xoay quanh quét mã QR (hoặc thẻ) thành viên, xác nhận gói hoặc vé ngày và xác nhận họ đã vào. Nhập tay có thể là dự phòng nhưng luồng chuẩn là QR → xác nhận → hoàn tất.",
        "Đúng. Luồng check-in: quét QR (hoặc thẻ) của họ, xác nhận gói hoặc vé ngày còn hiệu lực, xác nhận đã check-in. Nhanh và rõ. Ví dụ: 'Quét ở đây — xong. Chúc bạn leo vui.'",
      ],
    },
    {
      id: "q4",
      questionEn: "POS is for:",
      questionVi: "POS dùng để:",
      options: [{ en: "Climbing only", vi: "Chỉ leo" }, { en: "Add items, checkout", vi: "Thêm món, thanh toán" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. POS (point of sale) isn’t for climbing itself — it’s the system we use for sales. Climbing is what members do on the wall; POS is how we ring up merch, day passes, memberships, etc.",
        "Correct. POS is for adding items (merch, passes, etc.) and completing checkout. You use it when a member buys something: add the items, apply any discount, and process payment. It’s the sales and payment side of the front desk.",
      ],
      explanationsVi: [
        "Sai. POS (điểm bán hàng) không dùng cho leo — đó là hệ thống chúng ta dùng cho bán hàng. Leo là việc thành viên làm trên tường; POS là cách chúng ta tính tiền hàng, vé ngày, gói, v.v.",
        "Đúng. POS dùng để thêm món (hàng, vé, v.v.) và hoàn tất thanh toán. Bạn dùng khi thành viên mua gì: thêm món, áp dụng giảm giá nếu có và xử lý thanh toán. Đó là phần bán hàng và thanh toán của quầy.",
      ],
    },
    {
      id: "q5",
      questionEn: "Inventory includes:",
      questionVi: "Kho bao gồm:",
      options: [{ en: "Stock in and out", vi: "Nhập và xuất kho" }, { en: "Only climbing routes", vi: "Chỉ đường leo" }],
      correctIndex: 0,
      explanationsEn: [
        "Correct. Inventory is about stock: what we have (in) and what we sell or use (out). We track merch, gear, and other items so we know what to reorder and what’s available. Stock in/out is the core of inventory management.",
        "Wrong. Climbing routes are on the wall — they’re not inventory in the system sense. Inventory in our context is product stock: receiving stock (in), selling or using it (out), and keeping counts accurate.",
      ],
      explanationsVi: [
        "Đúng. Kho là về tồn kho: chúng ta có gì (nhập) và bán hay dùng gì (xuất). Chúng ta theo dõi hàng, đồ để biết cần đặt thêm và còn gì. Nhập/xuất là cốt lõi quản lý kho.",
        "Sai. Đường leo ở trên tường — không phải kho trong nghĩa hệ thống. Kho trong ngữ cảnh chúng ta là tồn sản phẩm: nhận hàng (nhập), bán hay dùng (xuất) và giữ số liệu chính xác.",
      ],
    },
  ],
  reflection: { id: "r4", promptEn: "How can you make selling feel like helping?", promptVi: "Làm sao biến bán hàng thành giúp đỡ?" },
  hardModeScenarios: [
    {
      id: "hard_objection",
      titleEn: "Hard: Price objection",
      titleVi: "Khó: Phản đối giá",
      promptEn: "A member says: 'The membership is too expensive.' How do you respond without being pushy?",
      promptVi: "Thành viên nói: 'Gói thành viên đắt quá.' Bạn trả lời thế nào mà không gây áp lực?",
      hintEn: "Acknowledge. Reframe value (visits, community). Offer options. No pressure.",
      hintVi: "Thừa nhận. Đặt lại giá trị (lượt đi, cộng đồng). Đề xuất lựa chọn. Không ép.",
      perfectAnswerEn: "I hear you — we want it to feel worth it. If you're here often, the per-visit cost goes down a lot, and you're part of the community. We also have [day pass / shorter plans]. No pressure — just want you to have the option that fits.",
      perfectAnswerVi: "Tôi hiểu — chúng tôi muốn bạn thấy xứng đáng. Nếu bạn đến thường xuyên, chi phí mỗi lần giảm nhiều và bạn là phần của cộng đồng. Chúng tôi cũng có [vé ngày / gói ngắn]. Không ép — chỉ muốn bạn có lựa chọn phù hợp.",
      rubricEn: ["Acknowledge", "Reframe value", "Offer options", "No pressure"],
      rubricVi: ["Thừa nhận", "Đặt lại giá trị", "Đề xuất lựa chọn", "Không ép"],
      goodKeywords: ["hear", "value", "option", "pressure", "hiểu", "lựa chọn"],
      badKeywords: ["cheap", "everyone", "must", "phải", "rẻ"],
    },
  ],
  advancedLessons: [
    {
      id: "d4_adv_1",
      type: "text",
      titleEn: "Advanced: Natural merch mention",
      titleVi: "Nâng cao: Nhắc merch tự nhiên",
      contentEn: "When a member admires gear: 'That chalk bag? We have it in a few colors. Want to see?' Not 'Buy this.' Observation first, then invite.",
      contentVi: "Khi thành viên thích đồ: 'Túi magnesium đó? Chúng tôi có vài màu. Bạn muốn xem không?' Không phải 'Mua cái này.' Quan sát trước, rồi mời.",
    },
  ],
};

// ========== DAY 5 — TEAM & EXCELLENCE ==========
export const DAY5: DayContent = {
  day: 5,
  titleEn: "Team & Excellence",
  titleVi: "Đội & Xuất sắc",
  keyTakeawayEn: "Make the team stronger",
  keyTakeawayVi: "Làm đội mạnh hơn",
  sections: [
    {
      id: "d5s0_hook",
      type: "choice",
      titleEn: "Opening — Chaos moment",
      titleVi: "Mở đầu — Lúc hỗn loạn",
      contentEn: "Three members at the counter. One just spilled a drink. Your teammate is with a group. What do you notice first?",
      contentVi: "Ba thành viên ở quầy. Một người vừa làm đổ nước. Đồng đội đang với nhóm. Bạn chú ý điều gì trước?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Safety first — the spill; then acknowledge the three; then get backup", vi: "An toàn trước — vết đổ; rồi chào ba người; rồi gọi hỗ trợ" },
        { en: "Serve the three first — they're waiting", vi: "Phục vụ ba người trước — họ đang chờ" },
        { en: "Find your teammate to help clean", vi: "Tìm đồng đội để giúp dọn" },
      ],
      choiceExplanationsEn: [
        "Correct. In chaos: safety (spill = slip risk), then acknowledge everyone so no one feels invisible, then coordinate (backup). Fast-paced but ordered. Member experience stays intact.",
        "Why wrong: Ignoring the spill risks someone slipping. Impact: Injury. Correct: Quick signal to the three ('One sec'), block or clean the spill, then serve. Safety then people.",
        "Why wrong: Teammate is with a group — pulling them away may not be right. You own what you see: signal members, handle spill, then get backup if needed. Correct: You act first, then coordinate.",
      ],
      choiceExplanationsVi: [
        "Đúng. Khi hỗn loạn: an toàn (nước đổ = trượt), rồi chào mọi người, rồi phối hợp. Nhanh nhưng có thứ tự.",
        "Sai vì: Lờ nước đổ có thể khiến ai trượt. Đúng: Ra hiệu nhanh, chặn/dọn, rồi phục vụ.",
        "Sai vì: Đồng đội đang bận. Bạn xử lý những gì thấy trước, rồi phối hợp. Đúng: Bạn hành động trước.",
      ],
    },
    {
      id: "d5s1",
      type: "text",
      titleEn: "Busy Gym",
      titleVi: "Gym đông",
      contentEn: "When it's busy: stay calm, prioritize, communicate with the team.",
      contentVi: "Khi đông: giữ bình tĩnh, ưu tiên, giao tiếp với đội.",
    },
    {
      id: "d5s2",
      type: "text",
      titleEn: "Ownership",
      titleVi: "Làm chủ",
      contentEn: "If you see it, you own it. No passing the buck.",
      contentVi: "Thấy là xử lý. Không đùn đẩy.",
    },
    {
      id: "d5s3",
      type: "text",
      titleEn: "Team Communication",
      titleVi: "Giao tiếp đội",
      contentEn: "Signal teammates. Cover for each other. No one gets left behind.",
      contentVi: "Ra hiệu đồng đội. Hỗ trợ nhau. Không ai bị bỏ lại.",
    },
    {
      id: "d5s4",
      type: "text",
      titleEn: "Invisible Work",
      titleVi: "Việc vô hình",
      contentEn: "Cleaning, restocking, helping without being asked — this is excellence.",
      contentVi: "Dọn dẹp, bổ sung, giúp không cần hỏi — đây là xuất sắc.",
    },
    {
      id: "d5s5",
      type: "goodvsbad",
      titleEn: "Good vs Great",
      titleVi: "Tốt và Tuyệt",
      contentEn: "Good: do your job. Great: make everyone's job easier.",
      contentVi: "Tốt: làm việc của bạn. Tuyệt: làm việc của mọi người dễ hơn.",
      bad: { en: "Good: minimum effort", vi: "Tốt: nỗ lực tối thiểu" },
      good: { en: "Great: proactive, helpful", vi: "Tuyệt: chủ động, hữu ích" },
    },
    {
      id: "d5s6",
      type: "choose_better",
      titleEn: "Choose the better response",
      titleVi: "Chọn phản hồi tốt hơn",
      contentEn: "Your teammate is overwhelmed. You have capacity. What do you say?",
      contentVi: "Đồng đội quá tải. Bạn còn sức. Bạn nói gì?",
      options: [
        { en: "\"Not my problem.\"", vi: "\"Không phải việc tôi.\"" },
        { en: "\"Need a hand? I can take the next check-in.\"", vi: "\"Cần tôi giúp không? Tôi nhận check-in tiếp theo.\"" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Why wrong: Not team-minded; teammate may burn out. Impact: Members get worse service; culture suffers. Correct: Offer specific help. Example: \"Need a hand? I can take the next check-in.\"",
      wrongExplanationVi: "Sai vì: Không tinh thần đội; đồng đội có thể kiệt sức. Tác động: Thành viên bị phục vụ kém. Đúng: Đề nghị giúp cụ thể. Ví dụ: \"Cần tôi giúp không? Tôi nhận check-in tiếp.\"",
      rightExplanationEn: "Correct. Community over ego — we cover for each other.",
      rightExplanationVi: "Đúng. Cộng đồng hơn cái tôi — chúng ta hỗ trợ nhau.",
    },
    {
      id: "d5s_micro1",
      type: "choice",
      titleEn: "Micro challenge — Fast decision",
      titleVi: "Thử thách — Quyết định nhanh",
      contentEn: "Two members at counter. One is on the phone, one is ready. Who do you serve first?",
      contentVi: "Hai thành viên ở quầy. Một người đang gọi điện, một người sẵn sàng. Bạn phục vụ ai trước?",
      correctChoiceIndex: 1,
      choices: [
        { en: "The one on the phone — they might be in a hurry", vi: "Người đang gọi điện — họ có thể vội" },
        { en: "The one ready — they're present and waiting", vi: "Người sẵn sàng — họ có mặt và đang chờ" },
        { en: "Whoever arrived first", vi: "Ai đến trước" },
      ],
      choiceExplanationsEn: [
        "Why wrong: The one on the phone isn't ready to be served yet. Impact: You may have to repeat or they'll be distracted. Correct: Serve the one who's ready; acknowledge the other ('One sec') so they feel seen.",
        "Correct. Serve the person who's present and ready. Acknowledge the one on the phone so they know they're next. Efficiency and clarity — both feel seen.",
        "If they arrived at the same time, 'who's ready' is the tiebreaker. If one clearly arrived first and is ready, serve them. Correct: Ready + order of arrival when possible.",
      ],
      choiceExplanationsVi: [
        "Sai vì: Người đang gọi chưa sẵn sàng. Đúng: Phục vụ người sẵn sàng; chào người kia.",
        "Đúng. Phục vụ người có mặt và sẵn sàng. Chào người đang gọi để họ biết đến lượt. Hiệu quả và rõ ràng.",
        "Nếu cùng đến, 'ai sẵn sàng' là tiêu chí. Đúng: Sẵn sàng + thứ tự đến khi có thể.",
      ],
    },
    {
      id: "d5s_micro2",
      type: "choice",
      titleEn: "Micro challenge — Multitasking",
      titleVi: "Thử thách — Đa nhiệm",
      contentEn: "You're helping a member. Your teammate signals they need backup. What do you do?",
      contentVi: "Bạn đang giúp một thành viên. Đồng đội ra hiệu cần hỗ trợ. Bạn làm gì?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Acknowledge teammate ('One sec'), finish current member quickly but well, then help", vi: "Chào đồng đội ('Chờ chút'), hoàn tất thành viên hiện tại nhanh nhưng đúng, rồi hỗ trợ" },
        { en: "Leave the member and go help teammate", vi: "Bỏ thành viên và đi giúp đồng đội" },
        { en: "Ignore the signal — finish your member first", vi: "Lờ hiệu — hoàn tất thành viên trước" },
      ],
      choiceExplanationsEn: [
        "Correct. You acknowledge both: teammate knows help is coming; member gets completed service. Then you back up. No one abandoned, chaos managed.",
        "Why wrong: Leaving the member mid-service feels bad. Impact: They feel dropped. Correct: Quick wrap with current member, signal teammate, then go. Both get served.",
        "Why wrong: Ignoring the signal leaves teammate and their members struggling. Impact: Team and members suffer. Correct: Acknowledge signal, finish current interaction, then help. Clear communication.",
      ],
      choiceExplanationsVi: [
        "Đúng. Bạn chào cả hai: đồng đội biết sắp có hỗ trợ; thành viên được phục vụ xong. Rồi bạn hỗ trợ. Không ai bị bỏ rơi.",
        "Sai vì: Bỏ thành viên giữa chừng cảm giác tệ. Đúng: Kết thúc nhanh với thành viên hiện tại, ra hiệu đồng đội, rồi đi.",
        "Sai vì: Lờ hiệu khiến đồng đội và thành viên của họ khó. Đúng: Chào hiệu, hoàn tất lượt hiện tại, rồi giúp.",
      ],
    },
  ],
  scenarios: [
    {
      id: "team_1",
      titleEn: "Busy Moment",
      titleVi: "Lúc bận",
      promptEn: "Three members at counter. One staff. What do you do?",
      promptVi: "Ba thành viên ở quầy. Một staff. Bạn làm gì?",
      hintEn: "Prioritize, acknowledge all, get backup.",
      hintVi: "Ưu tiên, chú ý tất cả, gọi hỗ trợ.",
      perfectAnswerEn: "I'd acknowledge everyone quickly — 'I see you all, one moment' — then get backup from a teammate. No one gets left feeling invisible. I'd stay calm, prioritize, and make sure each person feels seen.",
      perfectAnswerVi: "Tôi chú ý mọi người nhanh — 'Tôi thấy các bạn, chờ chút' — rồi gọi đồng đội hỗ trợ. Không ai cảm thấy bị lơ. Tôi giữ bình tĩnh, ưu tiên, đảm bảo mỗi người được chú ý.",
      rubricEn: ["Acknowledge all", "Get backup", "Stay calm", "No one invisible"],
      rubricVi: ["Chú ý tất cả", "Gọi hỗ trợ", "Bình tĩnh", "Không ai bị lơ"],
    },
    {
      id: "team_2",
      titleEn: "Invisible Work",
      titleVi: "Việc vô hình",
      promptEn: "You notice chalk bags are low. What do you do?",
      promptVi: "Bạn thấy túi phấn sắp hết. Bạn làm gì?",
      hintEn: "Restock or report.",
      hintVi: "Bổ sung hoặc báo.",
      perfectAnswerEn: "I'd restock them or let whoever handles inventory know. Invisible work — cleaning, restocking — is what makes the gym run. If I see it, I own it.",
      perfectAnswerVi: "Tôi sẽ bổ sung hoặc báo người phụ trách kho. Việc vô hình — dọn, bổ sung — là thứ khiến gym chạy. Thấy là xử lý.",
      rubricEn: ["Take action", "Restock or report", "Ownership mindset"],
      rubricVi: ["Hành động", "Bổ sung hoặc báo", "Tư duy làm chủ"],
    },
    {
      id: "team_3",
      titleEn: "Teammate Struggling",
      titleVi: "Đồng đội khó",
      promptEn: "A teammate is overwhelmed. You have capacity. What do you do?",
      promptVi: "Đồng đội quá tải. Bạn còn sức. Bạn làm gì?",
      hintEn: "Offer help.",
      hintVi: "Đề nghị giúp.",
      perfectAnswerEn: "I'd ask: 'Need a hand? I can take [X].' Community over ego — we cover for each other. No one gets left behind.",
      perfectAnswerVi: "Tôi hỏi: 'Cần tôi giúp không? Tôi làm [X] được.' Cộng đồng hơn cái tôi — chúng ta hỗ trợ nhau. Không ai bị bỏ lại.",
      rubricEn: ["Offer help", "Specific offer", "Team mindset"],
      rubricVi: ["Đề nghị giúp", "Đề nghị cụ thể", "Tư duy đội"],
    },
  ],
  simulation: {
    id: "day5_chaos",
    titleEn: "Chaos at the counter",
    titleVi: "Hỗn loạn ở quầy",
    steps: [
      {
        type: "decision",
        id: "step1",
        sceneEn: "Three members at counter: one nervous first-timer, one regular in a hurry, one asking about a birthday party. Your teammate is on the wall. What do you do first?",
        sceneVi: "Ba thành viên ở quầy: một người mới lo lắng, một quen đang vội, một hỏi về tiệc sinh nhật. Đồng đội đang ở tường. Bạn làm gì trước?",
        characters: [
          { id: "ack_all", labelEn: "Acknowledge all, then prioritize", labelVi: "Chú ý tất cả, rồi ưu tiên" },
          { id: "first_only", labelEn: "Serve the first in line only", labelVi: "Chỉ phục vụ người đứng đầu" },
        ],
        promptEn: "Choose the best approach.",
        promptVi: "Chọn cách làm tốt nhất.",
        correctChoiceId: "ack_all",
        options: [
          { id: "ack_all", textEn: "Acknowledge everyone quickly ('I see you all — one moment'), then prioritize: e.g. first-timer needs reassurance, regular is quick check-in", textVi: "Chú ý mọi người nhanh ('Tôi thấy các bạn — chờ chút'), rồi ưu tiên: vd người mới cần động viên, người quen check-in nhanh" },
          { id: "first_only", textEn: "Just serve whoever is first in line; ignore the others until their turn", textVi: "Chỉ phục vụ người đứng trước; lờ những người khác đến lượt" },
        ],
        wrongFeedbackEn: {
          first_only: "Wrong. Ignoring the others makes them feel invisible and can increase frustration. At Leo Mây we acknowledge everyone quickly so no one feels left behind. Then prioritize and get backup if needed. Make the team stronger.",
        },
        wrongFeedbackVi: {
          first_only: "Sai. Lờ những người khác khiến họ cảm thấy vô hình và dễ bực. Ở Leo Mây chúng ta chú ý mọi người nhanh để không ai cảm thấy bị bỏ lại. Rồi ưu tiên và gọi hỗ trợ nếu cần. Làm đội mạnh hơn.",
        },
        correctFeedbackEn: "Correct. Acknowledge everyone quickly so no one feels invisible. Then prioritize (e.g. first-timer needs reassurance; regular is fast). Signal your teammate if you need backup. Stay calm — make the team stronger.",
        correctFeedbackVi: "Đúng. Chú ý mọi người nhanh để không ai cảm thấy vô hình. Rồi ưu tiên (vd người mới cần động viên; người quen nhanh). Ra hiệu đồng đội nếu cần hỗ trợ. Giữ bình tĩnh — làm đội mạnh hơn.",
      },
      {
        type: "decision",
        id: "step2",
        sceneEn: "Your teammate just arrived to help. The first-timer is still nervous. Do you hand off or finish yourself?",
        sceneVi: "Đồng đội vừa đến giúp. Người mới vẫn lo. Bạn chuyển giao hay tự xong?",
        characters: [
          { id: "handoff", labelEn: "Brief handoff, then teammate helps first-timer", labelVi: "Chuyển giao ngắn, đồng đội giúp người mới" },
          { id: "solo", labelEn: "Keep everyone yourself", labelVi: "Tự xử lý hết" },
        ],
        promptEn: "Best approach?",
        promptVi: "Cách tốt nhất?",
        correctChoiceId: "handoff",
        options: [
          { id: "handoff", textEn: "Quick handoff: 'This one's first time — can you walk them through?' Then I take the regular and birthday question", textVi: "Chuyển giao nhanh: 'Bạn này lần đầu — bạn hướng dẫn giúp?' Rồi tôi nhận người quen và câu hỏi tiệc" },
          { id: "solo", textEn: "I'll handle everyone myself so it's consistent", textVi: "Tôi tự xử lý hết cho nhất quán" },
        ],
        wrongFeedbackEn: {
          solo: "Wrong. When backup is there, use it. Trying to do everything alone slows everyone down. Impact: Members wait longer; you burn out. Correct: Brief handoff so teammate takes first-timer (needs more time); you take the quicker ones. Team coordination.",
        },
        wrongFeedbackVi: {
          solo: "Sai. Khi có hỗ trợ, dùng nó. Cố làm hết một mình làm mọi người chờ lâu. Đúng: Chuyển giao ngắn để đồng đội phụ trách người mới; bạn xử lý những người nhanh hơn.",
        },
        correctFeedbackEn: "Correct. Use the team. Brief handoff so the first-timer gets proper attention; you clear the queue faster. That's teamwork.",
        correctFeedbackVi: "Đúng. Dùng đội. Chuyển giao ngắn để người mới được chú ý đúng; bạn xử lý hàng nhanh hơn. Đó là làm việc đội.",
      },
      {
        type: "decision",
        id: "step3",
        sceneEn: "The birthday question is complex (group booking). You're not sure of the details. What do you say?",
        sceneVi: "Câu hỏi tiệc sinh nhật phức tạp (đặt nhóm). Bạn không chắc chi tiết. Bạn nói gì?",
        characters: [
          { id: "find", labelEn: "Find someone who knows or get info", labelVi: "Tìm người biết hoặc lấy thông tin" },
          { id: "guess", labelEn: "Guess and give a quick answer", labelVi: "Đoán và trả lời nhanh" },
        ],
        promptEn: "What do you do?",
        promptVi: "Bạn làm gì?",
        correctChoiceId: "find",
        options: [
          { id: "find", textEn: "I'll get you the right info — one sec (check with lead or system)", textVi: "Tôi lấy thông tin đúng cho bạn — chờ chút (hỏi lead hoặc hệ thống)" },
          { id: "guess", textEn: "I think it's X — just book it", textVi: "Tôi nghĩ là X — cứ đặt đi" },
        ],
        wrongFeedbackEn: {
          guess: "Wrong. Guessing on bookings can cause errors and member frustration. Impact: Wrong info, double bookings, or lost trust. Correct: Get the right info — 'One sec, I'll confirm' — then give an accurate answer. Clarity over speed when it matters.",
        },
        wrongFeedbackVi: {
          guess: "Sai. Đoán khi đặt có thể gây sai sót và bực cho thành viên. Đúng: Lấy thông tin đúng — 'Chờ chút, tôi xác nhận' — rồi trả lời chính xác.",
        },
        correctFeedbackEn: "Correct. Don't guess on important details. Get the right info and give a clear answer. That's professional.",
        correctFeedbackVi: "Đúng. Đừng đoán với chi tiết quan trọng. Lấy thông tin đúng và trả lời rõ. Đó là chuyên nghiệp.",
      },
    ],
    resultGood: {
      titleEn: "Peak hour completed",
      titleVi: "Hoàn thành giờ cao điểm",
      strengthsEn: ["Prioritization", "Communication", "Team coordination"],
      strengthsVi: ["Ưu tiên", "Giao tiếp", "Phối hợp đội"],
      xpReward: 120,
      skillDeltas: { communication: 8, teamwork: 10 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Missed prioritization", "Weak communication tone", "Members felt invisible or rushed"],
      keyIssuesVi: ["Bỏ lỡ ưu tiên", "Giọng giao tiếp yếu", "Thành viên cảm thấy vô hình hoặc bị vội"],
      focusEn: ["→ Acknowledge first", "→ Stay proactive", "→ Keep Leo Mây energy"],
      focusVi: ["→ Chú ý trước", "→ Chủ động", "→ Giữ năng lượng Leo Mây"],
    },
  },
  quiz: [
    {
      id: "q1",
      questionEn: "In a busy gym, you should:",
      questionVi: "Khi gym đông, bạn nên:",
      options: [{ en: "Panic", vi: "Hoảng" }, { en: "Stay calm, prioritize, communicate", vi: "Bình tĩnh, ưu tiên, giao tiếp" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Panic spreads. If you panic, members and teammates feel it and things get worse. When it’s busy, the best thing you can do is stay calm so you can think clearly, prioritize (who needs help first), and communicate with the team so everyone is aligned.",
        "Correct. When it’s busy: (1) Stay calm — you’re the one who can think. (2) Prioritize — who’s waiting longest, who’s in danger, what’s most urgent. (3) Communicate — tell your teammates what you’re doing, ask for backup, so no one is left behind. Example: 'I’ve got the counter — can you help the person at the wall?'",
      ],
      explanationsVi: [
        "Sai. Hoảng lan truyền. Nếu bạn hoảng, thành viên và đồng đội cảm nhận và mọi thứ tệ hơn. Khi đông, điều tốt nhất bạn làm là giữ bình tĩnh để suy nghĩ rõ, ưu tiên (ai cần giúp trước) và giao tiếp với đội để mọi người cùng hướng.",
        "Đúng. Khi đông: (1) Bình tĩnh — bạn là người có thể suy nghĩ. (2) Ưu tiên — ai chờ lâu nhất, ai gặp rủi ro, gì gấp nhất. (3) Giao tiếp — nói với đồng đội bạn đang làm gì, xin hỗ trợ để không ai bị bỏ lại. Ví dụ: 'Tôi lo quầy — bạn giúp người ở tường được không?'",
      ],
    },
    {
      id: "q2",
      questionEn: "Invisible work is:",
      questionVi: "Việc vô hình là:",
      options: [{ en: "Unimportant", vi: "Không quan trọng" }, { en: "Cleaning, restocking, helping without being asked", vi: "Dọn, bổ sung, giúp không cần hỏi" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Invisible work is very important — it’s what keeps the gym running and the experience good. If no one cleaned, restocked, or helped without being asked, the place would fall apart. We just call it 'invisible' because members don’t always see it; they feel the result.",
        "Correct. Invisible work is the stuff that keeps the gym safe, tidy, and ready: cleaning (floors, spill, chalk), restocking (chalk, gear), and helping without being asked (noticing what’s needed and doing it). It’s excellence because you’re not waiting to be told — you see it and own it.",
      ],
      explanationsVi: [
        "Sai. Việc vô hình rất quan trọng — nó giữ gym chạy và trải nghiệm tốt. Nếu không ai dọn, bổ sung hay giúp không cần hỏi, mọi thứ sẽ rối. Chúng ta gọi 'vô hình' vì thành viên không luôn thấy; họ cảm nhận kết quả.",
        "Đúng. Việc vô hình là thứ giữ gym an toàn, gọn gàng và sẵn sàng: dọn (sàn, nước đổ, phấn), bổ sung (phấn, đồ) và giúp không cần hỏi (để ý cần gì và làm). Đó là xuất sắc vì bạn không chờ được bảo — bạn thấy và xử lý.",
      ],
    },
    {
      id: "q3",
      questionEn: "Great means:",
      questionVi: "Tuyệt có nghĩa:",
      options: [{ en: "Minimum effort", vi: "Nỗ lực tối thiểu" }, { en: "Proactive, make everyone's job easier", vi: "Chủ động, làm việc mọi người dễ hơn" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Minimum effort is 'good enough' — it’s not great. Great is when you go beyond the minimum: you’re proactive (you see what’s needed before being asked), and you make everyone’s job easier (you help the team, not just your own task).",
        "Correct. Great means proactive and making everyone’s job easier. You don’t wait for instructions — you notice what’s needed (e.g. chalk low, member confused) and act. You also help teammates so the whole team runs smoothly. That’s the Leo Mây standard for excellence.",
      ],
      explanationsVi: [
        "Sai. Nỗ lực tối thiểu là 'đủ dùng' — không phải tuyệt. Tuyệt là khi bạn vượt tối thiểu: chủ động (bạn thấy cần gì trước khi được hỏi) và làm việc của mọi người dễ hơn (bạn giúp đội, không chỉ việc của mình).",
        "Đúng. Tuyệt nghĩa là chủ động và làm việc mọi người dễ hơn. Bạn không chờ chỉ thị — bạn để ý cần gì (vd phấn sắp hết, thành viên bối rối) và hành động. Bạn cũng giúp đồng đội để cả đội chạy trơn. Đó là chuẩn xuất sắc Leo Mây.",
      ],
    },
    {
      id: "q4",
      questionEn: "If you see a teammate overwhelmed:",
      questionVi: "Nếu thấy đồng đội quá tải:",
      options: [{ en: "Ignore", vi: "Lờ đi" }, { en: "Offer help", vi: "Đề nghị giúp" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Think how your teammate feels: they’re overwhelmed. If you ignore it, they may burn out, make mistakes, or members get worse service. We’re a team — community over ego. When you have capacity and they don’t, offering help is the right thing. Example: 'Need a hand? I can take the next check-in.'",
        "Correct. If you see a teammate overwhelmed and you have capacity, offer help. Be specific: 'I can take the next member' or 'I’ll restock the chalk.' Don’t wait to be asked. That’s how we cover for each other and make sure no one — teammate or member — is left behind.",
      ],
      explanationsVi: [
        "Sai. Hãy nghĩ đồng đội cảm thấy thế nào: họ quá tải. Nếu bạn lờ đi, họ có thể kiệt sức, sai sót hoặc thành viên bị phục vụ kém. Chúng ta là đội — cộng đồng hơn cái tôi. Khi bạn còn sức và họ không, đề nghị giúp là đúng. Ví dụ: 'Cần tôi giúp không? Tôi nhận check-in tiếp theo.'",
        "Đúng. Nếu thấy đồng đội quá tải và bạn còn sức, đề nghị giúp. Cụ thể: 'Tôi nhận thành viên tiếp' hoặc 'Tôi bổ sung phấn.' Đừng chờ được nhờ. Đó là cách chúng ta hỗ trợ nhau và đảm bảo không ai — đồng đội hay thành viên — bị bỏ lại.",
      ],
    },
    {
      id: "q5",
      questionEn: "Ownership means:",
      questionVi: "Làm chủ có nghĩa:",
      options: [{ en: "Pass the buck", vi: "Đùn đẩy" }, { en: "If you see it, you own it", vi: "Thấy là xử lý" }],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Passing the buck (blaming others or waiting for someone else to fix it) is the opposite of ownership. If you see a problem and push it to someone else without taking action, the problem often stays. Ownership means you take responsibility when you notice something.",
        "Correct. Ownership means if you see it, you own it: you don’t pass the buck. Whether it’s a spill, a confused member, or a teammate who needs help — you take responsibility. You fix it, delegate it clearly, or get the right person, but you don’t ignore it or assume someone else will handle it.",
      ],
      explanationsVi: [
        "Sai. Đùn đẩy (đổ lỗi hay chờ người khác xử lý) là ngược với làm chủ. Nếu bạn thấy vấn đề và đẩy cho người khác mà không hành động, vấn đề thường vẫn đó. Làm chủ nghĩa là bạn chịu trách nhiệm khi bạn nhận ra.",
        "Đúng. Làm chủ nghĩa là thấy là xử lý: bạn không đùn đẩy. Dù là nước đổ, thành viên bối rối hay đồng đội cần giúp — bạn chịu trách nhiệm. Bạn sửa, giao rõ ràng hoặc tìm đúng người, nhưng không lờ đi hay cho rằng ai đó sẽ xử lý.",
      ],
    },
  ],
  reflection: { id: "r5", promptEn: "What does excellence look like for you?", promptVi: "Xuất sắc trông như thế nào với bạn?" },
  hardModeScenarios: [
    {
      id: "hard_chaos",
      titleEn: "Hard: Chaos moment",
      titleVi: "Khó: Khoảnh khắc hỗn loạn",
      promptEn: "Three members need help at once. One is mid-climb and confused. One is at the counter. One is looking lost. In one sentence, what do you do first?",
      promptVi: "Ba thành viên cần giúp cùng lúc. Một đang leo và bối rối. Một ở quầy. Một trông lạc. Trong một câu, bạn làm gì trước?",
      hintEn: "Prioritize safety (climber), then acknowledge the others. One sentence: acknowledge all, then act.",
      hintVi: "Ưu tiên an toàn (người leo), rồi chào những người còn lại. Một câu: chào tất cả, rồi hành động.",
      perfectAnswerEn: "I'd make eye contact with the climber first to check they're okay, call 'One sec!' to the counter and the lost member, then help the climber or signal a teammate — safety and acknowledgment first, then we sort the rest.",
      perfectAnswerVi: "Tôi sẽ giao tiếp mắt với người leo trước để xem họ ổn không, gọi 'Chờ chút!' với quầy và người lạc, rồi giúp người leo hoặc ra hiệu đồng đội — an toàn và chào trước, rồi xử lý phần còn lại.",
      rubricEn: ["Safety first", "Acknowledge everyone", "Then prioritize"],
      rubricVi: ["An toàn trước", "Chào mọi người", "Rồi ưu tiên"],
      goodKeywords: ["first", "eye", "one sec", "safety", "trước", "chờ", "an toàn"],
      badKeywords: [],
    },
  ],
  advancedLessons: [
    {
      id: "d5_adv_1",
      type: "text",
      titleEn: "Advanced: Team coordination",
      titleVi: "Nâng cao: Phối hợp đội",
      contentEn: "When it's busy: signal, don't shout. Catch a teammate's eye, point subtly, or use a quick hand sign. 'You take counter, I've got the floor.' Clear and calm.",
      contentVi: "Khi đông: ra hiệu, đừng hét. Bắt mắt đồng đội, chỉ nhẹ hoặc dùng ký hiệu tay. 'Bạn nhận quầy, tôi lo sàn.' Rõ ràng và bình tĩnh.",
    },
  ],
};

// ========== DAY 6 — NEWBIE EXPERIENCE MASTERY ==========
/** Mandatory flow: spot & approach → greeting → identify first-timer → set expectations → check-in → pass → shoes → locker → walkthrough → explain bouldering → grading → first climb → encouragement → transition → follow-up. */
const NEWBIE_FLOW_STEPS_EN = [
  "Spot & approach (within 3–5 seconds)",
  "Greeting",
  "Identify first-timer",
  "Set expectations",
  "Check-in guidance",
  "Pass recommendation (simplify choice)",
  "Shoe recommendation (rental first for beginners)",
  "Locker / belongings guidance",
  "Physical walkthrough of gym",
  "Explain bouldering (simple)",
  "Explain grading system (simple, no jargon)",
  "First climb guidance (stay with them)",
  "Encouragement (positive reinforcement)",
  "Transition (let them explore)",
  "Follow-up check-in (after ~5–10 min)",
];
const NEWBIE_FLOW_STEPS_VI = [
  "Chú ý & tiếp cận (trong 3–5 giây)",
  "Chào hỏi",
  "Nhận diện người lần đầu",
  "Đặt kỳ vọng",
  "Hướng dẫn check-in",
  "Gợi ý gói (đơn giản hóa lựa chọn)",
  "Gợi ý giày (thuê trước cho người mới)",
  "Hướng dẫn tủ/đồ đạc",
  "Đi tour gym",
  "Giải thích bouldering (đơn giản)",
  "Giải thích hệ thống grade (đơn giản, không thuật ngữ)",
  "Hướng dẫn leo lần đầu (ở bên họ)",
  "Động viên (củng cố tích cực)",
  "Chuyển giao (để họ khám phá)",
  "Check-in theo dõi (sau ~5–10 phút)",
];

export const DAY6: DayContent = {
  day: 6,
  titleEn: "Newbie Experience Mastery",
  titleVi: "Làm chủ trải nghiệm người mới",
  keyTakeawayEn: "You are not checking people in — you are creating their first climbing memory.",
  keyTakeawayVi: "Bạn không chỉ check-in — bạn đang tạo ký ức leo núi đầu tiên của họ.",
  sections: [
    {
      id: "d6s0_hook",
      type: "choice",
      titleEn: "Opening — First-timer walks in",
      titleVi: "Mở đầu — Người lần đầu bước vào",
      contentEn: "A first-timer walks in. They look around nervously. What do you do in the first 3–5 seconds?",
      contentVi: "Người lần đầu bước vào. Họ nhìn quanh lo lắng. Bạn làm gì trong 3–5 giây đầu?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Spot them, make eye contact, and walk toward them within 3–5 seconds", vi: "Chú ý họ, giao tiếp mắt và bước về phía họ trong 3–5 giây" },
        { en: "Wait for them to come to the counter", vi: "Chờ họ đến quầy" },
        { en: "Point and say 'Sign in over there'", vi: "Chỉ tay và nói 'Đăng ký ở đằng kia'" },
      ],
      choiceExplanationsEn: [
        "Correct. Spot & approach within 3–5 seconds. Newbies feel lost; being seen and met builds trust. What to say: 'Hi! First time? I got you — I'll walk you through everything.'",
        "Wrong. Waiting makes them feel invisible. Impact: anxiety, drop-off. Do: approach quickly, greet, identify first-timer. Never leave a newbie standing alone.",
        "Wrong. Never point directions ('over there'). Impact: confusion, discomfort. Do: walk them, don't direct. Say: 'I'll walk you through everything.'",
      ],
      choiceExplanationsVi: [
        "Đúng. Chú ý và tiếp cận trong 3–5 giây. Người mới cảm thấy lạc; được thấy và được đón tạo tin tưởng. Nói: 'Chào! Lần đầu à? Tôi hướng dẫn bạn từng bước.'",
        "Sai. Chờ khiến họ cảm thấy vô hình. Đúng: tiếp cận nhanh, chào, nhận diện lần đầu.",
        "Sai. Đừng chỉ hướng ('ở đằng kia'). Đúng: dẫn họ đi, không chỉ. Nói: 'Tôi sẽ hướng dẫn bạn từng bước.'",
      ],
    },
    {
      id: "d6s1_list",
      type: "list",
      titleEn: "The 15-step newbie flow",
      titleVi: "Quy trình 15 bước cho người mới",
      contentEn: "This order is mandatory. Skipping steps causes confusion and a worse first experience.",
      contentVi: "Thứ tự này bắt buộc. Bỏ bước gây bối rối và trải nghiệm đầu tệ hơn.",
      items: NEWBIE_FLOW_STEPS_EN.map((s, i) => ({ en: s, vi: NEWBIE_FLOW_STEPS_VI[i] ?? s })),
    },
    {
      id: "d6s2_reorder",
      type: "reorder_steps",
      titleEn: "Put the newbie flow in order",
      titleVi: "Sắp xếp đúng quy trình người mới",
      contentEn: "Drag to reorder. Correct order: spot → greet → identify first-timer → set expectations → check-in → pass → shoes → locker → walkthrough → bouldering → grading → first climb → encouragement → transition → follow-up.",
      contentVi: "Kéo để sắp xếp. Đúng: chú ý → chào → nhận diện lần đầu → kỳ vọng → check-in → gói → giày → tủ → tour → bouldering → grade → leo lần đầu → động viên → chuyển giao → check-in theo dõi.",
      stepsOrderEn: NEWBIE_FLOW_STEPS_EN,
      stepsOrderVi: NEWBIE_FLOW_STEPS_VI,
    },
    {
      id: "d6s3_choose_better",
      type: "choose_better",
      titleEn: "Pass recommendation",
      titleVi: "Gợi ý gói",
      contentEn: "First-timer asks: What should I buy? What do you say?",
      contentVi: "Người lần đầu hỏi: Tôi nên mua gì? Bạn nói gì?",
      options: [
        { en: "We have day pass, 5-visit, monthly — here's the price list", vi: "Chúng tôi có vé ngày, 5 lần, tháng — đây là bảng giá" },
        { en: "For your first time, I recommend the day pass — try it, then we can find what fits you", vi: "Lần đầu tôi gợi ý vé ngày — thử đã, rồi mình tìm gói phù hợp" },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Wrong. Overwhelming with pricing early causes confusion. What NOT to do: push purchases, list everything. Do: simplify — 'For your first time, I recommend [X].' Then guide.",
      wrongExplanationVi: "Sai. Dồn giá sớm gây rối. Đúng: đơn giản — 'Lần đầu tôi gợi ý [X].' Rồi hướng dẫn.",
      rightExplanationEn: "Correct. Simplify choice. Say: 'For your first time, I recommend the day pass.' Why: reduces overwhelm, builds trust.",
      rightExplanationVi: "Đúng. Đơn giản hóa lựa chọn. Nói: 'Lần đầu tôi gợi ý vé ngày.' Vì: giảm quá tải, tạo tin tưởng.",
    },
    {
      id: "d6s4_fix",
      type: "fix_sentence",
      titleEn: "Fix the sentence",
      titleVi: "Sửa câu",
      contentEn: "Staff says: 'Just go over there and get your shoes.' What's wrong? What to say instead?",
      contentVi: "Nhân viên nói: 'Cứ đi ra đó lấy giày đi.' Sai ở đâu? Nên nói gì?",
      wrongSentenceEn: "Just go over there and get your shoes.",
      wrongSentenceVi: "Cứ đi ra đó lấy giày đi.",
      options: [
        { en: "Just go over there and get your shoes.", vi: "Cứ đi ra đó lấy giày đi." },
        { en: "For your first time, I recommend rental shoes first. I'll walk you to the rental area.", vi: "Lần đầu tôi gợi ý thuê giày. Tôi dẫn bạn đến chỗ thuê." },
      ],
      correctIndex: 1,
      wrongExplanationEn: "Never point 'over there.' Newbie doesn't know where. Impact: confusion, anxiety. Say: 'I'll show you where the rental shoes are — come with me.' Or: 'For your first time, I recommend rental shoes first.'",
      wrongExplanationVi: "Đừng chỉ 'ra đó.' Người mới không biết đâu. Nói: 'Tôi chỉ chỗ giày thuê — đi với tôi.' Hoặc: 'Lần đầu tôi gợi ý thuê giày trước.'",
      rightExplanationEn: "Correct. Walk them. Say: 'For your first time, I recommend rental shoes first. I'll walk you to the rental area.'",
      rightExplanationVi: "Đúng. Dẫn họ. Nói: 'Lần đầu tôi gợi ý thuê giày. Tôi dẫn bạn đến chỗ thuê.'",
    },
    {
      id: "d6s5_tap",
      type: "tap_mistake",
      titleEn: "Spot the mistake",
      titleVi: "Tìm lỗi",
      contentEn: "Tap the wrong phrase in this paragraph.",
      contentVi: "Chạm vào cụm từ sai trong đoạn này.",
      paragraphEn: "When a first-timer arrives, greet them quickly and say: 'I got you — I'll walk you through everything.' Then recommend the day pass and rental shoes. Do not say: 'The prices are over there' or ignore nervous behavior.",
      paragraphVi: "Khi người lần đầu đến, chào nhanh và nói: 'Tôi hướng dẫn bạn từng bước.' Rồi gợi ý vé ngày và giày thuê. Không nói: 'Bảng giá ở đằng kia' hoặc lờ hành vi lo lắng.",
      wrongPhraseEn: "The prices are over there",
      wrongPhraseVi: "Bảng giá ở đằng kia",
      tapMistakeExplanationEn: "Wrong. Never point directions. What to do: walk them, explain simply. 'Let me show you our options' — then guide. Impact of pointing: newbie feels lost, may leave.",
      tapMistakeExplanationVi: "Sai. Đừng chỉ hướng. Đúng: dẫn họ, giải thích đơn giản. 'Để tôi giới thiệu các gói' — rồi hướng dẫn.",
    },
    {
      id: "d6s6_choice",
      type: "choice",
      titleEn: "First climb — they hesitate",
      titleVi: "Leo lần đầu — họ do dự",
      contentEn: "You've explained bouldering and grading. They stand at the wall, not sure which hold to try. What do you do?",
      contentVi: "Bạn đã giải thích bouldering và grade. Họ đứng ở tường, không biết bám hold nào. Bạn làm gì?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Stay with them: 'Try this one — put your foot here. I'll stay right here.'", vi: "Ở bên họ: 'Thử cái này — đặt chân đây. Tôi đứng ngay đây.'" },
        { en: "Point to a route: 'That one's easy. Go.'", vi: "Chỉ vào route: 'Cái đó dễ. Leo đi.'" },
        { en: "Leave them to explore", vi: "Để họ tự khám phá" },
      ],
      choiceExplanationsEn: [
        "Correct. First climb guidance: stay with them. Encouragement, simple cues. What to say: 'I got you. Try this one.' Then transition only after they've had a success.",
        "Wrong. Pointing without staying = they feel abandoned. Impact: fear, no second visit. Do: stay, encourage, then transition when they're confident.",
        "Wrong. Too early to leave. Impact: confusion, no attempt or bad fall. Do: stay for first climb, positive reinforcement, then 'I'll be around — explore, and I'll check in in a few minutes.'",
      ],
      choiceExplanationsVi: [
        "Đúng. Hướng dẫn leo lần đầu: ở bên họ. Động viên, gợi ý đơn giản. Nói: 'Tôi ở đây. Thử cái này.' Chuyển giao chỉ sau khi họ thành công.",
        "Sai. Chỉ rồi đi = họ cảm thấy bị bỏ rơi. Đúng: ở lại, động viên, rồi chuyển giao khi họ tự tin.",
        "Sai. Chưa đến lúc đi. Đúng: ở lại cho lần leo đầu, củng cố tích cực, rồi 'Tôi ở quanh đây — bạn khám phá, vài phút nữa tôi check lại.'",
      ],
    },
    {
      id: "d6s7_micro",
      type: "choice",
      titleEn: "Micro challenge — 2-second reaction",
      titleVi: "Thử thách — Phản ứng 2 giây",
      contentEn: "Newbie is fidgeting at the counter. You're with another member. What do you do?",
      contentVi: "Người mới đứng ở quầy lo lắng. Bạn đang phục vụ thành viên khác. Bạn làm gì?",
      correctChoiceIndex: 0,
      choices: [
        { en: "Make eye contact, smile, say 'One sec — I'll be right with you'", vi: "Giao tiếp mắt, cười, nói 'Chờ chút — tôi tới ngay'" },
        { en: "Ignore until you finish the current member", vi: "Lờ đi đến khi xong thành viên hiện tại" },
        { en: "Wave them to the side", vi: "Vẫy họ ra xa" },
      ],
      choiceExplanationsEn: [
        "Correct. Quick acknowledgment reduces anxiety. Never ignore nervous behavior. Then serve in order but keep them seen.",
        "Wrong. Ignoring nervous behavior increases anxiety. Impact: they may leave. Always acknowledge within seconds.",
        "Wrong. Waving away feels dismissive. Say: 'One sec' and smile. They need to feel welcomed.",
      ],
      choiceExplanationsVi: [
        "Đúng. Chào nhanh giảm lo. Đừng lờ hành vi lo lắng.",
        "Sai. Lờ hành vi lo lắng làm tăng lo. Luôn chào trong vài giây.",
        "Sai. Vẫy đi cảm giác lạnh nhạt. Nói 'Chờ chút' và cười.",
      ],
    },
    {
      id: "d6s8_goodvsbad",
      type: "goodvsbad",
      titleEn: "What to say vs what not to say",
      titleVi: "Nên nói vs không nên nói",
      contentEn: "Newbie experience: correct behavior builds confidence; wrong behavior causes drop-off.",
      contentVi: "Trải nghiệm người mới: hành vi đúng xây tự tin; sai gây bỏ cuộc.",
      bad: { en: "Over there / Here's the price list / Go try that", vi: "Ở đằng kia / Đây bảng giá / Leo cái đó đi" },
      good: { en: "I got you — I'll walk you through everything / For your first time I recommend rental shoes / I'll stay right here", vi: "Tôi hướng dẫn bạn từng bước / Lần đầu tôi gợi ý thuê giày / Tôi đứng ngay đây" },
    },
  ],
  scenarios: [
    {
      id: "d6_nervous",
      titleEn: "Nervous beginner",
      titleVi: "Người mới lo lắng",
      promptEn: "A first-timer says: 'I've never done this. I'm scared I'll fall.' How do you respond?",
      promptVi: "Người lần đầu nói: 'Tôi chưa leo bao giờ. Tôi sợ ngã.' Bạn trả lời thế nào?",
      hintEn: "Acknowledge fear, normalize, reassure, offer to stay with them.",
      hintVi: "Chấp nhận nỗi sợ, bình thường hóa, trấn an, đề nghị ở bên họ.",
      perfectAnswerEn: "I'd say: 'That's totally normal — everyone feels that at first. I got you — I'll walk you through everything. We'll start with something low and easy, and I'll stay right here. You're safe.' Friendliness, clarity, emotional reassurance, Leo Mây tone.",
      perfectAnswerVi: "Tôi nói: 'Bình thường thôi — ai cũng vậy lần đầu. Tôi hướng dẫn bạn từng bước. Mình bắt đầu với bài thấp và dễ, tôi đứng ngay đây. Bạn an toàn.' Thân thiện, rõ ràng, trấn an, giọng Leo Mây.",
      rubricEn: ["Acknowledge fear", "Normalize", "Reassure", "Offer to stay", "Leo Mây tone"],
      rubricVi: ["Chấp nhận sợ", "Bình thường hóa", "Trấn an", "Đề nghị ở bên", "Giọng Leo Mây"],
    },
    {
      id: "d6_confused",
      titleEn: "Confused member",
      titleVi: "Thành viên bối rối",
      promptEn: "A first-timer finished check-in but is standing in the gym looking lost. What do you do?",
      promptVi: "Người lần đầu đã check-in xong nhưng đứng trong gym trông lạc. Bạn làm gì?",
      hintEn: "Walk them through: shoes, locker, quick tour, explain bouldering simply.",
      hintVi: "Dẫn họ: giày, tủ, tour nhanh, giải thích bouldering đơn giản.",
      perfectAnswerEn: "I'd approach and say: 'First time? I'll walk you through — we'll get your shoes, I'll show you the gym and explain how bouldering works in one minute. Come with me.' Then do the full flow: locker, walkthrough, bouldering explanation, grading, first climb. Clarity and presence.",
      perfectAnswerVi: "Tôi tiếp cận và nói: 'Lần đầu à? Tôi dẫn bạn — lấy giày, tôi chỉ tour gym và giải thích bouldering trong một phút. Đi với tôi.' Rồi làm đủ: tủ, tour, giải thích bouldering, grade, leo lần đầu. Rõ ràng và có mặt.",
      rubricEn: ["Approach", "Walk them", "Full flow", "Clarity"],
      rubricVi: ["Tiếp cận", "Dẫn họ", "Đủ quy trình", "Rõ ràng"],
    },
    {
      id: "d6_overwhelmed",
      titleEn: "Overwhelmed first-timer",
      titleVi: "Người lần đầu quá tải",
      promptEn: "They say: 'There's so much going on. I don't know where to start.' How do you respond?",
      promptVi: "Họ nói: 'Nhiều thứ quá. Tôi không biết bắt đầu từ đâu.' Bạn trả lời thế nào?",
      hintEn: "Simplify. One thing at a time. Set expectations.",
      hintVi: "Đơn giản hóa. Từng bước một. Đặt kỳ vọng.",
      perfectAnswerEn: "I'd say: 'I got you — we'll do one thing at a time. First: get you in and comfortable. Then I'll show you the gym and we'll do your first climb together. No rush.' Set expectations, reduce overwhelm, emotional reassurance.",
      perfectAnswerVi: "Tôi nói: 'Tôi hướng dẫn bạn — từng bước một. Trước: vào và ổn định. Rồi tôi chỉ gym và mình leo lần đầu cùng nhau. Không vội.' Đặt kỳ vọng, giảm quá tải, trấn an.",
      rubricEn: ["Simplify", "One at a time", "Set expectations", "Reassure"],
      rubricVi: ["Đơn giản", "Từng bước", "Đặt kỳ vọng", "Trấn an"],
    },
    {
      id: "d6_hesitation",
      titleEn: "First climb hesitation",
      titleVi: "Do dự leo lần đầu",
      promptEn: "They're at the wall. They say: 'Which one do I try? What if I fall?' What do you say?",
      promptVi: "Họ ở tường. Họ nói: 'Tôi thử bài nào? Nếu tôi ngã thì sao?' Bạn nói gì?",
      hintEn: "Stay with them. Point to one easy route. Reassure about falls (mat, low).",
      hintVi: "Ở bên họ. Chỉ một bài dễ. Trấn an về ngã (thảm, thấp).",
      perfectAnswerEn: "I'd say: 'Try this one — it's low and friendly. I'll stay right here. If you fall, you land on the mat — we're built for that. Put your foot here, then reach for that hold.' Stay with them, simple cue, encouragement, safety reassurance.",
      perfectAnswerVi: "Tôi nói: 'Thử bài này — thấp và dễ. Tôi đứng ngay đây. Nếu bạn ngã, bạn rơi xuống thảm — chúng ta thiết kế cho điều đó. Đặt chân đây, rồi với tay tới hold kia.' Ở bên, gợi ý đơn giản, động viên, trấn an an toàn.",
      rubricEn: ["Stay with them", "One route", "Safety reassurance", "Encouragement"],
      rubricVi: ["Ở bên", "Một bài", "Trấn an an toàn", "Động viên"],
    },
  ],
  simulation: {
    id: "day6_newbie_journey",
    titleEn: "Full newbie journey",
    titleVi: "Hành trình người mới đầy đủ",
    steps: [
      {
        type: "decision",
        id: "d6s1",
        sceneEn: "A first-timer just walked in. They're looking around. What do you do first?",
        sceneVi: "Người lần đầu vừa bước vào. Họ nhìn quanh. Bạn làm gì trước?",
        characters: [
          { id: "approach", labelEn: "Spot and approach within 3–5 seconds", labelVi: "Chú ý và tiếp cận trong 3–5 giây" },
          { id: "wait", labelEn: "Wait for them at the counter", labelVi: "Chờ họ ở quầy" },
        ],
        promptEn: "Choose the best approach.",
        promptVi: "Chọn cách tốt nhất.",
        correctChoiceId: "approach",
        options: [
          { id: "approach", textEn: "Make eye contact and walk toward them: 'Hi! First time? I got you — I'll walk you through everything.'", textVi: "Giao tiếp mắt và bước tới: 'Chào! Lần đầu à? Tôi hướng dẫn bạn từng bước.'" },
          { id: "wait", textEn: "Stay at the counter and wait for them to come over", textVi: "Đứng ở quầy chờ họ tới" },
        ],
        wrongFeedbackEn: { wait: "Wrong. Skipping spot & approach causes newbies to feel invisible. In real life: they may leave or feel anxious. Correct: approach within 3–5 seconds, greet, identify first-timer." },
        wrongFeedbackVi: { wait: "Sai. Bỏ qua tiếp cận khiến người mới cảm thấy vô hình. Đúng: tiếp cận trong 3–5 giây, chào, nhận diện lần đầu." },
        correctFeedbackEn: "Correct. Spot & approach first. Then greeting and identify first-timer. This order is mandatory.",
        correctFeedbackVi: "Đúng. Chú ý và tiếp cận trước. Rồi chào và nhận diện lần đầu. Thứ tự này bắt buộc.",
      },
      {
        type: "decision",
        id: "d6s2",
        sceneEn: "They said it's their first time. What do you recommend for pass and shoes?",
        sceneVi: "Họ nói đây là lần đầu. Bạn gợi ý gói và giày thế nào?",
        characters: [
          { id: "simple", labelEn: "Simplify: day pass + rental shoes", labelVi: "Đơn giản: vé ngày + giày thuê" },
          { id: "list", labelEn: "Give full price list and let them choose", labelVi: "Đưa full bảng giá để họ chọn" },
        ],
        promptEn: "Best approach?",
        promptVi: "Cách tốt nhất?",
        correctChoiceId: "simple",
        options: [
          { id: "simple", textEn: "For your first time, I recommend the day pass and rental shoes first. Try it, then we can find what fits you.", textVi: "Lần đầu tôi gợi ý vé ngày và thuê giày trước. Thử đã, rồi mình tìm gói phù hợp." },
          { id: "list", textEn: "Here's our price list — day pass, 5-visit, monthly, shoes...", textVi: "Đây bảng giá — vé ngày, 5 lần, tháng, giày..." },
        ],
        wrongFeedbackEn: { list: "Wrong. Overwhelming with pricing early causes confusion. What NOT to do: push purchases, list everything. Correct: simplify — day pass and rental first." },
        wrongFeedbackVi: { list: "Sai. Dồn giá sớm gây rối. Đúng: đơn giản — vé ngày và thuê giày trước." },
        correctFeedbackEn: "Correct. Pass recommendation: simplify. Shoe recommendation: rental first for beginners. Then locker and walkthrough.",
        correctFeedbackVi: "Đúng. Gợi ý gói: đơn giản. Gợi ý giày: thuê trước. Rồi tủ và tour.",
      },
      {
        type: "ai_response",
        id: "d6s3",
        sceneEn: "You're walking them through the gym. They ask: 'How does this work? What do I do?'",
        sceneVi: "Bạn đang dẫn họ tour gym. Họ hỏi: 'Cái này hoạt động thế nào? Tôi làm gì?'",
        characters: [{ id: "newbie", labelEn: "First-timer", labelVi: "Người lần đầu" }],
        promptEn: "Explain bouldering simply (no jargon). What do you say?",
        promptVi: "Giải thích bouldering đơn giản (không thuật ngữ). Bạn nói gì?",
        hintEn: "Simple: no ropes, climb up, fall on mat. Colours/grades = difficulty. Stay with them.",
        hintVi: "Đơn giản: không dây, leo lên, ngã xuống thảm. Màu/grade = độ khó. Ở bên họ.",
        perfectAnswerEn: "Bouldering here means you climb without ropes — you go up, and when you're done you land on the mat. Each colour is a different route — we'll start with an easy one. I'll stay right here and you can try. No jargon.",
        perfectAnswerVi: "Bouldering ở đây là leo không dây — bạn leo lên, xong thì xuống thảm. Mỗi màu là một bài — mình bắt đầu với bài dễ. Tôi đứng đây, bạn thử. Không thuật ngữ.",
        rubricEn: ["Simple", "No jargon", "Stay with them", "One route to start"],
        rubricVi: ["Đơn giản", "Không thuật ngữ", "Ở bên họ", "Một bài để bắt đầu"],
      },
      {
        type: "decision",
        id: "d6s4",
        sceneEn: "They're at the wall, hesitating. What do you do?",
        sceneVi: "Họ ở tường, do dự. Bạn làm gì?",
        characters: [
          { id: "stay", labelEn: "Stay and guide first climb", labelVi: "Ở lại và hướng dẫn leo lần đầu" },
          { id: "point", labelEn: "Point to a route and leave", labelVi: "Chỉ bài và đi" },
        ],
        promptEn: "Choose.",
        promptVi: "Chọn.",
        correctChoiceId: "stay",
        options: [
          { id: "stay", textEn: "Stay with them: 'Try this one — I'll stay right here.' Guide first climb, then encourage. After they succeed: 'I'll be around — explore, and I'll check in in a few minutes.'", textVi: "Ở bên: 'Thử bài này — tôi đứng đây.' Hướng dẫn leo lần đầu, động viên. Sau khi họ thành công: 'Tôi ở quanh đây — bạn khám phá, vài phút tôi check lại.'" },
          { id: "point", textEn: "Point to an easy route and go help someone else", textVi: "Chỉ bài dễ và đi giúp người khác" },
        ],
        wrongFeedbackEn: { point: "Wrong. First climb guidance: stay with them. Leaving early = they feel abandoned. Impact: fear, no second visit. Correct: stay, encourage, then transition." },
        wrongFeedbackVi: { point: "Sai. Hướng dẫn leo lần đầu: ở bên họ. Đi sớm = họ cảm thấy bị bỏ rơi. Đúng: ở lại, động viên, rồi chuyển giao." },
        correctFeedbackEn: "Correct. First climb guidance: stay with them. Encouragement, then transition. Follow-up check-in after ~5–10 min.",
        correctFeedbackVi: "Đúng. Hướng dẫn leo lần đầu: ở bên. Động viên, rồi chuyển giao. Check-in theo dõi sau ~5–10 phút.",
      },
    ],
    resultGood: {
      titleEn: "Perfect First Experience",
      titleVi: "Trải nghiệm đầu hoàn hảo",
      strengthsEn: ["Spot & approach", "Clear flow", "Emotional reassurance", "First climb support"],
      strengthsVi: ["Chú ý & tiếp cận", "Quy trình rõ", "Trấn an", "Hỗ trợ leo lần đầu"],
      xpReward: 100,
      skillDeltas: { communication: 8, safety: 2, sales: 2, teamwork: 2 },
    },
    resultPoor: {
      titleEn: "Experience Breakdown",
      titleVi: "Trải nghiệm vỡ",
      keyIssuesEn: ["Skipped steps", "Wrong tone", "Pointing instead of walking", "Left newbie alone too early"],
      keyIssuesVi: ["Bỏ bước", "Sai giọng", "Chỉ thay vì dẫn", "Bỏ người mới một mình quá sớm"],
      focusEn: ["→ Follow the 15-step order", "→ I got you — walk them through", "→ Stay for first climb", "→ No 'over there'"],
      focusVi: ["→ Theo đúng 15 bước", "→ Tôi hướng dẫn bạn — dẫn họ đi", "→ Ở lại leo lần đầu", "→ Không 'ở đằng kia'"],
    },
  },
  quiz: [
    {
      id: "d6q1",
      questionEn: "Within 3–5 seconds of a newbie entering, you should:",
      questionVi: "Trong 3–5 giây khi người mới vào, bạn nên:",
      options: [
        { en: "Wait for them to come to the counter", vi: "Chờ họ đến quầy" },
        { en: "Spot them, make eye contact, and walk toward them", vi: "Chú ý họ, giao tiếp mắt và bước về phía họ" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Waiting makes newbies feel invisible. Impact: anxiety, drop-off. Correct: spot & approach within 3–5 seconds, then greet and identify first-timer.",
        "Correct. Spot & approach within 3–5 seconds. Say: 'Hi! First time? I got you — I'll walk you through everything.'",
      ],
      explanationsVi: [
        "Sai. Chờ khiến người mới cảm thấy vô hình. Đúng: chú ý và tiếp cận trong 3–5 giây.",
        "Đúng. Chú ý và tiếp cận trong 3–5 giây. Nói: 'Chào! Lần đầu à? Tôi hướng dẫn bạn từng bước.'",
      ],
    },
    {
      id: "d6q2",
      questionEn: "For pass recommendation with a first-timer, you should:",
      questionVi: "Gợi ý gói với người lần đầu, bạn nên:",
      options: [
        { en: "Give them the full price list", vi: "Đưa full bảng giá" },
        { en: "Simplify: 'For your first time, I recommend the day pass'", vi: "Đơn giản: 'Lần đầu tôi gợi ý vé ngày'" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Overwhelming with pricing causes confusion. Correct: simplify choice — day pass for first time, then we can find what fits.",
        "Correct. Simplify. Say: 'For your first time, I recommend the day pass.' Impact: reduces overwhelm, builds trust.",
      ],
      explanationsVi: [
        "Sai. Dồn giá gây rối. Đúng: đơn giản — vé ngày lần đầu.",
        "Đúng. Đơn giản. Nói: 'Lần đầu tôi gợi ý vé ngày.'",
      ],
    },
    {
      id: "d6q3",
      questionEn: "Shoe recommendation for a beginner:",
      questionVi: "Gợi ý giày cho người mới:",
      options: [
        { en: "Push them to buy climbing shoes", vi: "Thúc mua giày leo" },
        { en: "Rental shoes first for beginners", vi: "Thuê giày trước cho người mới" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Pushing purchases early feels salesy and can overwhelm. Correct: 'For your first time, I recommend rental shoes first.'",
        "Correct. Rental first for beginners. Simplify choice, reduce overwhelm.",
      ],
      explanationsVi: [
        "Sai. Thúc mua sớm gây quá tải. Đúng: 'Lần đầu tôi gợi ý thuê giày trước.'",
        "Đúng. Thuê trước cho người mới.",
      ],
    },
    {
      id: "d6q4",
      questionEn: "You should NEVER say to a newbie:",
      questionVi: "Bạn KHÔNG NÊN nói với người mới:",
      options: [
        { en: "I got you — I'll walk you through everything", vi: "Tôi hướng dẫn bạn từng bước" },
        { en: "Just go over there and sign", vi: "Cứ đi ra đó đăng ký" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "That's correct to say. We want: walk them, don't direct. 'I got you — I'll walk you through everything' is ideal.",
        "Correct (this is what NOT to say). Never point 'over there.' Impact: confusion, discomfort. Walk them instead.",
      ],
      explanationsVi: [
        "Đó là câu nên nói. Chúng ta muốn: dẫn họ, không chỉ. 'Tôi hướng dẫn bạn từng bước' là chuẩn.",
        "Đúng (đây là câu KHÔNG nên nói). Đừng chỉ 'ra đó.' Dẫn họ thay vì chỉ.",
      ],
    },
    {
      id: "d6q5",
      questionEn: "During their first climb, you should:",
      questionVi: "Trong lần leo đầu của họ, bạn nên:",
      options: [
        { en: "Leave them to explore", vi: "Để họ tự khám phá" },
        { en: "Stay with them, encourage, then transition after success", vi: "Ở bên họ, động viên, rồi chuyển giao sau khi thành công" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Leaving too early = they feel abandoned. Impact: fear, no second visit. Correct: stay for first climb, encourage, then 'I'll be around — I'll check in in a few minutes.'",
        "Correct. First climb guidance: stay with them. Encouragement. Then transition and follow-up check-in after ~5–10 min.",
      ],
      explanationsVi: [
        "Sai. Đi sớm = họ cảm thấy bị bỏ rơi. Đúng: ở lại leo lần đầu, động viên, rồi chuyển giao và check-in theo dõi.",
        "Đúng. Hướng dẫn leo lần đầu: ở bên. Động viên. Rồi chuyển giao và check-in sau ~5–10 phút.",
      ],
    },
    {
      id: "d6q6",
      questionEn: "What is the emotional impact of ignoring a nervous newbie?",
      questionVi: "Tác động cảm xúc khi lờ một người mới lo lắng?",
      options: [
        { en: "They feel seen and confident", vi: "Họ cảm thấy được thấy và tự tin" },
        { en: "Anxiety increases; they may leave", vi: "Lo lắng tăng; họ có thể bỏ đi" },
      ],
      correctIndex: 1,
      explanationsEn: [
        "Wrong. Ignoring does not make them feel seen. Correct: always acknowledge nervous behavior within seconds. 'One sec — I'll be right with you.'",
        "Correct. Ignoring nervous behavior increases anxiety and can cause drop-off. Always acknowledge quickly.",
      ],
      explanationsVi: [
        "Sai. Lờ không khiến họ cảm thấy được thấy. Đúng: luôn chào hành vi lo lắng trong vài giây.",
        "Đúng. Lờ hành vi lo lắng tăng lo và có thể khiến họ bỏ đi.",
      ],
    },
  ],
  reflection: { id: "r6", promptEn: "What will you do to create a perfect first climbing memory for a newbie?", promptVi: "Bạn sẽ làm gì để tạo ký ức leo núi đầu tiên hoàn hảo cho người mới?" },
  hardModeScenarios: [
    {
      id: "d6_hard_multi",
      titleEn: "Hard: Newbie + regular at once",
      titleVi: "Khó: Người mới và người quen cùng lúc",
      promptEn: "A newbie and a regular are at the counter. The regular is in a hurry. What do you do? Prioritize and phrase your first sentence.",
      promptVi: "Người mới và người quen cùng ở quầy. Người quen đang vội. Bạn làm gì? Ưu tiên và nói câu đầu tiên.",
      hintEn: "Acknowledge both. Quick handoff or order: newbie needs more time — get regular done fast or get backup.",
      hintVi: "Chào cả hai. Chuyển giao nhanh hoặc thứ tự: người mới cần thời gian — xong người quen nhanh hoặc gọi hỗ trợ.",
      perfectAnswerEn: "I'd say: 'I see you both — one sec.' Then to the regular: 'Quick check-in?' and to the newbie: 'I'll be right with you for a full walkthrough.' So both feel seen; I prioritize the quick one without abandoning the newbie.",
      perfectAnswerVi: "Tôi nói: 'Tôi thấy cả hai — chờ chút.' Rồi với người quen: 'Check-in nhanh nhé?' và với người mới: 'Tôi sẽ hướng dẫn bạn đầy đủ ngay.' Cả hai được thấy; tôi ưu tiên người nhanh mà không bỏ người mới.",
      rubricEn: ["Acknowledge both", "Prioritize", "Newbie gets full walkthrough"],
      rubricVi: ["Chào cả hai", "Ưu tiên", "Người mới được hướng dẫn đầy đủ"],
    },
  ],
  advancedLessons: [
    {
      id: "d6_adv_flow",
      type: "list",
      titleEn: "Advanced: Exact phrasing for each step",
      titleVi: "Nâng cao: Câu nói đúng từng bước",
      contentEn: "What to say at key moments: Greeting: 'Hi! First time? I got you — I'll walk you through everything.' Pass: 'For your first time, I recommend the day pass.' Shoes: 'I recommend rental shoes first.' First climb: 'I'll stay right here. Try this one.'",
      contentVi: "Nói gì ở từng bước: Chào: 'Chào! Lần đầu à? Tôi hướng dẫn bạn từng bước.' Gói: 'Lần đầu tôi gợi ý vé ngày.' Giày: 'Tôi gợi ý thuê giày trước.' Leo lần đầu: 'Tôi đứng đây. Thử bài này.'",
      items: [
        { en: "Greeting: I got you — I'll walk you through everything", vi: "Chào: Tôi hướng dẫn bạn từng bước" },
        { en: "Pass: For your first time, I recommend the day pass", vi: "Gói: Lần đầu tôi gợi ý vé ngày" },
        { en: "Shoes: Rental shoes first for beginners", vi: "Giày: Thuê giày trước cho người mới" },
        { en: "First climb: I'll stay right here", vi: "Leo lần đầu: Tôi đứng ngay đây" },
      ],
    },
  ],
};

// ========== DAY 7 — FINAL CERTIFICATION ==========
export const DAY7: DayContent = {
  day: 7,
  titleEn: "Final Certification",
  titleVi: "Chứng nhận cuối",
  keyTakeawayEn: "You are ready.",
  keyTakeawayVi: "Bạn đã sẵn sàng.",
  certificationIntroEn: "This assessment validates that you can perform consistently before starting real-world internship. Serious tone. Each section is graded. You need a total score of at least 80 and no critical fail (unsafe language, dismissive tone, skipping onboarding steps, incorrect guidance to newbies) to pass.",
  certificationIntroVi: "Bài đánh giá này xác nhận bạn có thể thực hiện ổn định trước khi bắt đầu thực tập thực tế. Nghiêm túc. Mỗi phần được chấm. Bạn cần tổng điểm tối thiểu 80 và không có lỗi nghiêm trọng (ngôn ngữ không an toàn, giọng lạnh nhạt, bỏ bước onboarding, hướng dẫn sai cho người mới) để đạt.",
  sections: [
    {
      id: "d7_intro",
      type: "text",
      titleEn: "Final Certification",
      titleVi: "Chứng nhận cuối",
      contentEn: "This is your final assessment. We will test: rapid decisions (instinct), AI scenarios (graded strictly), a peak-hour simulation (newbie + regular + operational issue), and a knowledge quiz covering Days 1–6. Pass: total score ≥ 80 and no critical fail. You are not just checking people in — you are creating first climbing memories. Show us you're ready.",
      contentVi: "Đây là bài đánh giá cuối. Chúng ta sẽ kiểm tra: quyết định nhanh (bản năng), kịch bản AI (chấm chặt), mô phỏng giờ cao điểm (người mới + người quen + sự cố vận hành), và bài quiz kiến thức từ Ngày 1–6. Đạt: tổng điểm ≥ 80 và không lỗi nghiêm trọng. Bạn không chỉ check-in — bạn đang tạo ký ức leo núi đầu tiên. Cho chúng tôi thấy bạn sẵn sàng.",
    },
  ],
  rapidDecisions: [
    { id: "rd1", questionEn: "First-timer walks in. You:", questionVi: "Người lần đầu bước vào. Bạn:", options: [{ en: "Wait at counter", vi: "Chờ ở quầy" }, { en: "Approach within 3–5 sec", vi: "Tiếp cận trong 3–5 giây" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd2", questionEn: "Member says 'Is it safe?' You:", questionVi: "Thành viên hỏi 'Có an toàn không?' Bạn:", options: [{ en: "Say '100% safe'", vi: "Nói '100% an toàn'" }, { en: "Acknowledge fear, explain how we minimize risk", vi: "Chấp nhận sợ, giải thích cách giảm rủi ro" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd3", questionEn: "Teammate overwhelmed. You:", questionVi: "Đồng đội quá tải. Bạn:", options: [{ en: "Ignore", vi: "Lờ đi" }, { en: "Offer specific help", vi: "Đề nghị giúp cụ thể" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd4", questionEn: "Newbie asks which pass. You:", questionVi: "Người mới hỏi gói nào. Bạn:", options: [{ en: "Hand full price list", vi: "Đưa full bảng giá" }, { en: "Recommend day pass for first time", vi: "Gợi ý vé ngày lần đầu" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd5", questionEn: "Chalk bags low. You:", questionVi: "Túi phấn sắp hết. Bạn:", options: [{ en: "Ignore", vi: "Lờ đi" }, { en: "Restock or report", vi: "Bổ sung hoặc báo" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd6", questionEn: "Three at counter. You:", questionVi: "Ba người ở quầy. Bạn:", options: [{ en: "Serve first in line only", vi: "Chỉ phục vụ người đầu" }, { en: "Acknowledge all, then prioritize", vi: "Chào tất cả, rồi ưu tiên" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd7", questionEn: "First climb — they hesitate. You:", questionVi: "Leo lần đầu — họ do dự. Bạn:", options: [{ en: "Point and leave", vi: "Chỉ và đi" }, { en: "Stay with them", vi: "Ở bên họ" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd8", questionEn: "Member confused about waiver. You:", questionVi: "Thành viên bối rối về waiver. Bạn:", options: [{ en: "Say 'Just sign it'", vi: "Nói 'Cứ ký đi'" }, { en: "Explain simply, offer to walk through", vi: "Giải thích đơn giản, đề nghị hướng dẫn" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd9", questionEn: "Spill on floor. You:", questionVi: "Nước đổ trên sàn. Bạn:", options: [{ en: "Leave for someone else", vi: "Để người khác" }, { en: "Block/clean, then continue", vi: "Chặn/dọn, rồi tiếp tục" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "rd10", questionEn: "Leo Mây stands for:", questionVi: "Leo Mây đại diện cho:", options: [{ en: "Speed over quality", vi: "Tốc độ hơn chất lượng" }, { en: "Community over ego", vi: "Cộng đồng hơn cái tôi" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
  ],
  scenarios: [
    {
      id: "d7_s1",
      titleEn: "Certification: Nervous newbie",
      titleVi: "Chứng nhận: Người mới lo",
      promptEn: "A first-timer says they're scared. Respond in Leo Mây tone: acknowledge, reassure, offer to stay.",
      promptVi: "Người lần đầu nói họ sợ. Trả lời giọng Leo Mây: chấp nhận, trấn an, đề nghị ở bên.",
      hintEn: "Acknowledge fear, normalize, reassure, stay with them.",
      hintVi: "Chấp nhận sợ, bình thường hóa, trấn an, ở bên họ.",
      perfectAnswerEn: "That's totally normal — everyone feels that at first. I got you — I'll walk you through everything. We'll start with something low and easy, and I'll stay right here. You're safe.",
      perfectAnswerVi: "Bình thường thôi — ai cũng vậy lần đầu. Tôi hướng dẫn bạn từng bước. Mình bắt đầu với bài thấp và dễ, tôi đứng ngay đây. Bạn an toàn.",
      rubricEn: ["Acknowledge", "Reassure", "Stay", "Leo Mây tone"],
      rubricVi: ["Chấp nhận", "Trấn an", "Ở bên", "Giọng Leo Mây"],
    },
    {
      id: "d7_s2",
      titleEn: "Certification: Confused member",
      titleVi: "Chứng nhận: Thành viên bối rối",
      promptEn: "First-timer finished check-in but looks lost in the gym. What do you do?",
      promptVi: "Người lần đầu đã check-in nhưng trông lạc trong gym. Bạn làm gì?",
      hintEn: "Approach, walk them: shoes, tour, bouldering, first climb.",
      hintVi: "Tiếp cận, dẫn họ: giày, tour, bouldering, leo lần đầu.",
      perfectAnswerEn: "I'd approach and say: First time? I'll walk you through — we'll get your shoes, I'll show you the gym and explain bouldering in one minute. Come with me. Then do full flow: locker, walkthrough, first climb with me.",
      perfectAnswerVi: "Tôi tiếp cận và nói: Lần đầu à? Tôi dẫn bạn — lấy giày, tôi chỉ gym và giải thích bouldering trong một phút. Đi với tôi. Rồi làm đủ: tủ, tour, leo lần đầu cùng tôi.",
      rubricEn: ["Approach", "Walk them", "Full flow"],
      rubricVi: ["Tiếp cận", "Dẫn họ", "Đủ quy trình"],
    },
    {
      id: "d7_s3",
      titleEn: "Certification: Recovery",
      titleVi: "Chứng nhận: Phục hồi",
      promptEn: "Member has been waiting 2 minutes while staff chatted. They look annoyed. What do you say?",
      promptVi: "Thành viên đã chờ 2 phút trong khi staff nói chuyện. Họ trông bực. Bạn nói gì?",
      hintEn: "Acknowledge, brief apology, help now.",
      hintVi: "Chào, xin lỗi ngắn, giúp ngay.",
      perfectAnswerEn: "I'm so sorry you had to wait — I see you. Let me help you right now. What do you need?",
      perfectAnswerVi: "Xin lỗi bạn phải chờ — tôi thấy bạn. Để tôi giúp bạn ngay. Bạn cần gì?",
      rubricEn: ["Acknowledge", "Apologize briefly", "Help now"],
      rubricVi: ["Chào", "Xin lỗi ngắn", "Giúp ngay"],
    },
  ],
  simulation: {
    id: "day7_peak",
    titleEn: "Peak hour — newbie, regular, issue",
    titleVi: "Giờ cao điểm — người mới, quen, sự cố",
    steps: [
      {
        type: "decision",
        id: "d7sim1",
        sceneEn: "Peak hour. Newbie at door, regular at counter, you notice a spill. What do you do first?",
        sceneVi: "Giờ cao điểm. Người mới ở cửa, người quen ở quầy, bạn thấy nước đổ. Bạn làm gì trước?",
        characters: [
          { id: "safety_first", labelEn: "Safety (spill), then acknowledge both", labelVi: "An toàn (nước đổ), rồi chào cả hai" },
          { id: "counter_first", labelEn: "Serve counter first", labelVi: "Phục vụ quầy trước" },
        ],
        promptEn: "Choose.",
        promptVi: "Chọn.",
        correctChoiceId: "safety_first",
        options: [
          { id: "safety_first", textEn: "Quickly block or signal spill, say 'One sec' to both, then prioritize: spill → acknowledge newbie (needs more) and regular (quick)", textVi: "Chặn hoặc báo nước đổ nhanh, nói 'Chờ chút' với cả hai, rồi ưu tiên: nước đổ → chào người mới (cần nhiều) và người quen (nhanh)" },
          { id: "counter_first", textEn: "Serve the regular at counter first", textVi: "Phục vụ người quen ở quầy trước" },
        ],
        wrongFeedbackEn: { counter_first: "Critical: Safety first. Spill = slip risk. Then acknowledge both. Skipping safety or ignoring newbie can be critical fail." },
        wrongFeedbackVi: { counter_first: "Nghiêm trọng: An toàn trước. Nước đổ = trượt. Rồi chào cả hai." },
        correctFeedbackEn: "Correct. Safety first, then acknowledge everyone, prioritize.",
        correctFeedbackVi: "Đúng. An toàn trước, rồi chào mọi người, ưu tiên.",
        criticalWrongIds: ["counter_first"],
      },
      {
        type: "decision",
        id: "d7sim2",
        sceneEn: "Spill handled. Newbie is nervous. Regular wants quick check-in. You have backup. Do you:",
        sceneVi: "Đã xử lý nước đổ. Người mới lo. Người quen muốn check-in nhanh. Bạn có hỗ trợ. Bạn:",
        characters: [
          { id: "handoff_newbie", labelEn: "Hand off newbie to backup, you take regular", labelVi: "Chuyển người mới cho hỗ trợ, bạn nhận người quen" },
          { id: "solo", labelEn: "Handle everyone yourself", labelVi: "Tự xử lý hết" },
        ],
        promptEn: "Choose.",
        promptVi: "Chọn.",
        correctChoiceId: "handoff_newbie",
        options: [
          { id: "handoff_newbie", textEn: "Quick handoff: 'This one's first time — can you walk them through?' I take the regular. Newbie gets full onboarding.", textVi: "Chuyển giao nhanh: 'Bạn này lần đầu — bạn hướng dẫn giúp?' Tôi nhận người quen. Người mới được onboarding đầy đủ." },
          { id: "solo", textEn: "I'll handle everyone myself", textVi: "Tôi tự xử lý hết" },
        ],
        wrongFeedbackEn: { solo: "Use the team. Handoff so newbie gets proper onboarding; you clear the queue. Skipping onboarding for newbie = critical fail." },
        wrongFeedbackVi: { solo: "Dùng đội. Chuyển giao để người mới được onboarding đúng; bạn xử lý hàng. Bỏ onboarding người mới = lỗi nghiêm trọng." },
        correctFeedbackEn: "Correct. Prioritization + communication. Newbie gets full flow.",
        correctFeedbackVi: "Đúng. Ưu tiên + giao tiếp. Người mới được đủ quy trình.",
        criticalWrongIds: ["solo"],
      },
    ],
    resultGood: {
      titleEn: "Peak hour completed",
      titleVi: "Hoàn thành giờ cao điểm",
      strengthsEn: ["Safety", "Prioritization", "Onboarding flow", "Team coordination"],
      strengthsVi: ["An toàn", "Ưu tiên", "Quy trình onboarding", "Phối hợp đội"],
      xpReward: 80,
      skillDeltas: { communication: 5, safety: 5, sales: 2, teamwork: 5 },
    },
    resultPoor: {
      titleEn: "Needs improvement",
      titleVi: "Cần cải thiện",
      keyIssuesEn: ["Safety missed", "Skipped onboarding steps", "Dismissive tone", "Wrong prioritization"],
      keyIssuesVi: ["Bỏ qua an toàn", "Bỏ bước onboarding", "Giọng lạnh nhạt", "Sai ưu tiên"],
      focusEn: ["→ Safety first", "→ Full newbie flow", "→ Acknowledge everyone", "→ No dismissive tone"],
      focusVi: ["→ An toàn trước", "→ Đủ quy trình người mới", "→ Chào mọi người", "→ Không giọng lạnh nhạt"],
    },
  },
  quiz: [
    { id: "d7q1", questionEn: "Day 1: Leo Mây culture is", questionVi: "Ngày 1: Văn hóa Leo Mây là", options: [{ en: "Ego first", vi: "Cái tôi trước" }, { en: "Community over ego", vi: "Cộng đồng hơn cái tôi" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q2", questionEn: "Day 2: You should never say", questionVi: "Ngày 2: Bạn không nên nói", options: [{ en: "We minimize risk", vi: "Chúng ta giảm rủi ro" }, { en: "100% safe", vi: "100% an toàn" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q3", questionEn: "Day 3: Ownership means", questionVi: "Ngày 3: Làm chủ nghĩa là", options: [{ en: "Pass the buck", vi: "Đùn đẩy" }, { en: "If you see it, you own it", vi: "Thấy là xử lý" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q4", questionEn: "Day 4: When upselling, you", questionVi: "Ngày 4: Khi upselling, bạn", options: [{ en: "Push hard", vi: "Ép mạnh" }, { en: "Recommend what fits, no pressure", vi: "Gợi ý phù hợp, không ép" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q5", questionEn: "Day 5: When busy, you", questionVi: "Ngày 5: Khi đông, bạn", options: [{ en: "Panic", vi: "Hoảng" }, { en: "Stay calm, prioritize, communicate", vi: "Bình tĩnh, ưu tiên, giao tiếp" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q6", questionEn: "Day 6: Newbie flow — first you", questionVi: "Ngày 6: Quy trình người mới — trước tiên bạn", options: [{ en: "Wait at counter", vi: "Chờ ở quầy" }, { en: "Spot and approach within 3–5 sec", vi: "Chú ý và tiếp cận trong 3–5 giây" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q7", questionEn: "Day 6: For first-timer shoes, recommend", questionVi: "Ngày 6: Giày cho người lần đầu, gợi ý", options: [{ en: "Buy climbing shoes", vi: "Mua giày leo" }, { en: "Rental first", vi: "Thuê trước" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q8", questionEn: "Critical fail includes", questionVi: "Lỗi nghiêm trọng gồm", options: [{ en: "Walking newbie through", vi: "Dẫn người mới đi" }, { en: "Skipping onboarding steps", vi: "Bỏ bước onboarding" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
    { id: "d7q9", questionEn: "First climb with newbie: you", questionVi: "Leo lần đầu với người mới: bạn", options: [{ en: "Point and leave", vi: "Chỉ và đi" }, { en: "Stay with them", vi: "Ở bên họ" }], correctIndex: 1, explanationsEn: ["", ""], explanationsVi: ["", ""] },
  ],
  reflection: { id: "r7", promptEn: "Certification complete.", promptVi: "Hoàn thành chứng nhận." },
};

export const ALL_DAYS: DayContent[] = [DAY1, DAY2, DAY3, DAY4, DAY5, DAY6, DAY7];

export function getDayContent(day: number): DayContent | undefined {
  return ALL_DAYS.find((d) => d.day === day);
}

/** Map current_step to phase and indices for resume. Step 0 = first lesson, etc. */
const SIM_STEPS = (content: DayContent) => content.simulation?.steps.length ?? 0;

export type OnboardingPhase = "lesson" | "rapid_decisions" | "scenario" | "simulation" | "quiz" | "reflection" | "certification_result";

export function stepToPhase(
  step: number,
  content: DayContent
): { phase: OnboardingPhase; lessonIndex: number; scenarioIndex: number; simulationStepIndex: number; quizIndex: number; rapidIndex: number } {
  const L = content.sections.length;
  const R = content.rapidDecisions?.length ?? 0;
  const S = content.scenarios.length;
  const Sim = SIM_STEPS(content);
  const Q = content.quiz.length;
  if (step < L) return { phase: "lesson", lessonIndex: step, scenarioIndex: 0, simulationStepIndex: 0, quizIndex: 0, rapidIndex: 0 };
  if (R > 0 && step < L + R) return { phase: "rapid_decisions", lessonIndex: L - 1, scenarioIndex: 0, simulationStepIndex: 0, quizIndex: 0, rapidIndex: step - L };
  if (step < L + R + S) return { phase: "scenario", lessonIndex: L - 1, scenarioIndex: step - L - R, simulationStepIndex: 0, quizIndex: 0, rapidIndex: R - 1 };
  if (step < L + R + S + Sim) return { phase: "simulation", lessonIndex: L - 1, scenarioIndex: S - 1, simulationStepIndex: step - L - R - S, quizIndex: 0, rapidIndex: R - 1 };
  if (step < L + R + S + Sim + Q) return { phase: "quiz", lessonIndex: L - 1, scenarioIndex: S - 1, simulationStepIndex: Sim - 1, quizIndex: step - L - R - S - Sim, rapidIndex: R - 1 };
  if (R > 0) return { phase: "certification_result", lessonIndex: L - 1, scenarioIndex: S - 1, simulationStepIndex: Math.max(0, Sim - 1), quizIndex: Q - 1, rapidIndex: R - 1 };
  return { phase: "reflection", lessonIndex: L - 1, scenarioIndex: S - 1, simulationStepIndex: Math.max(0, Sim - 1), quizIndex: Q - 1, rapidIndex: R - 1 };
}

/** Compute current_step from phase and indices. */
export function phaseToStep(
  phase: OnboardingPhase,
  lessonIndex: number,
  scenarioIndex: number,
  simulationStepIndex: number,
  quizIndex: number,
  content: DayContent,
  rapidIndex?: number
): number {
  const L = content.sections.length;
  const R = content.rapidDecisions?.length ?? 0;
  const S = content.scenarios.length;
  const Sim = SIM_STEPS(content);
  const Q = content.quiz.length;
  if (phase === "lesson") return lessonIndex;
  if (phase === "rapid_decisions" && R > 0) return L + (rapidIndex ?? 0);
  if (phase === "scenario") return L + R + scenarioIndex;
  if (phase === "simulation") return L + R + S + simulationStepIndex;
  if (phase === "quiz") return L + R + S + Sim + quizIndex;
  if (phase === "certification_result") return L + R + S + Sim + Q;
  return L + R + S + Sim + Q;
}
