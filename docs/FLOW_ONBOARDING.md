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
| **map** | Day grid (1–7). After **passing** final certification (`passed` + `certification_date`), the map shows a **certificate card**: name, final score, skill bars, 7-day grid (✓, quiz ratio, XP per day), issued date. "Back to map" from certification result **refetches progress** so the certificate appears immediately. |
| **lesson** | Lesson cards (sections). Types: **text**, **choice**, **goodvsbad**, **list**, **choose_better**, **fix_sentence**, **reorder_steps**, **tap_mistake**. For any wrong answer the UI shows: why it's wrong, what is correct, how it impacts member experience, and an example of correct phrasing. "Next" advances; after last section → scenario. |
| **scenario** | Free-text AI scenario. User types response → Submit → score (0–100), feedback, "Why not 100?", and "Perfect answer" in Leo Mây tone. Evaluation: friendliness, clarity, safety correctness, helpfulness, Leo Mây tone. "Next" → next scenario, **simulation** (if present), or quiz. |
| **simulation** | **One multi-step simulation per day** (Days 1–5). Steps can be **decision** (multiple choice; wrong choice shows why wrong, impact, correct behavior) or **ai_response** (free text evaluated like a scenario). Branching result screen: "Peak Hour Completed" (good) or "Needs Improvement" (poor) with XP and skill rewards. "Next" → next step or quiz. |
| **quiz** | **Varied types:** multiple choice, **ranking** (reorder options with ↑/↓, then "Check order" → feedback, then "Next"), **rewrite** (pick best rewrite of a phrase), **scenario judgment** (scenario + multiple choice). Per-option explanation (why right/wrong, impact, example). If wrong: correct answer + explanation. "Next" → next question or reflection. |
| **reflection** | Text prompt + textarea. "Complete Day" → **key takeaway** screen (memory hook for the day), then "Back to map" → day marked complete, return to map. |
| **key_takeaway** | End-of-day memory hook (e.g. Day 1: "Community over ego"). Shows Perfect Day Bonus +100 XP if quiz was all correct. "Back to map" persists completion and unlocks next day in 24h. |

**Gold-standard structure (Day 1 pattern, applied to all days):** (1) **Opening emotional hook** (interactive choice); (2) **6–10 micro lessons** with varied types: choice, tap mistake, fix sentence, choose better, emotion recognition; (3) **2–3 micro challenges** (quick decisions, mistake spotting, risk-based decisions, etc.); (4) **3 AI scenarios** with different goals (e.g. emotional response, efficiency, recovery); (5) **Full multi-step simulation** (multiple characters, branching, decision + AI mix); (6) **Varied quiz types**: multiple choice, **ranking** (reorder steps), **rewrite** (pick best phrasing), **scenario judgment**; (7) **Reflection**; (8) **Strong key takeaway**. Each day feels different in learning style; wrong answers always include: why wrong, impact on member, correct behavior. Target time per day: 20–30 minutes.

**XP:** +10 per lesson, +50 day complete, +100 perfect quiz, **+100 Perfect Day Bonus** (when all quiz correct and user completes the day). **Hearts:** Start at 5; −1 per wrong quiz answer. **Skill scores** (Communication / Safety / Sales / Teamwork, 0–100) shown in header; updated from quiz, AI scenarios, and simulations.

---

## 4. Progress and resume

- **API:** `GET /api/admin/onboarding/progress` returns `xp_total`, `streak_days`, `hearts_remaining`, `skill_scores`, `day_completion`.
- **day_completion[day]:** `completed`, `lesson_index`, `current_step`, **`completed_at`** (ISO timestamp when day was completed; used for 24h unlock of next day).
- **24h unlock:** Day N (N ≥ 2) is unlocked only if day N−1 is completed **and** `now - completed_at[N−1] ≥ 24 hours`. Otherwise the map shows a countdown (e.g. "Unlocks in 18h 20m").
- **Resume:** `current_step` is the linear index: lessons → scenarios → simulation steps (if any) → quiz → reflection. When user opens a day that is not completed, they are restored to that step (lesson, scenario, simulation step, or quiz index).
- **PATCH** with `action: "lesson"` (and optional `current_step`) or `action: "save_step"` (day + current_step) persists progress. **`action: "day_complete"`** accepts optional **`perfect_day: true`** for +100 XP Perfect Day Bonus.

---

## 5. Day 1 — The Leo Mây Way (Culture) — Gold standard

**Title (EN/VI):** The Leo Mây Way / Cách Leo Mây

### 5.1 Opening hook + lessons + micro challenges

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 0 | Opening — What do you notice? | choice | **Emotional hook.** "A member just walked in. What do you notice first?" Options: Their bag; How busy the gym is; **Their body language and energy**. Teaches reading the person first. |
| 1 | First Impression | choice | "What do you do in the first 5 seconds?" Make eye contact, smile, walk toward them (correct). Per-option explanations. |
| 2–4 | What is Leo Mây, Core Philosophy, Energy Training | text / list | Philosophy, energy (eye contact, smile, walk toward member). |
| 5–6 | Good vs Bad, Member Types | goodvsbad / list | Bad vs good phrasing; member types (nervous, confident, lost). |
| 7–8 | Choose Better, Fix the Sentence | choose_better / fix_sentence | Waiver response; fix dismissive sentence. Wrong/right + impact. |
| 9 | Emotion recognition | choice | "Fidgeting, avoiding eye contact — what are they feeling?" Nervous/Confident/Annoyed. Teaches reading cues. |
| 10 | Micro challenge — Quick decision | choice | "Someone at counter, someone at door. Who first?" First-come-first-seen. |
| 11 | Micro challenge — Mistake spotting | tap_mistake | Tap the wrong phrase in a paragraph ("Just go over there and sign the form"). Why wrong, impact, correct. |

### 5.2 Simulation (Day 1) — 4 steps

**Title:** Who do you help first? / Bạn giúp ai trước?

- **Steps:** Mix of **decision** (who to help first, etc.) and **ai_response** (free-text reply evaluated). Each wrong decision shows why wrong, impact on member experience, and what to do instead.
- **Result:** Branching result screen (Peak Hour Completed / Needs Improvement) with XP and skill rewards.

### 5.3 Key takeaway (Day 1)

**"Community over ego"** / "Cộng đồng hơn cái tôi"

### 5.4 Scenarios (3 — emotional, efficiency, recovery)

| # | Goal | Title | Prompt (EN) |
|----|------|-------|-------------|
| 1 | **Emotional** | Nervous Beginner | First-timer: "I've never climbed before. I'm scared." Warmth, normalize fear, offer help. |
| 2 | **Efficiency** | Confident Climber | Regular in a hurry. Be efficient but warm; no overload. |
| 3 | **Recovery** | Ignored Member | Standing 2 min while staff chatted. Acknowledge, apologize briefly, help now. |

### 5.5 Quiz (varied types)

| # | Type | Question (EN) |
|---|------|----------------|
| 1 | **ranking** | Put in order: Make eye contact and walk toward them → Smile and greet → Ask what they need → Help with next step. Reorder with ↑/↓, then "Check order". |
| 2 | multiple_choice | In the first 5 seconds when a member walks in, you should: … |
| 3 | **scenario_judgment** | A member is confused and a teammate says "That's not my job." What does Leo Mây stand for? (Community over ego.) |
| 4 | **rewrite** | Best rewrite of "Go sign there" in Leo Mây tone. |
| 5–6 | multiple_choice | Energy elements; nervous member needs reassurance. |

**Reflection (EN):** What energy should Leo Mây feel like?

---

## 6. Day 2 — Experience & Safety (safety + legal language)

**Title (EN/VI):** Experience & Safety / Trải nghiệm & An toàn  
**Focus:** Safety + legal language; correction exercises; risk-based decisions.

### 6.1 Opening hook + lessons + micro challenges

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 0 | Opening — Safety first | choice | **Hook.** "First-timer says: Is it safe? I'm scared I'll fall. What do you notice first?" Acknowledge fear + explain how we minimize risk (correct). |
| 1–7 | Fear is Normal … Tap the mistake | text, list, goodvsbad, reorder_steps, tap_mistake | Fear normal; safety language (never 100% safe); first climb flow; legal rules; reorder steps; tap "100% safe". |
| 8–9 | Micro challenge — Risk-based decision; Correction | choice / fix_sentence | Who tries hard route first visit? Suggest easy start. Fix "Don't worry, nothing bad will happen." |

### 6.2 Simulation (Day 2) — 3 steps

Multi-step simulation (decision / ai_response steps). Branching result screen with XP and skill rewards.

### 6.3 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Scared Climber | A climber says: "I'm too scared to try." How do you respond? | Acknowledge the fear. Offer support. Don't push. | I understand — that's normal; lots feel that way; I'm here to support you; we can start when you're ready or just watch; no pressure. |
| 2 | Overconfident Climber | A climber skips warm-up and heads straight to a hard route. What do you say? | Kindly suggest warm-up. Safety first. | Quick suggestion — warm-up helps prevent injuries, gets muscles ready; couple minutes; want me to show you a few moves? |
| 3 | Parent with Child | A parent asks: "Is it safe for my 6-year-old?" How do you respond? | Explain our approach. Don't guarantee. Emphasize supervision. | Lots of kids that age; we guide safely — harness, easy routes, close supervision; we never say 100% safe; we minimize risks; adult with them; would you like to see the kids area first? |

### 6.4 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | When a climber says they're scared, you should: | Tell them not to worry; **Acknowledge the fear and offer support**; Ignore it and continue | 2nd |
| 2 | Correct safety language is: | "This is 100% safe"; **"We guide you safely, but risks exist"**; "Nothing bad ever happens" | 2nd |
| 3 | First climb flow includes: | **Shoes, warm-up, easy route**; Go straight to hard route; Skip warm-up if in a hurry | 1st |
| 4 | You should never: | Suggest warm-up; **Guarantee 100% safety**; Acknowledge fear | 2nd |
| 5 | With a parent and child, emphasize: | No risks at all; **Supervision and our guidance**; Let kids run free | 2nd |

**Reflection (EN):** How can you make a scared climber feel supported?

---

## 7. Day 3 — Role & Responsibility (ownership + prioritization)

**Title (EN/VI):** Role & Responsibility / Vai trò & Trách nhiệm  
**Focus:** Ownership + prioritization; decision trees.

### 7.1 Opening hook + lessons + micro challenges

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 0 | Opening — Who owns it? | choice | **Hook.** Spill + member at counter + teammate busy. "What do you notice first?" I should handle the spill (correct). |
| 1–6 | Your Role Matters … Same culture | text, goodvsbad, list, choose_better, text | Role; Staff vs Frontdesk; ownership; handoff checklist; choose better (membership question); same culture. |
| 7–8 | Micro challenge — Decision tree; Prioritization | choice / choice | Member asks about membership (staff): escort and introduce (correct). Spill + member: signal member, fix spill, then help. |

### 7.2 Simulation (Day 3) — 3 steps

Multi-step simulation (decision steps). Branching result screen with XP and skill rewards.

### 7.3 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Ownership | You see a spill. No one else notices. What do you do? | Own it. | Clean it or get a mop right away; if I see it, I own it; spill is safety risk and bad for vibe; I'll handle it. |
| 2 | Handoff | A member needs something only frontdesk can do. You're staff. What do you do? | Escort, introduce, don't abandon. | Walk them to frontdesk and introduce: "This is [Name] — they need help with [X]"; wouldn't just point "go over there"; hand off properly. |
| 3 | Busy Moment | You're busy. A member waits. Another staff is free. What do you do? | Signal your teammate. Don't ignore the member. | Eye contact with member first — "One sec!" — then signal teammate to help; wouldn't let them stand there ignored; member comes first. |

### 7.4 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | Ownership means: | Ignore problems; **If you see it, you own it** | 2nd |
| 2 | Staff focus on: | Check-in only; **Routes, coaching, tasks** | 2nd |
| 3 | Frontdesk focus on: | Routes only; **Check-in, members, sales** | 2nd |
| 4 | When you see a spill: | Wait for someone else; **Clean it or get it cleaned** | 2nd |
| 5 | Both staff and frontdesk need: | Different cultures; **The same Leo Mây culture** | 2nd |

**Reflection (EN):** What does ownership mean to you?

---

## 8. Day 4 — Sales & System (sales conversations)

**Title (EN/VI):** Sales & System / Bán hàng & Hệ thống  
**Focus:** Sales conversations; persuasion-based interactions.

### 8.1 Opening hook + lessons + micro challenges

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 0 | Opening — Sales conversation | choice | **Hook.** Day-pass member loves gym, comes every week. "What do you notice?" They might benefit from membership — we can help (correct). |
| 1–6 | Selling = Helping … When to mention membership | text, list, fix_sentence, list | Selling = helping; merch conversation; system basics; fix sentence; check-in flow; when to mention membership. |
| 7–8 | Micro challenge — Persuasion; When to mention | choose_better / choice | "I'm not sure I need a membership" → no-pressure, value reframe (correct). First-time day pass: brief no-pressure mention (correct). |

### 8.2 Simulation (Day 4) — 3 steps

Multi-step simulation (decision steps). Branching result screen with XP and skill rewards.

### 8.3 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Upsell | A day-pass member loves the gym. How do you mention membership? | Help, don't push. | Sounds like you're enjoying it! If you're here often, membership could save you money — part of the community; no pressure; just mentioning in case it helps. |
| 2 | Merch | Member admires a chalk bag. What do you say? | Natural mention. | Nice one, right? We have those — and a few other colors. Let me know if you want to check them out. |
| 3 | Check-in Flow | Describe the check-in flow in one sentence. | QR → verify → confirm | Scan their QR, verify membership or day-pass, confirm they're in, and they're good to go. |

### 8.4 Quiz

| # | Question (EN) | Options (EN) | Correct |
|---|---------------|--------------|---------|
| 1 | Selling at Leo Mây means: | Pushing products; **Helping members find what they need** | 2nd |
| 2 | Merch talk should be: | Aggressive; **Natural and helpful** | 2nd |
| 3 | Check-in uses: | Manual entry only; **QR scan, verify membership** | 2nd |
| 4 | POS is for: | Climbing only; **Add items, checkout** | 2nd |
| 5 | Inventory includes: | **Stock in and out**; Only climbing routes | 1st |

**Reflection (EN):** How can you make selling feel like helping?

---

## 9. Day 5 — Team & Excellence (chaos + multitasking)

**Title (EN/VI):** Team & Excellence / Đội & Xuất sắc  
**Focus:** Chaos + multitasking; fast-paced simulations.

### 9.1 Opening hook + lessons + micro challenges

| # | Title (EN) | Type | Content summary |
|---|------------|------|-----------------|
| 0 | Opening — Chaos moment | choice | **Hook.** Three at counter, spill, teammate with group. "What do you notice first?" Safety first (spill), then acknowledge three, then backup (correct). |
| 1–6 | Busy Gym … Choose the Better Response | text, goodvsbad, choose_better | Busy: calm, prioritize, communicate; ownership; team communication; invisible work; good vs great; choose better (teammate overwhelmed). |
| 7–8 | Micro challenge — Fast decision; Multitasking | choice / choice | Two at counter (one on phone, one ready): serve the one ready. Helping member + teammate signals backup: acknowledge teammate, finish member, then help. |

### 9.2 Simulation (Day 5) — 3 steps

Multi-step simulation (decision steps). Branching result screen with XP and skill rewards.

### 9.3 Scenarios

| # | Title | Prompt (EN) | Hint | Perfect answer (EN summary) |
|----|-------|-------------|------|-----------------------------|
| 1 | Busy Moment | Three members at counter. One staff. What do you do? | Prioritize, acknowledge all, get backup. | Acknowledge everyone quickly — "I see you all, one moment" — then get backup; no one left feeling invisible; stay calm, prioritize, each person feels seen. |
| 2 | Invisible Work | You notice chalk bags are low. What do you do? | Restock or report. | Restock or let whoever handles inventory know; invisible work is what makes the gym run; if I see it, I own it. |
| 3 | Teammate Struggling | A teammate is overwhelmed. You have capacity. What do you do? | Offer help. | Ask: "Need a hand? I can take [X]." Community over ego — we cover for each other; no one gets left behind. |

### 9.4 Quiz

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
- **Scoring:** Rule-based: base 60; +10 per good keyword hit; −15 per bad keyword; +5 for length > 30 chars; +5 for > 80 chars. Capped 0–100. Evaluation dimensions: friendliness, clarity, safety correctness, helpfulness, Leo Mây tone.
- **whyNot100:** Built from: phrases to avoid (bad keywords used), what was missing (good keywords), length note, and rubric criteria for 100 (from scenario content). All content is in EN or VI per `locale`.
- **UI:** After submit, user sees score, feedback, "Why not 100 points?" (if < 100), and "Perfect answer (100 points)" in Leo Mây tone.

---

## 11. Lesson and quiz feedback (wrong-answer rule)

- **Rule:** For **any** incorrect answer (lesson choice, choose_better, fix_sentence, tap_mistake, reorder_steps, or quiz), the UI shows: **why** it's wrong, **what** is correct, **how** it impacts member experience, and an **example** of correct phrasing or behavior.
- **Quiz:** Each question has **explanationsEn** and **explanationsVi** (one per option). Correct option: why it's right, examples, Leo Mây values. Wrong options: why wrong, impact on member, what to do instead; empathy framing when the question is about another person.
- **Lesson types with feedback:** **choice** uses `correctChoiceIndex` and `choiceExplanations`; **choose_better** / **fix_sentence** / **tap_mistake** use `wrongExplanation` and `rightExplanation` (or `tapMistakeExplanation`); **reorder_steps** shows correct order and feedback on submit.
- **UI:** After selection/submit, the card shows the chosen option's explanation; if wrong, also "The right answer" and correct explanation in a green box. User then clicks "Next" to continue.

---

## 12. APIs

| API | Purpose |
|-----|---------|
| `GET /api/admin/onboarding/progress` | Get/create progress: `xp_total`, `streak_days`, `hearts_remaining`, `skill_scores` (C/S/$/T 0–100), `day_completion` (per day: `completed`, `lesson_index`, `current_step`, **`completed_at`** ISO timestamp for 24h unlock). |
| `PATCH /api/admin/onboarding/progress` | Update progress. Body: `action` ("lesson" \| "day_complete" \| "quiz" \| "lose_heart" \| "save_step"), and as needed: `day`, `lesson_index`, `current_step`, `quiz_perfect`, **`perfect_day: true`** (with day_complete for +100 XP Perfect Day Bonus). |
| `POST /api/admin/onboarding/ai-evaluate` | Score scenario response. Body: `day`, `scenario_key`, `user_response`, `locale`. Returns score, feedback, whyNot100, perfectAnswer. |

---

## 13. Data and content source

| Item | Location |
|------|----------|
| **Content (all 5 days)** | `lib/onboardingContent.ts`: `DAY1`–`DAY5` (sections, scenarios, simulationSteps, quiz, reflection, keyTakeaway), `getDayContent`, `getLessonContent`, `getQuizContent`, `stepToPhase`, `phaseToStep`. Lesson types: text, choice, goodvsbad, list, choose_better, fix_sentence, reorder_steps, tap_mistake. Simulation steps: `SimulationStepDecision` or `SimulationStepAI`. |
| **Progress tables** | `supabase/migrations/041_onboarding.sql`: `onboarding_progress`, `onboarding_day_completion`, `onboarding_ai_sessions`. `042_onboarding_resume.sql`: adds `current_step` to `onboarding_day_completion`. Day completion stores **`completed_at`** (ISO) for 24h unlock of next day. |
| **Constants** | `XP_LESSON` (10), `XP_DAY_COMPLETE` (50), `XP_PERFECT_QUIZ` (100), `XP_PERFECT_DAY_BONUS` (100), `HEARTS_MAX` (5). Skill scores: Communication, Safety, Sales, Teamwork (0–100). |

---

## 14. Components (onboarding page)

| Component | Role |
|-----------|------|
| **OnboardingPage** | State: progress, currentDay, phase, lesson/scenario/quiz indices, scenario response/result, reflection text, simulation step. Handles start day (with resume), lesson next, scenario submit/next, simulation step/result, quiz select/next, reflection submit. |
| **LessonCard** | Renders one section: **text**, **choice** (with correctChoiceIndex + choiceExplanations), **goodvsbad**, **list**, **choose_better**, **fix_sentence**, **reorder_steps**, **tap_mistake**. For wrong answers shows why wrong, what's correct, impact, example. Next / "Back to map". |
| **ScenarioCard** | Scenario title, prompt, hint; textarea; Submit → score, whyNot100, perfect answer; Next. |
| **QuizCard** | Question, option buttons (green/red on select); after select: explanation for chosen option, and if wrong the correct answer + its explanation; Next. |
| **Simulation** | Multi-step flow: scene + characters; per step either **decision** (options + wrong/right feedback) or **ai_response** (free text + evaluation). End: branching result screen (Peak Hour Completed / Needs Improvement) with XP and skill rewards. |

All content is localized via `locale` (EN/VI) from the header toggle and passed into the content getters and API (`locale` in ai-evaluate body).
