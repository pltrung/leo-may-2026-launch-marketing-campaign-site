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
      .select("id, profile_photo_url, id_number, date_of_birth, full_name, display_name, email, phone, instagram_handle, gender, address, id_verified_from_cccd, is_minor, guardian_name, guardian_phone, zalo_user_id, prefer_zalo_notifications, prefer_sms_notifications")
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
        instagram_handle: member.instagram_handle ?? null,
        gender: member.gender ?? null,
        address: member.address ?? null,
        id_verified_from_cccd: member.id_verified_from_cccd ?? false,
        is_minor: member.is_minor ?? false,
        guardian_name: member.guardian_name ?? null,
        guardian_phone: member.guardian_phone ?? null,
        zalo_user_id: member.zalo_user_id ?? null,
        prefer_zalo_notifications: member.prefer_zalo_notifications ?? false,
        prefer_sms_notifications: member.prefer_sms_notifications ?? false,
      },
    });
  } catch (e) {
    console.error("member profile get error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/member/profile
 * Body: { profile_photo_base64?, id_number?, date_of_birth?, full_name?, display_name?, email?, phone?, instagram_handle?, gender?, address?, id_verified_from_cccd? }
 * Updates profile (member_profiles + Supabase Auth) and optionally uploads photo.
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

    const { data: row, error: rowErr } = await supabase
      .from("member_profiles")
      .select("profile_photo_url, id_number, full_name, gender, date_of_birth, id_verified_from_cccd")
      .eq("id", member.id)
      .maybeSingle();
    if (rowErr || !row) {
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const photoBase64 = typeof body.profile_photo_base64 === "string" ? body.profile_photo_base64.trim() : null;
    const idNumber = typeof body.id_number === "string" ? body.id_number.trim() || null : null;
    const dateOfBirth = typeof body.date_of_birth === "string" ? body.date_of_birth.trim() || null : null;
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() || null : undefined;
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() || null : undefined;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() || null : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim().replace(/\s+/g, "") || null : undefined;
    const instagramHandle = typeof body.instagram_handle === "string"
      ? body.instagram_handle.trim().replace(/^@/, "").toLowerCase() || null
      : undefined;
    const gender = typeof body.gender === "string" && ["male", "female"].includes(body.gender.trim().toLowerCase())
      ? body.gender.trim().toLowerCase()
      : undefined;
    const address = typeof body.address === "string" ? body.address.trim() || null : undefined;
    const idVerifiedFromCccd = body.id_verified_from_cccd === true;

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

    if (idNumber !== undefined && idNumber !== null) {
      const { data: other } = await supabase
        .from("member_profiles")
        .select("id")
        .eq("id_number", idNumber)
        .neq("id", member.id)
        .limit(1)
        .maybeSingle();
      if (other) {
        return NextResponse.json(
          { error: "This ID number is already registered to another member." },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (profilePhotoUrl !== null) updates.profile_photo_url = profilePhotoUrl;
    if (idNumber !== undefined) updates.id_number = idNumber;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth || null;
    if (fullName !== undefined) updates.full_name = fullName ?? "";
    if (displayName !== undefined) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (instagramHandle !== undefined) updates.instagram_handle = instagramHandle ?? null;
    if (gender !== undefined) updates.gender = gender ?? null;
    if (address !== undefined) updates.address = address ?? null;
    if (idVerifiedFromCccd) updates.id_verified_from_cccd = true;

    const nextPhoto = profilePhotoUrl ?? (row.profile_photo_url as string | null);
    const nextVerified = Boolean(idVerifiedFromCccd || row.id_verified_from_cccd);
    const nextId =
      typeof body.id_number === "string"
        ? body.id_number.trim() || null
        : body.id_number === null
          ? null
          : (row.id_number as string | null);
    const nextFull =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : (row.full_name as string) ?? "";
    const nextGender =
      gender !== undefined ? gender : (row.gender as string | null);
    const nextDob =
      typeof body.date_of_birth === "string"
        ? body.date_of_birth.trim() || null
        : body.date_of_birth === null
          ? null
          : (row.date_of_birth as string | null);

    const identityOk =
      nextVerified ||
      (Boolean(nextId && nextId.length >= 8) &&
        Boolean(nextFull && nextFull.length >= 2) &&
        (nextGender === "male" || nextGender === "female") &&
        Boolean(nextDob && nextDob.length >= 8));
    const photoOk = Boolean(nextPhoto);

    if (!photoOk || !identityOk) {
      return NextResponse.json(
        {
          error: !photoOk
            ? "Profile photo is required."
            : "Scan your VN eID (chip QR) or enter CCCD number, full legal name, gender, and date of birth.",
        },
        { status: 400 }
      );
    }

    // Sync full_name to Auth user metadata (for display; email/phone stay in member_profiles only)
    if (fullName !== undefined) {
      const { error: authErr } = await authClient.auth.updateUser({ data: { full_name: fullName ?? "" } });
      if (authErr) console.warn("auth full_name sync:", authErr.message);
    }

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
