import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = searchParams.toString();
  const url = `https://staticmap.openstreetmap.de/staticmap.php?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)",
    },
  });

  if (!res.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
