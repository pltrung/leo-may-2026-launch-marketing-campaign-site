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

    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error: insertError } = await supabase.from("waitlist").insert({
      name: name.trim(),
      email: (email?.trim() || null) as string | null,
      phone: (phone?.trim() || null) as string | null,
      cloud_type: cloud_type.trim(),
    });

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    const { count, error: countError } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Waitlist count error:", countError);
      return NextResponse.json(
        { success: true, position: 1 },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      position: count ?? 1,
    });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
