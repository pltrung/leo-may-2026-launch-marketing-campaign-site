import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const skill_level = typeof body.skill_level === "string" ? body.skill_level.trim() : undefined;
    const desired_tier = typeof body.desired_tier === "string" ? body.desired_tier.trim() : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const hasSupabase =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);

    if (hasSupabase) {
      try {
        const { createServerClient } = await import("@/lib/supabaseServer");
        const supabase = createServerClient();
        const { error } = await supabase.from("membership_interest").insert({
          name,
          email,
          skill_level: skill_level || null,
          desired_tier: desired_tier || null,
          notes: notes || null,
        });
        if (error) {
          console.error("membership_interest insert error:", error);
          return NextResponse.json(
            { error: "Failed to submit. Please try again." },
            { status: 500 }
          );
        }
      } catch (e) {
        console.error("Supabase membership_interest:", e);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 500 }
        );
      }
    } else {
      console.info("[gym/membership-interest]", { name, email, skill_level, desired_tier, notes });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
