import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const preferred_date = typeof body.preferred_date === "string" ? body.preferred_date.trim() : undefined;
    const message = typeof body.message === "string" ? body.message.trim() : undefined;

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
        const { error } = await supabase.from("visit_requests").insert({
          name,
          email,
          phone: phone || null,
          preferred_date: preferred_date || null,
          message: message || null,
        });
        if (error) {
          console.error("visit_requests insert error:", error);
          return NextResponse.json(
            { error: "Failed to submit. Please try again." },
            { status: 500 }
          );
        }
      } catch (e) {
        console.error("Supabase visit_requests:", e);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 500 }
        );
      }
    } else {
      console.info("[gym/visit-request]", { name, email, phone, preferred_date, message });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
