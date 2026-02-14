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
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const supabase = createServerClient();
    const teams = await Promise.all(
      clouds.map(async (cloud) => {
        const { count, error } = await supabase
          .from("waitlist")
          .select("*", { count: "exact", head: true })
          .eq("cloud_type", cloud.id);
        if (error) {
          console.error("Leaderboard count error for", cloud.id, error);
        }
        return {
          id: cloud.id,
          name: cloud.name,
          nameEn: cloud.nameEn,
          accentHex: cloud.accentHex,
          count: typeof count === "number" ? count : 0,
        };
      })
    );
    teams.sort((a, b) => b.count - a.count);
    return NextResponse.json({ teams }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
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
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
