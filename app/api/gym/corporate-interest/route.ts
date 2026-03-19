import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
    const contactName = typeof body.contact_name === "string" ? body.contact_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;

    if (!companyName || !contactName) {
      return NextResponse.json({ error: "Company and contact name are required." }, { status: 400 });
    }

    const hasSupabase =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);

    if (hasSupabase) {
      const { createServerClient } = await import("@/lib/supabaseServer");
      const supabase = createServerClient();
      const { error } = await supabase.from("corporate_inquiries").insert({
        company_name: companyName,
        contact_name: contactName,
        email: email || null,
        phone: phone || null,
        notes,
        status: "new",
      });
      if (error) {
        console.error("corporate_inquiries insert", error);
        return NextResponse.json({ error: "Failed to submit." }, { status: 500 });
      }
    } else {
      console.info("[gym/corporate-interest]", { companyName, contactName, email, phone, notes });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
