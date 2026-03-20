/**
 * POST /api/member/campaign-redeem
 * Authorization: Bearer <access_token>
 * Body: { code: string }
 * Redeems a campaign promo code. Reward from campaign_logs.promo_kind when set; else legacy segment mapping.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { resolveCampaignReward, type CampaignPromoKind } from "@/lib/campaignSegments";
import { CAMPAIGN_MEMBERSHIP_DISCOUNT_PLAN_IDS } from "@/lib/newbieGraduateSale";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MEMBERSHIP_HISTORY_PLAN_IDS = [...CAMPAIGN_MEMBERSHIP_DISCOUNT_PLAN_IDS] as string[];

async function guestPassFriendEligible(
  supabase: ReturnType<typeof createServerClient>,
  memberId: string
): Promise<{ ok: true } | { ok: false; messageEn: string; messageVi: string }> {
  const { data: profile } = await supabase
    .from("member_profiles")
    .select("membership_status, membership_expires_at, visits_remaining")
    .eq("id", memberId)
    .maybeSingle();
  if (!profile) {
    return { ok: false, messageEn: "Member not found.", messageVi: "Không tìm thấy thành viên." };
  }
  const visits = (profile.visits_remaining as number) ?? 0;
  const exp = profile.membership_expires_at ? new Date(profile.membership_expires_at as string) : null;
  const hasActiveDay =
    (profile.membership_status as string) === "active" &&
    exp !== null &&
    !Number.isNaN(exp.getTime()) &&
    exp.getTime() > Date.now();
  const hasAccess = visits > 0 || !!hasActiveDay;

  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("status", "success")
    .in("plan_id", MEMBERSHIP_HISTORY_PLAN_IDS);

  const everMembership = (count ?? 0) > 0;
  if (hasAccess && everMembership) {
    return {
      ok: false,
      messageEn:
        "This guest pass is for friends who are inactive or have never had a membership. Active members can share a different invite code from their dashboard.",
      messageVi:
        "Vé khách này dành cho bạn bè đang không hoạt động hoặc chưa từng có gói thành viên. Thành viên đang hoạt động có thể dùng mã mời khác trên dashboard.",
    };
  }
  return { ok: true };
}

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

  const { data: recipientCode, error: rcError } = await supabase
    .from("campaign_recipient_codes")
    .select("id, campaign_log_id, member_id")
    .eq("promo_code", rawCode)
    .maybeSingle();
  if (rcError) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  let campaignLogId: string;
  let segment: string;
  let promoKind: CampaignPromoKind | null = null;
  let recipientCodeId: string | null = null;
  let isRecipient = false;
  let recipientIds = new Set<string>();

  if (recipientCode) {
    campaignLogId = recipientCode.campaign_log_id;
    recipientCodeId = recipientCode.id;
    const recipientId = recipientCode.member_id;
    recipientIds = new Set([recipientId]);
    isRecipient = member.id === recipientId;
    const { data: log } = await supabase
      .from("campaign_logs")
      .select("segment, promo_kind")
      .eq("id", campaignLogId)
      .maybeSingle();
    if (!log) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
    }
    segment = log.segment as string;
    promoKind = (log.promo_kind as CampaignPromoKind | null) ?? null;
    const { data: existingRedemption } = await supabase
      .from("campaign_code_redemptions")
      .select("id")
      .eq("campaign_recipient_code_id", recipientCodeId)
      .maybeSingle();
    if (existingRedemption) {
      return NextResponse.json({
        success: true,
        alreadyRedeemed: true,
        message: "This code has already been used.",
      });
    }
  } else {
    const { data: campaignLog, error: logError } = await supabase
      .from("campaign_logs")
      .select("id, segment, promo_kind")
      .eq("promo_code", rawCode)
      .maybeSingle();
    if (logError) {
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
    if (!campaignLog) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
    }
    campaignLogId = campaignLog.id;
    segment = campaignLog.segment as string;
    promoKind = (campaignLog.promo_kind as CampaignPromoKind | null) ?? null;
    const { data: recipientRows } = await supabase
      .from("campaign_log_recipients")
      .select("member_id")
      .eq("campaign_log_id", campaignLogId);
    recipientIds = new Set((recipientRows ?? []).map((r: { member_id: string }) => r.member_id));
    isRecipient = recipientIds.has(member.id);
    const { data: existing } = await supabase
      .from("campaign_code_redemptions")
      .select("id")
      .eq("campaign_log_id", campaignLogId)
      .eq("member_id", member.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyRedeemed: true,
        message: "You have already redeemed this code.",
      });
    }
  }

  const resolved = resolveCampaignReward(promoKind, segment);

  if (resolved.kind === "guest_pass") {
    if (recipientIds.size > 0 && isRecipient) {
      return NextResponse.json(
        {
          error:
            "This guest pass code was sent to you to give to someone else. Share the code with a friend — only they can redeem it to add the guest pass to their profile.",
        },
        { status: 403 }
      );
    }
    if (promoKind === "guest_pass_friend") {
      const elig = await guestPassFriendEligible(supabase, member.id);
      if (!elig.ok) {
        return NextResponse.json({ error: elig.messageEn, errorVi: elig.messageVi }, { status: 403 });
      }
    }
  } else if (resolved.kind === "visits") {
    if (recipientIds.size > 0 && !isRecipient) {
      return NextResponse.json(
        {
          error: "This free visit code was sent to a different recipient. Only the person who received the email can redeem it.",
        },
        { status: 403 }
      );
    }
  } else if (resolved.kind === "membership_discount") {
    if (recipientIds.size > 0 && !isRecipient) {
      return NextResponse.json(
        {
          error: "This membership discount code was sent to a different recipient. Only the person who received the email can redeem it.",
        },
        { status: 403 }
      );
    }
  }

  const insertPayload: { campaign_log_id: string; member_id: string; campaign_recipient_code_id?: string } = {
    campaign_log_id: campaignLogId,
    member_id: member.id,
  };
  if (recipientCodeId) insertPayload.campaign_recipient_code_id = recipientCodeId;
  const { error: insertError } = await supabase.from("campaign_code_redemptions").insert(insertPayload);
  if (insertError) {
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("visits_remaining, guest_passes_remaining")
    .eq("id", member.id)
    .single();

  if (resolved.kind === "visits" && resolved.amount > 0) {
    const currentVisits = (profile?.visits_remaining as number) ?? 0;
    await supabase
      .from("member_profiles")
      .update({ visits_remaining: currentVisits + resolved.amount })
      .eq("id", member.id);
  } else if (resolved.kind === "guest_pass" && resolved.amount > 0) {
    const currentGuest = (profile?.guest_passes_remaining as number) ?? 0;
    await supabase
      .from("member_profiles")
      .update({ guest_passes_remaining: currentGuest + resolved.amount })
      .eq("id", member.id);
  } else if (resolved.kind === "membership_discount") {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + 90);
    await supabase
      .from("member_profiles")
      .update({
        campaign_membership_discount_percent: resolved.percent,
        campaign_membership_discount_until: until.toISOString(),
      })
      .eq("id", member.id);
  }

  const messageEn = `Code redeemed. ${resolved.labelEn}`;
  const messageVi = `Đã áp dụng mã. ${resolved.labelVi}`;

  const rewardSummary =
    resolved.kind === "visits"
      ? `${resolved.amount} free visit(s)`
      : resolved.kind === "guest_pass"
        ? `${resolved.amount} guest pass(es)`
        : `${resolved.percent}% off membership tiers`;

  return NextResponse.json({
    success: true,
    alreadyRedeemed: false,
    message: messageEn,
    messageVi,
    segment,
    reward: rewardSummary,
    rewardLabelEn: resolved.labelEn,
    rewardLabelVi: resolved.labelVi,
    promo_kind: promoKind,
  });
}
