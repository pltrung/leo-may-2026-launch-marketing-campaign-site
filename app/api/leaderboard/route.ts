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
        count: 1,
      }));
      fallback.sort((a, b) => b.count - a.count);
      return NextResponse.json({ teams: fallback });
    }

    const supabase = createServerClient();
    const teams = await Promise.all(
      clouds.map(async (cloud) => {
        const { count } = await supabase
          .from("waitlist")
          .select("id", { count: "exact", head: true })
          .eq("cloud_type", cloud.id);
        return {
          id: cloud.id,
          name: cloud.name,
          nameEn: cloud.nameEn,
          accentHex: cloud.accentHex,
          count: count ?? 1,
        };
      })
    );
    teams.sort((a, b) => b.count - a.count);
    return NextResponse.json({ teams });
  } catch {
    const fallback = clouds.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      accentHex: c.accentHex,
      count: 1,
    }));
    fallback.sort((a, b) => b.count - a.count);
    return NextResponse.json({ teams: fallback });
  }
}
