# Onboarding Specification Audit

This document checks the current `/onboarding` implementation against the full gamified training specification.

---

## ✅ IN PLACE

### 1. Time-based progression
- **Day 1** unlocked immediately; **Day N** unlocks 24 hours after previous day completion.
- **Stored:** `completed_at` timestamp on `onboarding_day_completion` (persisted on day complete).
- **UI:** Countdown (e.g. "Unlocks in 18h 20m"), refresh every 60s; future days locked visually (disabled/locked state on map).

### 2. Core principle (why / what / how)
- Wrong-answer feedback across lessons and quiz includes: **why** it’s wrong, **what** is correct, **how** it impacts the member, and **example** phrasing/behavior.
- Implemented for: **choice**, **choose_better**, **fix_sentence**, **tap_mistake**, **reorder_steps**, and **quiz** explanations.

### 3. Content depth (per day)
- **Lessons:** Day 1: 8; Day 2: 7; Day 3–5: 6 each → within 6–10.
- **Scenarios:** 3 per day (spec 3–5) → at minimum.
- **Simulation:** 1 multi-step simulation per day (Day 1: 4 steps; Days 2–5: 3 steps each).
- **Quiz:** 5 questions per day (within 5–8).
- **Interaction types:** At least 3 per day (text, choice, goodvsbad, list, choose_better, fix_sentence, reorder_steps, tap_mistake).
- **Reflection:** 1 per day.
- **Key takeaway:** 1 per day (e.g. "Community over ego", "Guide safely, never guarantee", "If you see it, you own it", "Selling is helping", "Make the team stronger").

### 4. Interaction types (expanded)
- **Multiple choice** (lesson + quiz).
- **Choose better response** (`choose_better`).
- **Fix the sentence** (`fix_sentence`).
- **Reorder steps** (`reorder_steps`).
- **Tap mistake** (`tap_mistake`).
- **Branching decision tree** (simulation decision steps).
- **Free-text AI response** (scenarios + simulation `ai_response` steps).
- **Wrong-answer rule:** For any incorrect answer, UI returns why wrong, correct answer, impact on member experience, and example phrasing.

### 5. AI coach mode (upgraded)
- User types response → system evaluates.
- **Returned:** score (0–100), feedback, **why not 100**, **perfect answer** (Leo Mây tone).
- **Evaluation:** Keyword/rubric-based (good/bad keywords, length, rubric). Design doc describes dimensions (friendliness, clarity, safety correctness, helpfulness, Leo Mây tone); implementation does not expose separate dimension scores.

### 6. Real-world simulation
- **One multi-step simulation per day** (Days 1–5).
- **Structure:** Scene, characters, 2–4 steps; steps are **decision** (multiple choice) or **ai_response** (free text evaluated).
- **Wrong decision:** Shows why it’s wrong, impact on member experience, and what should have been done (`wrongFeedbackEn/Vi` per option).
- **Result screen:** Branching “Peak Hour Completed” / “Needs Improvement” with XP and skill-style messaging.

### 7. Skill tracking (partial)
- **Stored and displayed:** `skill_scores` (communication, safety, sales, teamwork) on progress; shown in header as C / S / $ / T.
- **Not implemented:** Scores are **not** updated from quiz, AI scenarios, or simulations. Progress API only reads/returns (and defaults to 50,50,50,50). No API or logic writes `skill_scores` based on performance.

### 8. Gamification
- **Perfect Day Bonus:** +100 XP when `perfect_day: true` on day complete (and quiz all correct).
- **Streak:** `streak_days` tracked and shown (e.g. 🔥).
- **Hearts:** 5 hearts, −1 per wrong quiz answer.
- **Unlockable content:** **Not implemented** (no “hard mode” scenarios or “advanced lessons” unlock).

### 9. End-of-day memory hooks
- Each day has a **key takeaway** shown at end (e.g. Day 1: "Community over ego", Day 2: "Guide safely, never guarantee", Day 3: "If you see it, you own it", Day 4: "Selling is helping", Day 5: "Make the team stronger").

### 10. Design principles
- Card-based UI, short chunks, frequent interactions, fast feedback (score, explanations, next).

### 11. Data and APIs
- Progress: `GET/PATCH /api/admin/onboarding/progress` with `day_completion`, `completed_at`, `skill_scores`, `perfect_day`.
- AI: `POST /api/admin/onboarding/ai-evaluate` (score, feedback, whyNot100, perfectAnswer).
- Content: `lib/onboardingContent.ts` (all days, sections, scenarios, simulation steps, quiz, reflection, keyTakeaway).

---

## ❌ NOT IN PLACE (or partial)

### 1. Role-based / admin guided training
- **Spec:** Integrate onboarding with actual system usage: interactive walkthroughs for **Frontdesk** (member lookup, QR scan, POS checkout, payment), **Staff** (tasks dashboard, route assignment, coaching), **Admin** (analytics, staff operations); highlight UI elements, step-by-step guided flow, simulate actions.
- **Current:** Onboarding is a standalone flow. No links to `/admin` with highlighted UI or guided flows. No “highlight UI elements” or “step-by-step guided flow” inside onboarding.

### 2. Skill scores updates
- **Spec:** Update communication / safety / sales / teamwork from quiz, AI scenarios, and simulations.
- **Current:** `skill_scores` are stored and displayed but **never updated** by performance. No PATCH or dedicated API that writes `skill_scores` based on quiz results, scenario scores, or simulation outcomes.

### 3. Skill bars UI (minor)
- **Spec:** “Show skill bars: Communication: 82, Safety: 91”.
- **Current:** Header shows compact “C: / S: / $: / T:” with numbers, not full “Communication: 82” style bars.

### 4. Admin analytics for onboarding
- **Spec:** Track average AI score per staff, quiz accuracy, weakest skill areas, completion time; expose later in admin analytics.
- **Current:** AI sessions are stored (`onboarding_ai_sessions`) but there is **no** admin analytics view or API that exposes average AI score per staff, quiz accuracy, weakest skills, or completion time.

### 5. Unlockable content
- **Spec:** Hard mode scenarios, advanced lessons (unlockable).
- **Current:** No hard mode or advanced-lesson unlock flow.

---

## Summary

| Area                         | Status |
|-----------------------------|--------|
| Time-based progression      | ✅     |
| Core principle (why/what/how) | ✅  |
| Content depth (6–10 lessons, 3–5 scenarios, 1 sim, 5–8 quiz, etc.) | ✅ (scenarios at low end: 3/day) |
| Interaction types + wrong-answer rule | ✅ |
| AI coach (score, why not 100, perfect answer) | ✅ |
| Multi-step simulation (all days)      | ✅ |
| Skill tracking **display**           | ✅ |
| Skill tracking **updates** from activity | ❌ |
| Role-based guided training in /admin | ❌ |
| Gamification (Perfect Day, streak, hearts) | ✅ |
| Unlockable (hard mode, advanced)     | ❌ |
| End-of-day key takeaways            | ✅ |
| Admin analytics (AI score, quiz accuracy, etc.) | ❌ |

To fully match the spec, the main gaps are: **skill score updates** from quiz/AI/simulations, **role-based guided training** (walkthroughs tied to `/admin`), **admin analytics** for onboarding metrics, and **unlockable content** (hard mode / advanced lessons).
