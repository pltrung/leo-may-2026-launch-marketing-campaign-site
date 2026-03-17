# /onboarding — Flow, Content & Technical Reference

This document describes the **/onboarding** 5-day training flow: route, layout, phases, and full content for each day (lessons, scenarios, quiz questions/answers, reflections). Content is bilingual (EN/VI); strings below are English where a single version is shown.

---

## 1. Route and layout

| Item | Detail |
|------|--------|
| **Route** | `/onboarding` (no locale segment) |
| **Layout** | `app/onboarding/layout.tsx` → `AdminAuthProvider` |
| **Page** | `app/onboarding/page.tsx` — single client page |
| **Auth** | Same as `/admin`: `AdminAuthContext`; `getUnifiedAdminOrStaffFromRequest` for API. Admin, frontdesk, and staff can access. |

**Entry:** From admin header: "Onboarding" links to `/onboarding`. User must be logged in (admin/frontdesk/staff). If not, login form is shown with Leo Mây logo and "Back to /admin".

---

## 2. Header (authenticated)

- **Left:** "← Admin" link, Leo Mây logo (`/logo-white.svg`, h-8).
- **Right:** XP total (amber), hearts (❤/♡, max 5), streak (🔥 when > 0), skill scores (C/S/$/T when `skill_scores` present), EN/VI toggle. Locale is persisted in `localStorage` (`onboarding-locale`).
- **Title (map phase):** "Leo Mây Onboarding" + role suffix: "— Front Desk" | "— Staff" | "— Admin" (and Vietnamese equivalents).

---

## 3. Main flow (phases)

Each **day** is a linear sequence of phases. User can resume from the last saved step (see §4).

| Phase | Description |
|-------|-------------|
| **map** | Day grid (1–5). Day 1 always unlocked; day N unlocks **24 hours after** day N−1 was completed (uses `completed_at`). Locked days show a countdown (e.g. "Unlocks in 18h 20m"); countdown refreshes every 60s. Click a day to start or resume. |
| **lesson** | Lesson cards (sections). Types: text, choice, goodvsbad, list. "Next" advances; after last section → scenario. |
| **scenario** | Free-text scenario. User types response → Submit → score, "Why not 100?", and "Perfect answer" shown. "Next" → next scenario, **simulation** (if present), or quiz. |
| **simulation** | Multi-step simulation (one per day). Scene + characters; user picks an option (e.g. who to help first). Wrong/right feedback with impact on member experience. "Next" → next step or quiz. |
| **quiz** | Multiple choice. User picks one → detailed explanation (why right/wrong) + correct answer if wrong. "Next" → next question or reflection. |
| **reflection** | Text prompt + textarea. "Complete Day" → **key takeaway** screen (memory hook for the day), then "Back to map" → day marked complete, return to map. |
| **key_takeaway** | End-of-day memory hook (e.g. Day 1: "Community over ego"). Shows Perfect Day Bonus +100 XP if quiz was all correct. "Back to map" persists completion and unlocks next day in 24h. |

**XP:** +10 per lesson, +50 day complete, +100 perfect quiz, **+100 Perfect Day Bonus** (when all quiz correct and user completes the day). **Hearts:** Start at 5; −1 per wrong quiz answer. **Skill scores** (C/S/$/T) shown in header when available.

---

## 4. Progress and resume

- **API:** `GET /api/admin/onboarding/progress` returns `xp_total`, `streak_days`, `hearts_remaining`, `skill_scores`, `day_completion`.
- **day_completion[day]:** `completed`, `lesson_index`, `current_step`, **`completed_at`** (ISO timestamp when day was completed; used for 24h unlock of next day).
- **24h unlock:** Day N (N ≥ 2) is unlocked only if day N−1 is completed **and** `now - completed_at[N−1] ≥ 24 hours`. Otherwise the map shows a countdown (e.g. "Unlocks in 18h 20m").
- **Resume:** `current_step` is the linear index: lessons → scenarios → simulation steps (if any) → quiz → reflection. When user opens a day that is not completed, they are restored to that step (lesson, scenario, simulation step, or quiz index).
- **PATCH** with `action: "lesson"` (and optional `current_step`) or `action: "save_step"` (day + current_step) persists progress. **`action: "day_complete"`** accepts optional **`perfect_day: true`** for +100 XP Perfect Day Bonus.

---

## 5. Day 1 — The Leo Mây Way (Culture)

**Title (EN/VI):** The Leo Mây Way / Cách Leo Mây

### 5.1 Lessons (sections)

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 1 | First Impression | choice | "What do you do in the first 5 seconds?" Choices: Wave and say hi; **Make eye contact, smile, walk toward them**; Wait for them to come to you. |
| 2 | What is Leo Mây | text | Leo Mây is not just a gym. It is a space for growth. |
| 3 | Core Philosophy | text | Community over ego. |
| 4 | Energy Training | list | Three things to practice: Eye contact, Smile, Walk toward the member. |
| 5 | Good vs Bad | goodvsbad | Bad: "Go sign there". Good: "Hey! First time? I got you 👌". |
| 6 | Member Types | list | Nervous — needs reassurance; Confident — appreciates efficiency; Lost — needs guidance. |

### 5.2 Simulation (Day 1)

**Title:** Who do you help first? / Bạn giúp ai trước?

- **Scene:** Member A (nervous, first time) at counter; Member B (regular, in a hurry) just walked in; teammate busy.
- **Prompt:** Who do you respond to first? Options: (1) Acknowledge Member A first — they were there first and are nervous; (2) Help Member B first — they're in a hurry.
- **Correct:** Member A first. Wrong choice shows impact (A feels invisible; rule: acknowledge who was there first, especially if they need reassurance).

### 5.3 Key takeaway (Day 1)

**"Community over ego"** / "Cộng đồng hơn cái tôi"

### 5.4 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Nervous Beginner | A nervous first-timer says: "I've never climbed before. I'm scared." How do you respond? | Show warmth and confidence. Normalize fear. | Welcome them; first time is normal to feel nervous; lots of people feel that way; I'm here to help; we'll start easy; ready when you are. |
| 2 | Confident Climber | A regular walks in, clearly in a hurry. How do you greet them? | Be efficient but warm. No small talk overload. | Hey! Ready to go? Great — you're all set. |
| 3 | Ignored Member | A member has been standing at the counter for 2 minutes while staff chatted. They look upset. What do you do? | Acknowledge them immediately. Apologize briefly. | Hi, sorry about the wait! You've been there a minute — how can I help you? |

### 5.5 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | In the first 5 seconds when a member walks in, you should: | Wait for them to approach; **Make eye contact, smile, and walk toward them**; Nod from across the room | 2nd |
| 2 | Leo Mây's core philosophy is: | Fitness over fun; **Community over ego**; Speed over service | 2nd |
| 3 | When a member says "Go sign there", you should instead say: | "Over there"; **"Hey! First time? I got you"**; "Read the form" | 2nd |
| 4 | Three energy elements to practice are: | Speed, tone, volume; **Eye contact, smile, walk toward member**; Paperwork, keys, badge | 2nd |
| 5 | A nervous member needs: | To be ignored until they relax; **Reassurance and warmth**; A quick check-in only | 2nd |

**Reflection (EN):** What energy should Leo Mây feel like?

---

## 6. Day 2 — Experience & Safety

**Title (EN/VI):** Experience & Safety / Trải nghiệm & An toàn

### 6.1 Lessons

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 1 | Fear is Normal | text | Fear is normal. Acknowledge it, not dismiss it. |
| 2 | Common Beginner Thoughts | list | "I'm scared"; "I'm too weak". |
| 3 | Safety Language | goodvsbad | Bad: "This is 100% safe". Good: "We guide you safely, but risks exist. We minimize them." |
| 4 | First Climb Flow | list | Proper shoes, Warm up, Start with an easy route. |
| 5 | Legal Rules | list | Never: Guarantee safety; Dismiss fear. |

### 6.2 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Scared Climber | A climber says: "I'm too scared to try." How do you respond? | Acknowledge the fear. Offer support. Don't push. | I understand — that's normal; lots feel that way; I'm here to support you; we can start when you're ready or just watch; no pressure. |
| 2 | Overconfident Climber | A climber skips warm-up and heads straight to a hard route. What do you say? | Kindly suggest warm-up. Safety first. | Quick suggestion — warm-up helps prevent injuries, gets muscles ready; couple minutes; want me to show you a few moves? |
| 3 | Parent with Child | A parent asks: "Is it safe for my 6-year-old?" How do you respond? | Explain our approach. Don't guarantee. Emphasize supervision. | Lots of kids that age; we guide safely — harness, easy routes, close supervision; we never say 100% safe; we minimize risks; adult with them; would you like to see the kids area first? |

### 6.3 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | When a climber says they're scared, you should: | Tell them not to worry; **Acknowledge the fear and offer support**; Ignore it and continue | 2nd |
| 2 | Correct safety language is: | "This is 100% safe"; **"We guide you safely, but risks exist"**; "Nothing bad ever happens" | 2nd |
| 3 | First climb flow includes: | **Shoes, warm-up, easy route**; Go straight to hard route; Skip warm-up if in a hurry | 1st |
| 4 | You should never: | Suggest warm-up; **Guarantee 100% safety**; Acknowledge fear | 2nd |
| 5 | With a parent and child, emphasize: | No risks at all; **Supervision and our guidance**; Let kids run free | 2nd |

**Reflection (EN):** How can you make a scared climber feel supported?

---

## 7. Day 3 — Role & Responsibility

**Title (EN/VI):** Role & Responsibility / Vai trò & Trách nhiệm

### 7.1 Lessons

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 1 | Your Role Matters | text | Your role impacts everything — member experience, safety, culture. Own it. |
| 2 | Staff vs Frontdesk | goodvsbad | Staff: routes, coaching, tasks. Frontdesk: check-in, members, sales. Both need the same culture. |
| 3 | Ownership Mindset | text | If you see something — you own it. A mess? Clean it. A confused member? Help them. |

### 7.2 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Ownership | You see a spill. No one else notices. What do you do? | Own it. | Clean it or get a mop right away; if I see it, I own it; spill is safety risk and bad for vibe; I'll handle it. |
| 2 | Handoff | A member needs something only frontdesk can do. You're staff. What do you do? | Escort, introduce, don't abandon. | Walk them to frontdesk and introduce: "This is [Name] — they need help with [X]"; wouldn't just point "go over there"; hand off properly. |
| 3 | Busy Moment | You're busy. A member waits. Another staff is free. What do you do? | Signal your teammate. Don't ignore the member. | Eye contact with member first — "One sec!" — then signal teammate to help; wouldn't let them stand there ignored; member comes first. |

### 7.3 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | Ownership means: | Ignore problems; **If you see it, you own it** | 2nd |
| 2 | Staff focus on: | Check-in only; **Routes, coaching, tasks** | 2nd |
| 3 | Frontdesk focus on: | Routes only; **Check-in, members, sales** | 2nd |
| 4 | When you see a spill: | Wait for someone else; **Clean it or get it cleaned** | 2nd |
| 5 | Both staff and frontdesk need: | Different cultures; **The same Leo Mây culture** | 2nd |

**Reflection (EN):** What does ownership mean to you?

---

## 8. Day 4 — Sales & System

**Title (EN/VI):** Sales & System / Bán hàng & Hệ thống

### 8.1 Lessons

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 1 | Selling = Helping | text | Selling is helping. You're not pushing — you're matching members with what they need. |
| 2 | Merch Conversation | text | Natural mentions: "Love that shirt? We have it." Not: "Buy this." |
| 3 | System Basics | list | Check-in — scan QR, verify membership; POS — add items, checkout; Inventory — stock in/out. |

### 8.2 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Upsell | A day-pass member loves the gym. How do you mention membership? | Help, don't push. | Sounds like you're enjoying it! If you're here often, membership could save you money — part of the community; no pressure; just mentioning in case it helps. |
| 2 | Merch | Member admires a chalk bag. What do you say? | Natural mention. | Nice one, right? We have those — and a few other colors. Let me know if you want to check them out. |
| 3 | Check-in Flow | Describe the check-in flow in one sentence. | QR → verify → confirm | Scan their QR, verify membership or day-pass, confirm they're in, and they're good to go. |

### 8.3 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | Selling at Leo Mây means: | Pushing products; **Helping members find what they need** | 2nd |
| 2 | Merch talk should be: | Aggressive; **Natural and helpful** | 2nd |
| 3 | Check-in uses: | Manual entry only; **QR scan, verify membership** | 2nd |
| 4 | POS is for: | Climbing only; **Add items, checkout** | 2nd |
| 5 | Inventory includes: | **Stock in and out**; Only climbing routes | 1st |

**Reflection (EN):** How can you make selling feel like helping?

---

## 9. Day 5 — Team & Excellence

**Title (EN/VI):** Team & Excellence / Đội & Xuất sắc

### 9.1 Lessons

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 1 | Busy Gym | text | When it's busy: stay calm, prioritize, communicate with the team. |
| 2 | Ownership | text | If you see it, you own it. No passing the buck. |
| 3 | Team Communication | text | Signal teammates. Cover for each other. No one gets left behind. |
| 4 | Invisible Work | text | Cleaning, restocking, helping without being asked — this is excellence. |
| 5 | Good vs Great | goodvsbad | Good: do your job. Great: make everyone's job easier. Bad: minimum effort. Good: proactive, helpful. |

### 9.2 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Busy Moment | Three members at counter. One staff. What do you do? | Prioritize, acknowledge all, get backup. | Acknowledge everyone quickly — "I see you all, one moment" — then get backup; no one left feeling invisible; stay calm, prioritize, each person feels seen. |
| 2 | Invisible Work | You notice chalk bags are low. What do you do? | Restock or report. | Restock or let whoever handles inventory know; invisible work is what makes the gym run; if I see it, I own it. |
| 3 | Teammate Struggling | A teammate is overwhelmed. You have capacity. What do you do? | Offer help. | Ask: "Need a hand? I can take [X]." Community over ego — we cover for each other; no one gets left behind. |

### 9.3 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | In a busy gym, you should: | Panic; **Stay calm, prioritize, communicate** | 2nd |
| 2 | Invisible work is: | Unimportant; **Cleaning, restocking, helping without being asked** | 2nd |
| 3 | Great means: | Minimum effort; **Proactive, make everyone's job easier** | 2nd |
| 4 | If you see a teammate overwhelmed: | Ignore; **Offer help** | 2nd |
| 5 | Ownership means: | Pass the buck; **If you see it, you own it** | 2nd |

**Reflection (EN):** What does excellence look like for you?

---

## 10. Scenario evaluation (AI / rule-based)

- **API:** `POST /api/admin/onboarding/ai-evaluate`. Body: `day`, `scenario_key`, `user_response`, `locale` (optional, "en" | "vi").
- **Response:** `score` (0–100), `feedback`, `whyNot100` (when score < 100), `perfectAnswer`, `improved_answer` (same as perfectAnswer).
- **Scoring:** Rule-based: base 60; +10 per good keyword hit; −15 per bad keyword; +5 for length > 30 chars; +5 for > 80 chars. Capped 0–100.
- **whyNot100:** Built from: phrases to avoid (bad keywords used), what was missing (good keywords), length note, and rubric criteria for 100 (from scenario content). All content is in EN or VI per `locale`.
- **UI:** After submit, user sees score, feedback, "Why not 100 points?" (if < 100), and "Perfect answer (100 points)" with the full ideal response.

---

## 11. Quiz feedback (explanations)

- Each quiz question has **explanationsEn** and **explanationsVi** arrays (one string per option).
- **Correct option:** Explanation of why it's right, with examples and Leo Mây values.
- **Wrong options:** Why it's wrong, impact on the member (e.g. feeling dismissed), what to do instead; for questions about another person, empathy framing (why they might feel/behave that way, how certain replies can offend).
- **UI:** After user selects an answer, the card shows "You chose correctly" or "Explanation for your choice" with the chosen option's explanation. If wrong, it also shows "The right answer" (correct option text) and the correct option's explanation in a green box. User then clicks "Next" to continue.

---

## 12. APIs

| API | Purpose |
|-----|---------|
| `GET /api/admin/onboarding/progress` | Get/create progress: xp_total, streak_days, hearts_remaining, day_completion (per day: completed, lesson_index, current_step). |
| `PATCH /api/admin/onboarding/progress` | Update progress. Body: `action` ("lesson" \| "day_complete" \| "quiz" \| "lose_heart" \| "save_step"), and as needed: `day`, `lesson_index`, `current_step`, `quiz_perfect`. |
| `POST /api/admin/onboarding/ai-evaluate` | Score scenario response. Body: `day`, `scenario_key`, `user_response`, `locale`. Returns score, feedback, whyNot100, perfectAnswer. |

---

## 13. Data and content source

| Item | Location |
|------|----------|
| **Content (all 5 days)** | `lib/onboardingContent.ts`: `DAY1`–`DAY5`, `getDayContent`, `getLessonContent`, `getQuizContent`, `stepToPhase`, `phaseToStep`. |
| **Progress tables** | `supabase/migrations/041_onboarding.sql`: `onboarding_progress`, `onboarding_day_completion`, `onboarding_ai_sessions`. `042_onboarding_resume.sql`: adds `current_step` to `onboarding_day_completion`. |
| **Constants** | `XP_LESSON` (10), `XP_DAY_COMPLETE` (50), `XP_PERFECT_QUIZ` (100), `HEARTS_MAX` (5). |

---

## 14. Components (onboarding page)

| Component | Role |
|-----------|------|
| **OnboardingPage** | State: progress, currentDay, phase, lesson/scenario/quiz indices, scenario response/result, reflection text. Handles start day (with resume), lesson next, scenario submit/next, quiz select/next, reflection submit. |
| **LessonCard** | Renders one section (text / choice / goodvsbad / list); Next button; "Back to map" link. |
| **ScenarioCard** | Scenario title, prompt, hint; textarea; Submit → score, whyNot100, perfect answer; Next. |
| **QuizCard** | Question, option buttons (green/red on select); after select: explanation for chosen option, and if wrong the correct answer + its explanation; Next. |

All content is localized via `locale` (EN/VI) from the header toggle and passed into the content getters and API (`locale` in ai-evaluate body).
