import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * Daily cron: find members expiring in 7 days, return list for reminder sending.
 * Call with: Authorization: Bearer <CRON_SECRET>
 * Vercel Cron: add to vercel.json crons
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  in7Days.setHours(23, 59, 59, 999);

  const { data: members, error } = await supabase
    .from("member_profiles")
    .select("id, full_name, email, phone, membership_expires_at, member_code")
    .eq("membership_status", "active")
    .lte("membership_expires_at", in7Days.toISOString())
    .gte("membership_expires_at", today.toISOString());

  if (error) {
    console.error("expiry-reminders error", error);
    return NextResponse.json({ error: "Failed to query" }, { status: 500 });
  }

  const reminders = (members ?? []).map((m) => {
    const expiry = m.membership_expires_at ? new Date(m.membership_expires_at as string) : null;
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / 86400000) : 0;
    return {
      member_id: m.id,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      member_code: m.member_code,
      expires_at: m.membership_expires_at,
      days_left: daysLeft,
      message: `Your Leo Mây membership expires in ${daysLeft} days. Renew now to keep climbing.`,
      message_vi: `Thẻ thành viên Leo Mây của bạn hết hạn trong ${daysLeft} ngày. Gia hạn ngay để tiếp tục leo.`,
    };
  });

  return NextResponse.json({
    count: reminders.length,
    reminders,
  });
}
