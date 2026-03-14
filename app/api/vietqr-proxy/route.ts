import { NextRequest, NextResponse } from "next/server";

const VIETQR_ORIGIN = "https://img.vietqr.io";

/**
 * GET /api/vietqr-proxy?url=<encoded-vietqr-url>
 * Proxies VietQR images to avoid CORS, slow external loads, and blank/white display.
 * Only allows img.vietqr.io URLs.
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam || typeof urlParam !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  let targetUrl: URL;
  try {
    targetUrl = new URL(decodeURIComponent(urlParam));
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!targetUrl.origin.startsWith(VIETQR_ORIGIN)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 400 });
  }
  try {
    const res = await fetch(targetUrl.toString(), {
      headers: { "User-Agent": "LeoMay/1.0" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (e) {
    console.error("vietqr-proxy error:", e);
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
