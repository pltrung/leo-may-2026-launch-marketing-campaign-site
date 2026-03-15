import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getLevelProgress, getNextLevelReward, CLIMBER_LEVELS } from "@/lib/climberLevels";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface ProgressAchievement {
  code: string;
  name: string;
  name_vi: string | null;
  description: string | null;
  icon: string;
  reward: string | null;
  earned_at: string;
}

export interface UpcomingReward {
  type: "level" | "achievement";
  at_visits?: number;
  name: string;
  name_vi: string | null;
  reward: string | null;
  reward_vi: string | null;
}

/**
 * GET /api/member/progress
 * Authorization: Bearer <access_token>
 * Returns climbing progression: level, streak, recent achievements, upcoming rewards.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: profile, error: profileErr } = await supabase
      .from("member_profiles")
      .select("id, current_streak, best_streak")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profileErr || !profile?.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { count } = await supabase
      .from("gym_checkins")
      .select("id", { count: "exact", head: true })
      .eq("member_id", profile.id);

    const totalVisits = count ?? 0;
    const currentStreak = (profile.current_streak as number) ?? 0;
    const bestStreak = (profile.best_streak as number) ?? 0;

    const levelProgress = getLevelProgress(totalVisits);
    const nextLevelReward = getNextLevelReward(totalVisits);

    const { data: earnedRows, error: earnedErr } = await supabase
      .from("member_achievements")
      .select("earned_at, achievements(code, name, name_vi, description, icon, reward, reward_vi)")
      .eq("member_id", profile.id)
      .order("earned_at", { ascending: false })
      .limit(10);

    const recentAchievements: ProgressAchievement[] = [];
    if (!earnedErr && earnedRows) {
      for (const row of earnedRows) {
        const a = (row as { achievements?: { code: string; name: string; name_vi: string | null; description: string | null; icon: string; reward: string | null; reward_vi: string | null } }).achievements;
        if (a) {
          recentAchievements.push({
            code: a.code,
            name: a.name,
            name_vi: a.name_vi ?? null,
            description: a.description ?? null,
            icon: a.icon ?? "🏆",
            reward: a.reward ?? null,
            earned_at: (row as { earned_at: string }).earned_at,
          });
        }
      }
    }

    const earnedCodes = new Set(recentAchievements.map((x) => x.code));

    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("code, name, name_vi, requirement_type, requirement_value, reward, reward_vi")
      .order("display_order", { ascending: true });

    const upcomingRewards: UpcomingReward[] = [];

    if (nextLevelReward) {
      upcomingRewards.push({
        type: "level",
        at_visits: nextLevelReward.atVisits,
        name: `Level ${nextLevelReward.atVisits}`,
        name_vi: null,
        reward: nextLevelReward.reward,
        reward_vi: nextLevelReward.rewardVi,
      });
    }

    for (const a of allAchievements ?? []) {
      const ach = a as { code: string; name: string; name_vi: string | null; requirement_type: string; requirement_value: number | null; reward: string | null; reward_vi: string | null };
      if (earnedCodes.has(ach.code) || !ach.reward) continue;
      if (ach.requirement_type === "total_visits" && ach.requirement_value != null && totalVisits < ach.requirement_value) {
        upcomingRewards.push({
          type: "achievement",
          at_visits: ach.requirement_value,
          name: ach.name,
          name_vi: ach.name_vi,
          reward: ach.reward,
          reward_vi: ach.reward_vi,
        });
      }
    }

    const nextLevel = levelProgress.nextLevel;
    const nextLevelName = nextLevel ? nextLevel.name : null;
    const nextLevelNameVi = nextLevel ? (CLIMBER_LEVELS.find((l) => l.minVisits === nextLevel.minVisits)?.nameVi ?? null) : null;

    return NextResponse.json(
      {
        level: levelProgress.currentLevel.name,
        level_vi: levelProgress.currentLevel.nameVi,
        level_icon: levelProgress.currentLevel.icon,
        next_level: nextLevelName,
        next_level_vi: nextLevelNameVi,
        total_visits: totalVisits,
        progress_to_next: levelProgress.visitsToNextLevel,
        progress_percent: levelProgress.progressPercent,
        visits_in_level: levelProgress.visitsInLevel,
        next_level_at_visits: nextLevel?.minVisits ?? null,
        current_streak: currentStreak,
        best_streak: bestStreak,
        recent_achievements: recentAchievements,
        upcoming_rewards: upcomingRewards.slice(0, 5),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("member progress error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
