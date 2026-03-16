import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { getAdminFromRequest } from "@/lib/adminAuth";

const BUCKET = "product-photos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/admin/upload/product-image
 * Body: { image: "data:image/jpeg;base64,..." }
 * Uploads to Supabase Storage (bucket: product-photos), returns public URL.
 * Create the bucket in Supabase Dashboard with public read access if it doesn't exist.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const dataUrl = typeof body.image === "string" ? body.image.trim() : "";
    const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image. Use JPEG, PNG, or WebP (data URL)." },
        { status: 400 }
      );
    }
    const mime = match[1];
    const ext = mime === "jpeg" ? "jpg" : mime;
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    const supabase = createServerClient();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: `image/${mime === "jpeg" ? "jpeg" : mime}`,
        upsert: false,
      });

    if (uploadErr) {
      console.error("product image upload error", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload. Ensure bucket 'product-photos' exists and is public." },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
