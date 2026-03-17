/**
 * POST /api/member/campaign-redeem
 * Authorization: Bearer <access_token>
 * Body: { code: string }
 * Redeems a campaign promo code for the current member. One redemption per campaign per member.
 * Reward is segment-specific (see getRewardForSegment in campaignSegments).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { getRewardForSegment } from "@/lib/campaignSegments";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawCode = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: member, error: memberError } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (memberError || !member?.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { data: campaignLog, error: logError } = await supabase
    .from("campaign_logs")
    .select("id, segment")
    .eq("promo_code", rawCode)
    .maybeSingle();
  if (logError) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!campaignLog) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  }

  const reward = getRewardForSegment(campaignLog.segment);
  const { data: recipientRows } = await supabase
    .from("campaign_log_recipients")
    .select("member_id")
    .eq("campaign_log_id", campaignLog.id);
  const recipientIds = new Set((recipientRows ?? []).map((r: { member_id: string }) => r.member_id));
  const isRecipient = recipientIds.has(member.id);

  if (reward.type === "guest_pass") {
    if (recipientIds.size > 0 && isRecipient) {
      return NextResponse.json(
        { error: "This guest pass code was sent to you to give to someone else. Share the code with a friend — only they can redeem it to add the guest pass to their profile." },
        { status: 403 }
      );
    }
  } else if (reward.type === "visits") {
    if (recipientIds.size > 0 && !isRecipient) {
      return NextResponse.json(
        { error: "This free visit code was sent to a different recipient. Only the person who received the email can redeem it." },
        { status: 403 }
      );
    }
  }

  const { data: existing } = await supabase
    .from("campaign_code_redemptions")
    .select("id")
    .eq("campaign_log_id", campaignLog.id)
    .eq("member_id", member.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyRedeemed: true,
      message: "You have already redeemed this code.",
    });
  }

  const { error: insertError } = await supabase
    .from("campaign_code_redemptions")
    .insert({
      campaign_log_id: campaignLog.id,
      member_id: member.id,
    });
  if (insertError) {
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }

  // Apply segment-specific reward: visits (for lapsed) or guest_pass (for active membership / active visit pass)
  const { data: profile } = await supabase
    .from("member_profiles")
    .select("visits_remaining, guest_passes_remaining")
    .eq("id", member.id)
    .single();

  if (reward.type === "visits" && reward.amount > 0) {
    const currentVisits = (profile?.visits_remaining as number) ?? 0;
    await supabase
      .from("member_profiles")
      .update({ visits_remaining: currentVisits + reward.amount })
      .eq("id", member.id);
  } else if (reward.type === "guest_pass" && reward.amount > 0) {
    const currentGuest = (profile?.guest_passes_remaining as number) ?? 0;
    await supabase
      .from("member_profiles")
      .update({ guest_passes_remaining: currentGuest + reward.amount })
      .eq("id", member.id);
  }

  const messageEn = `Code redeemed. ${reward.labelEn}.`;
  const messageVi = `Đã áp dụng mã. ${reward.labelVi}.`;

  return NextResponse.json({
    success: true,
    alreadyRedeemed: false,
    message: messageEn,
    messageVi,
    segment: campaignLog.segment,
    reward: reward.type === "visits" ? `${reward.amount} free visit(s)` : `${reward.amount} guest pass(es)`,
    rewardLabelEn: reward.labelEn,
    rewardLabelVi: reward.labelVi,
  });
}
