/**
 * POST /api/marketing/track-attribution
 * Public endpoint. Captures UTM params and click IDs for attribution.
 * Call on landing (with optional anonymous_id) or after signup (with Authorization + user resolved).
 * First-touch: we store the earliest touch per user. Last-touch: we update on subsequent touches.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

function parseBody(body: unknown): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  landing_path?: string;
  landing_url?: string;
  anonymous_id?: string;
  session_id?: string;
} {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return {
    utm_source: typeof b.utm_source === "string" ? b.utm_source.trim() || undefined : undefined,
    utm_medium: typeof b.utm_medium === "string" ? b.utm_medium.trim() || undefined : undefined,
    utm_campaign: typeof b.utm_campaign === "string" ? b.utm_campaign.trim() || undefined : undefined,
    utm_content: typeof b.utm_content === "string" ? b.utm_content.trim() || undefined : undefined,
    utm_term: typeof b.utm_term === "string" ? b.utm_term.trim() || undefined : undefined,
    fbclid: typeof b.fbclid === "string" ? b.fbclid.trim() || undefined : undefined,
    gclid: typeof b.gclid === "string" ? b.gclid.trim() || undefined : undefined,
    ttclid: typeof b.ttclid === "string" ? b.ttclid.trim() || undefined : undefined,
    landing_path: typeof b.landing_path === "string" ? b.landing_path.trim() || undefined : undefined,
    landing_url: typeof b.landing_url === "string" ? b.landing_url.trim() || undefined : undefined,
    anonymous_id: typeof b.anonymous_id === "string" ? b.anonymous_id.trim() || undefined : undefined,
    session_id: typeof b.session_id === "string" ? b.session_id.trim() || undefined : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const params = parseBody(body);

    const hasAnyAttribution =
      params.utm_source ||
      params.utm_medium ||
      params.utm_campaign ||
      params.fbclid ||
      params.gclid ||
      params.ttclid;
    if (!hasAnyAttribution) {
      return NextResponse.json({ ok: true, stored: false, reason: "no_attribution_params" });
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anonKey) {
        const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
        const { data: { user }, error } = await authClient.auth.getUser(token);
        if (!error && user?.id) {
          const supabase = createServerClient();
          const { data: profile } = await supabase
            .from("member_profiles")
            .select("id")
            .eq("auth_id", user.id)
            .maybeSingle();
          if (profile?.id) userId = profile.id as string;
        }
      }
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();
    const row = {
      first_touch_source: params.utm_source ?? null,
      first_touch_medium: params.utm_medium ?? null,
      first_touch_campaign: params.utm_campaign ?? null,
      first_touch_content: params.utm_content ?? null,
      first_touch_term: params.utm_term ?? null,
      fbclid: params.fbclid ?? null,
      gclid: params.gclid ?? null,
      ttclid: params.ttclid ?? null,
      landing_path: params.landing_path ?? null,
      landing_url: params.landing_url ?? null,
      anonymous_id: params.anonymous_id ?? null,
      session_id: params.session_id ?? null,
      raw_params: { ...params },
      updated_at: now,
    };

    if (userId) {
      const { data: existing } = await supabase
        .from("marketing_attribution")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("marketing_attribution")
          .update({
            last_touch_source: params.utm_source ?? null,
            last_touch_medium: params.utm_medium ?? null,
            last_touch_campaign: params.utm_campaign ?? null,
            last_touch_content: params.utm_content ?? null,
            last_touch_at: now,
            updated_at: now,
          })
          .eq("user_id", userId);
      } else {
        await supabase.from("marketing_attribution").insert({
          user_id: userId,
          ...row,
          first_touch_at: now,
        });
      }
    } else {
      await supabase.from("marketing_attribution").insert({
        ...row,
        first_touch_at: now,
      });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to store attribution" }, { status: 500 });
  }
}
