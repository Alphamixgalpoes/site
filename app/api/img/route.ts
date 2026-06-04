import { type NextRequest, NextResponse } from "next/server";
import { isBlockedUserAgent } from "@/lib/security/user-agent";
import { isAllowedReferer } from "@/lib/security/referer";
import { fetchImageWithWatermark } from "@/lib/security/image-proxy";

export async function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent");
  const referer = req.headers.get("referer");
  const storagePath = req.nextUrl.searchParams.get("p") ?? "";

  if (isBlockedUserAgent(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!isAllowedReferer(referer)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buffer = await fetchImageWithWatermark(storagePath);
  if (!buffer) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      "Cross-Origin-Resource-Policy": "same-site",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
