/**
 * Onboarding content: 5-day training for staff/frontdesk at Leo Mây
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
  type: "text" | "choice" | "goodvsbad" | "list";
  choices?: { en: string; vi: string }[];
  good?: { en: string; vi: string };
  bad?: { en: string; vi: string };
  items?: { en: string; vi: string }[];
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

export interface QuizQuestion {
  id: string;
  questionEn: string;
  questionVi: string;
  options: { en: string; vi: string }[];
  correctIndex: number;
  /** Per-option explanation: why this option is right or wrong, with examples and (when about another person) empathy. Same length as options. */
  explanationsEn: string[];
  explanationsVi: string[];
}

export interface Reflection {
  id: string;
  promptEn: string;
  promptVi: string;
}

export interface DayContent {
  day: number;
  titleEn: string;
  titleVi: string;
  roleFilter?: OnboardingRole[];
  sections: LessonSection[];
  scenarios: AIScenario[];
  quiz: QuizQuestion[];
  reflection: Reflection;
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
  q: Pick<QuizQuestion, "questionEn" | "questionVi" | "options"> & { explanationsEn?: string[]; explanationsVi?: string[] },
  locale: Locale
) {
  return {
    question: t({ en: q.questionEn, vi: q.questionVi }, locale),
    options: q.options.map((o) => t(o, locale)),
    explanations: locale === "vi" ? (q.explanationsVi ?? []) : (q.explanationsEn ?? []),
  };
}

// XP constants
export const XP_LESSON = 10;
export const XP_DAY_COMPLETE = 50;
export const XP_PERFECT_QUIZ = 100;
export const HEARTS_MAX = 5;
export const HEARTS_LOST_PER_MISTAKE = 1;

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
  sections: [
    {
      id: "d1s1",
      type: "choice",
      titleEn: "First Impression",
      titleVi: "Ấn tượng đầu tiên",
      contentEn: "A member walks into the gym. What do you do in the first 5 seconds?",
      contentVi: "Một thành viên bước vào phòng gym. Bạn làm gì trong 5 giây đầu tiên?",
      choices: [
        { en: "Wave and say hi", vi: "Vẫy tay và chào" },
        { en: "Make eye contact, smile, walk toward them", vi: "Giao tiếp bằng mắt, mỉm cười, bước về phía họ" },
        { en: "Wait for them to come to you", vi: "Chờ họ đến" },
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
  quiz: [
    {
      id: "q1",
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
      questionEn: "Leo Mây's core philosophy is:",
      questionVi: "Triết lý cốt lõi của Leo Mây là:",
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
      questionEn: "When a member says 'Go sign there', you should instead say:",
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
};

// ========== DAY 2 — EXPERIENCE & SAFETY ==========
export const DAY2: DayContent = {
  day: 2,
  titleEn: "Experience & Safety",
  titleVi: "Trải nghiệm & An toàn",
  sections: [
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
};

// ========== DAY 3 — ROLE & RESPONSIBILITY ==========
export const DAY3: DayContent = {
  day: 3,
  titleEn: "Role & Responsibility",
  titleVi: "Vai trò & Trách nhiệm",
  sections: [
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
};

// ========== DAY 4 — SALES & SYSTEM ==========
export const DAY4: DayContent = {
  day: 4,
  titleEn: "Sales & System",
  titleVi: "Bán hàng & Hệ thống",
  sections: [
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
};

// ========== DAY 5 — TEAM & EXCELLENCE ==========
export const DAY5: DayContent = {
  day: 5,
  titleEn: "Team & Excellence",
  titleVi: "Đội & Xuất sắc",
  sections: [
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
};

export const ALL_DAYS: DayContent[] = [DAY1, DAY2, DAY3, DAY4, DAY5];

export function getDayContent(day: number): DayContent | undefined {
  return ALL_DAYS.find((d) => d.day === day);
}

/** Map current_step to phase and indices for resume. Step 0 = first lesson, etc. */
export function stepToPhase(
  step: number,
  content: DayContent
): { phase: "lesson" | "scenario" | "quiz" | "reflection"; lessonIndex: number; scenarioIndex: number; quizIndex: number } {
  const L = content.sections.length;
  const S = content.scenarios.length;
  const Q = content.quiz.length;
  if (step < L) return { phase: "lesson", lessonIndex: step, scenarioIndex: 0, quizIndex: 0 };
  if (step < L + S) return { phase: "scenario", lessonIndex: L - 1, scenarioIndex: step - L, quizIndex: 0 };
  if (step < L + S + Q) return { phase: "quiz", lessonIndex: L - 1, scenarioIndex: S - 1, quizIndex: step - L - S };
  return { phase: "reflection", lessonIndex: L - 1, scenarioIndex: S - 1, quizIndex: Q - 1 };
}

/** Compute current_step from phase and indices. */
export function phaseToStep(
  phase: "lesson" | "scenario" | "quiz" | "reflection",
  lessonIndex: number,
  scenarioIndex: number,
  quizIndex: number,
  content: DayContent
): number {
  const L = content.sections.length;
  const S = content.scenarios.length;
  const Q = content.quiz.length;
  if (phase === "lesson") return lessonIndex;
  if (phase === "scenario") return L + scenarioIndex;
  if (phase === "quiz") return L + S + quizIndex;
  return L + S + Q;
}
