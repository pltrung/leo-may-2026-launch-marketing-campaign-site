import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/member/profile
 * Returns profile fields (profile_photo_url, id_number, date_of_birth) for current member.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: member, error } = await supabase
      .from("member_profiles")
      .select("id, profile_photo_url, id_number, date_of_birth, full_name, email, phone")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("profile get error", error);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({
      profile: {
        profile_photo_url: member.profile_photo_url ?? null,
        id_number: member.id_number ?? null,
        date_of_birth: member.date_of_birth ?? null,
        full_name: member.full_name ?? null,
        email: member.email ?? null,
        phone: member.phone ?? null,
      },
    });
  } catch (e) {
    console.error("member profile get error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/member/profile
 * Body: { profile_photo_base64?: string, id_number?: string, date_of_birth?: string (YYYY-MM-DD) }
 * Updates profile and optionally uploads photo to storage.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const photoBase64 = typeof body.profile_photo_base64 === "string" ? body.profile_photo_base64.trim() : null;
    const idNumber = typeof body.id_number === "string" ? body.id_number.trim() || null : null;
    const dateOfBirth = typeof body.date_of_birth === "string" ? body.date_of_birth.trim() || null : null;

    let profilePhotoUrl: string | null = null;

    if (photoBase64) {
      const match = photoBase64.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid photo format. Use JPEG, PNG, or WebP." }, { status: 400 });
      }
      const mime = match[1];
      const ext = mime === "jpeg" ? "jpg" : mime;
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo too large (max 5MB)" }, { status: 400 });
      }

      const path = `${member.id}/photo.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("member-photos")
        .upload(path, buffer, {
          contentType: `image/${mime === "jpeg" ? "jpeg" : mime}`,
          upsert: true,
        });

      if (uploadErr) {
        console.error("profile photo upload error", uploadErr);
        return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("member-photos").getPublicUrl(uploadData.path);
      profilePhotoUrl = urlData.publicUrl;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (profilePhotoUrl !== null) updates.profile_photo_url = profilePhotoUrl;
    if (idNumber !== undefined) updates.id_number = idNumber;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth || null;

    const { error: updateErr } = await supabase
      .from("member_profiles")
      .update(updates)
      .eq("id", member.id);

    if (updateErr) {
      console.error("profile update error", updateErr);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("member profile post error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
