import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/newbie-class
 * Returns the member's next upcoming newbie class (time, location, coach, minutes until).
 * Auth: Bearer token.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!profile?.id) {
    return NextResponse.json({ newbie_class: null });
  }

  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from("newbie_class_bookings")
    .select("coaching_session_id")
    .eq("member_id", profile.id);
  const sessionIds = (bookings ?? []).map((b) => b.coaching_session_id).filter(Boolean);
  if (sessionIds.length === 0) return NextResponse.json({ newbie_class: null });

  const { data: sessions } = await supabase
    .from("coaching_sessions")
    .select("id, start_time, end_time, location, coach_id")
    .in("id", sessionIds)
    .gt("start_time", now)
    .in("status", ["scheduled"])
    .order("start_time", { ascending: true })
    .limit(1);

  const session = Array.isArray(sessions) ? sessions[0] : sessions;
  if (!session) return NextResponse.json({ newbie_class: null });

  let coachName: string | null = null;
  if (session.coach_id) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("email, display_name")
      .eq("id", session.coach_id)
      .single();
    coachName = (staff?.display_name as string) ?? (staff?.email as string) ?? null;
  }

  const startTime = new Date(session.start_time as string).getTime();
  const minutesUntil = Math.max(0, Math.round((startTime - Date.now()) / 60000));

  return NextResponse.json({
    newbie_class: {
      session_id: session.id,
      start_time: session.start_time,
      end_time: session.end_time,
      location: (session.location as string) ?? "Main Wall - Beginner Area",
      coach_name: coachName,
      minutes_until: minutesUntil,
    },
  });
}
