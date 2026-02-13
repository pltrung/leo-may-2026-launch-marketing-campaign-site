import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { waitlistSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, phone, cloud_type } = parsed.data;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env vars");
      return NextResponse.json(
        { error: "Server misconfigured. Please contact support." },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase.from("waitlist").insert({
      name: name.trim(),
      email: (email?.trim() || null) as string | null,
      phone: (phone?.trim() || null) as string | null,
      cloud_type: cloud_type.trim(),
    });

    if (error) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { error: message.includes("env") ? "Server misconfigured." : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
