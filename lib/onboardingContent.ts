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
  goodKeywords?: string[];
  badKeywords?: string[];
}

export interface QuizQuestion {
  id: string;
  questionEn: string;
  questionVi: string;
  options: { en: string; vi: string }[];
  correctIndex: number;
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

export function getQuizContent(q: Pick<QuizQuestion, "questionEn" | "questionVi" | "options">, locale: Locale) {
  return {
    question: t({ en: q.questionEn, vi: q.questionVi }, locale),
    options: q.options.map((o) => t(o, locale)),
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
    { id: "role_scenario_1", titleEn: "Ownership", titleVi: "Làm chủ", promptEn: "You see a spill. No one else notices. What do you do?", promptVi: "Bạn thấy nước đổ. Không ai chú ý. Bạn làm gì?", hintEn: "Own it.", hintVi: "Xử lý đi." },
    { id: "role_scenario_2", titleEn: "Handoff", titleVi: "Chuyển giao", promptEn: "A member needs something only frontdesk can do. You're staff. What do you do?", promptVi: "Thành viên cần việc chỉ frontdesk làm được. Bạn là staff. Bạn làm gì?", hintEn: "Escort, introduce, don't abandon.", hintVi: "Đưa đi, giới thiệu, đừng bỏ mặc." },
    { id: "role_scenario_3", titleEn: "Busy Moment", titleVi: "Lúc bận", promptEn: "You're busy. A member waits. Another staff is free. What do you do?", promptVi: "Bạn đang bận. Một thành viên chờ. Một staff khác rảnh. Bạn làm gì?", hintEn: "Signal your teammate. Don't ignore the member.", hintVi: "Ra hiệu đồng đội. Đừng lờ thành viên." },
  ],
  quiz: [
    { id: "q1", questionEn: "Ownership means:", questionVi: "Làm chủ có nghĩa:", options: [{ en: "Ignore problems", vi: "Lờ vấn đề" }, { en: "If you see it, you own it", vi: "Thấy là xử lý" }], correctIndex: 1 },
    { id: "q2", questionEn: "Staff focus on:", questionVi: "Staff tập trung:", options: [{ en: "Check-in only", vi: "Chỉ check-in" }, { en: "Routes, coaching, tasks", vi: "Tường, coaching, nhiệm vụ" }], correctIndex: 1 },
    { id: "q3", questionEn: "Frontdesk focus on:", questionVi: "Frontdesk tập trung:", options: [{ en: "Routes only", vi: "Chỉ tường" }, { en: "Check-in, members, sales", vi: "Check-in, thành viên, bán hàng" }], correctIndex: 1 },
    { id: "q4", questionEn: "When you see a spill:", questionVi: "Khi thấy nước đổ:", options: [{ en: "Wait for someone else", vi: "Chờ người khác" }, { en: "Clean it or get it cleaned", vi: "Dọn hoặc nhờ dọn" }], correctIndex: 1 },
    { id: "q5", questionEn: "Both staff and frontdesk need:", questionVi: "Cả staff và frontdesk cần:", options: [{ en: "Different cultures", vi: "Văn hóa khác nhau" }, { en: "The same Leo Mây culture", vi: "Cùng văn hóa Leo Mây" }], correctIndex: 1 },
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
    { id: "sales_1", titleEn: "Upsell", titleVi: "Upsell", promptEn: "A day-pass member loves the gym. How do you mention membership?", promptVi: "Thành viên vé ngày rất thích gym. Bạn nhắc gói thế nào?", hintEn: "Help, don't push.", hintVi: "Giúp, đừng ép." },
    { id: "sales_2", titleEn: "Merch", titleVi: "Hàng", promptEn: "Member admires a chalk bag. What do you say?", promptVi: "Thành viên thích túi phấn. Bạn nói gì?", hintEn: "Natural mention.", hintVi: "Nhắc tự nhiên." },
    { id: "sales_3", titleEn: "Check-in Flow", titleVi: "Luồng check-in", promptEn: "Describe the check-in flow in one sentence.", promptVi: "Mô tả luồng check-in trong một câu.", hintEn: "QR → verify → confirm", hintVi: "QR → xác nhận → hoàn tất" },
  ],
  quiz: [
    { id: "q1", questionEn: "Selling at Leo Mây means:", questionVi: "Bán hàng ở Leo Mây là:", options: [{ en: "Pushing products", vi: "Ép mua" }, { en: "Helping members find what they need", vi: "Giúp thành viên tìm thứ họ cần" }], correctIndex: 1 },
    { id: "q2", questionEn: "Merch talk should be:", questionVi: "Nói về hàng nên:", options: [{ en: "Aggressive", vi: "Hung hăng" }, { en: "Natural and helpful", vi: "Tự nhiên và hữu ích" }], correctIndex: 1 },
    { id: "q3", questionEn: "Check-in uses:", questionVi: "Check-in dùng:", options: [{ en: "Manual entry only", vi: "Chỉ nhập tay" }, { en: "QR scan, verify membership", vi: "Quét QR, xác nhận gói" }], correctIndex: 1 },
    { id: "q4", questionEn: "POS is for:", questionVi: "POS dùng để:", options: [{ en: "Climbing only", vi: "Chỉ leo" }, { en: "Add items, checkout", vi: "Thêm món, thanh toán" }], correctIndex: 1 },
    { id: "q5", questionEn: "Inventory includes:", questionVi: "Kho bao gồm:", options: [{ en: "Stock in and out", vi: "Nhập và xuất kho" }, { en: "Only climbing routes", vi: "Chỉ đường leo" }], correctIndex: 0 },
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
    { id: "team_1", titleEn: "Busy Moment", titleVi: "Lúc bận", promptEn: "Three members at counter. One staff. What do you do?", promptVi: "Ba thành viên ở quầy. Một staff. Bạn làm gì?", hintEn: "Prioritize, acknowledge all, get backup.", hintVi: "Ưu tiên, chú ý tất cả, gọi hỗ trợ." },
    { id: "team_2", titleEn: "Invisible Work", titleVi: "Việc vô hình", promptEn: "You notice chalk bags are low. What do you do?", promptVi: "Bạn thấy túi phấn sắp hết. Bạn làm gì?", hintEn: "Restock or report.", hintVi: "Bổ sung hoặc báo." },
    { id: "team_3", titleEn: "Teammate Struggling", titleVi: "Đồng đội khó", promptEn: "A teammate is overwhelmed. You have capacity. What do you do?", promptVi: "Đồng đội quá tải. Bạn còn sức. Bạn làm gì?", hintEn: "Offer help.", hintVi: "Đề nghị giúp." },
  ],
  quiz: [
    { id: "q1", questionEn: "In a busy gym, you should:", questionVi: "Khi gym đông, bạn nên:", options: [{ en: "Panic", vi: "Hoảng" }, { en: "Stay calm, prioritize, communicate", vi: "Bình tĩnh, ưu tiên, giao tiếp" }], correctIndex: 1 },
    { id: "q2", questionEn: "Invisible work is:", questionVi: "Việc vô hình là:", options: [{ en: "Unimportant", vi: "Không quan trọng" }, { en: "Cleaning, restocking, helping without being asked", vi: "Dọn, bổ sung, giúp không cần hỏi" }], correctIndex: 1 },
    { id: "q3", questionEn: "Great means:", questionVi: "Tuyệt có nghĩa:", options: [{ en: "Minimum effort", vi: "Nỗ lực tối thiểu" }, { en: "Proactive, make everyone's job easier", vi: "Chủ động, làm việc mọi người dễ hơn" }], correctIndex: 1 },
    { id: "q4", questionEn: "If you see a teammate overwhelmed:", questionVi: "Nếu thấy đồng đội quá tải:", options: [{ en: "Ignore", vi: "Lờ đi" }, { en: "Offer help", vi: "Đề nghị giúp" }], correctIndex: 1 },
    { id: "q5", questionEn: "Ownership means:", questionVi: "Làm chủ có nghĩa:", options: [{ en: "Pass the buck", vi: "Đùn đẩy" }, { en: "If you see it, you own it", vi: "Thấy là xử lý" }], correctIndex: 1 },
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
