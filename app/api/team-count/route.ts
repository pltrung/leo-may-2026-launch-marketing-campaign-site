import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const team = request.nextUrl.searchParams.get("team");
  if (!team) return NextResponse.json({ count: 0 }, { status: 200 });

  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      return NextResponse.json({ count: 0 });
    }

    const supabase = createServerClient();
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("cloud_type", team.trim());

    if (error) {
      console.error("Team count error:", team, error);
    }
    return NextResponse.json({ count: typeof count === "number" ? count : 0 });
  } catch (err) {
    console.error("Team count API error:", err);
    return NextResponse.json({ count: 0 });
  }
}
