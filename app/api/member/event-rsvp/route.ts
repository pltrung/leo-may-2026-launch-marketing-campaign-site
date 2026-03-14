import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET ?event_id=xxx
 * Returns { count, user_rsvped }
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const eventId = req.nextUrl.searchParams.get("event_id")?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }
  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { count, error } = await supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) {
      console.error("event-rsvp get count error", error);
      return NextResponse.json({ error: "Failed to load RSVPs" }, { status: 500 });
    }

    const { data: userRsvp } = await supabase
      .from("event_rsvps")
      .select("id")
      .eq("event_id", eventId)
      .eq("member_id", member.id)
      .maybeSingle();

    return NextResponse.json({
      count: count ?? 0,
      user_rsvped: !!userRsvp,
    });
  } catch (e) {
    console.error("event-rsvp get error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST body: { event_id: string }
 * Adds RSVP. Returns { count, user_rsvped: true }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const eventId = typeof body.event_id === "string" ? body.event_id.trim() : null;
    if (!eventId) {
      return NextResponse.json({ error: "event_id required" }, { status: 400 });
    }
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await supabase
      .from("event_rsvps")
      .upsert({ event_id: eventId, member_id: member.id }, { onConflict: "event_id,member_id" });

    const { count, error } = await supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) {
      return NextResponse.json({ count: 0, user_rsvped: true });
    }

    return NextResponse.json({ count: count ?? 0, user_rsvped: true });
  } catch (e) {
    console.error("event-rsvp post error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
