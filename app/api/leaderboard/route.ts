import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { clouds } from "@/lib/cloudData";

export async function GET() {
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      const fallback = clouds.map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        accentHex: c.accentHex,
        count: 0,
      }));
      fallback.sort((a, b) => b.count - a.count);
      return NextResponse.json({ teams: fallback }, {
        headers: { "Cache-Control": "no-store, max-age=10" },
      });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("cloud_type");

    if (error) {
      console.error("Leaderboard query error:", error);
      const fallback = clouds.map((c) => ({ id: c.id, name: c.name, nameEn: c.nameEn, accentHex: c.accentHex, count: 0 }));
      fallback.sort((a, b) => b.count - a.count);
      return NextResponse.json({ teams: fallback }, {
        headers: { "Cache-Control": "no-store, max-age=10" },
      });
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const t = (row as { cloud_type?: string }).cloud_type;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }

    const teams = clouds.map((cloud) => ({
      id: cloud.id,
      name: cloud.name,
      nameEn: cloud.nameEn,
      accentHex: cloud.accentHex,
      count: counts.get(cloud.id) ?? 0,
    }));
    teams.sort((a, b) => b.count - a.count);
    return NextResponse.json({ teams }, {
      headers: { "Cache-Control": "no-store, max-age=10" },
    });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    const fallback = clouds.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      accentHex: c.accentHex,
      count: 0,
    }));
    fallback.sort((a, b) => b.count - a.count);
    return NextResponse.json({ teams: fallback }, {
      headers: { "Cache-Control": "no-store, max-age=10" },
    });
  }
}
