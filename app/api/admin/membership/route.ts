import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

type MembershipAction = "extend" | "freeze" | "cancel" | "upgrade";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  try {
    const body = await req.json();
    const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
    const action = body.action as MembershipAction | undefined;

    if (!memberId || !action) {
      return NextResponse.json({ error: "member_id and action are required" }, { status: 400 });
    }

    const { data: current, error: currentErr } = await supabase
      .from("member_profiles")
      .select("id, tier, membership_status, membership_expires_at")
      .eq("id", memberId)
      .maybeSingle();

    if (currentErr) {
      throw currentErr;
    }
    if (!current) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const now = new Date();
    let nextStatus = (current.membership_status as string | null) || "active";
    let nextExpires = current.membership_expires_at as string | null;
    let nextTier = current.tier as string;

    if (action === "extend") {
      const base = current.membership_expires_at
        ? new Date(current.membership_expires_at as string)
        : now;
      const extended = new Date(base);
      extended.setMonth(extended.getMonth() + 1); // extend by 1 month
      nextExpires = extended.toISOString();
      nextStatus = "active";
    } else if (action === "freeze") {
      nextStatus = "frozen";
    } else if (action === "cancel") {
      nextStatus = "cancelled";
      nextExpires = null; // Clear expiry so all active membership is gone
    } else if (action === "upgrade") {
      // Simple example: upgrade tier label if not already a founder.
      if (nextTier !== "Founder Member") {
        nextTier = "Founder Member";
      }
      nextStatus = "active";
    }

    const { data: updated, error: updateErr } = await supabase
      .from("member_profiles")
      .update({
        membership_status: nextStatus,
        membership_expires_at: nextExpires,
        tier: nextTier,
        updated_at: now.toISOString(),
      })
      .eq("id", memberId)
      .select("id, tier, membership_status, membership_expires_at")
      .maybeSingle();

    if (updateErr) {
      throw updateErr;
    }
    if (!updated) {
      return NextResponse.json({ error: "Failed to update membership" }, { status: 500 });
    }

    const statusLabel =
      updated.membership_status === "frozen"
        ? "Frozen"
        : updated.membership_status === "cancelled"
        ? "Cancelled"
        : "Active";

    let validUntil = "March 2026";
    if (updated.membership_expires_at) {
      const d = new Date(updated.membership_expires_at as string);
      validUntil = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    return NextResponse.json({
      member: {
        status: statusLabel,
        membershipType: updated.tier,
        validUntil,
      },
    });
  } catch (error) {
    console.error("admin membership error", error);
    return NextResponse.json({ error: "Failed to update membership" }, { status: 500 });
  }
}

