import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StaticMaps = require("staticmaps");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const center = searchParams.get("center");
  const zoom = searchParams.get("zoom");
  const size = searchParams.get("size");
  const markersParam = searchParams.get("markers");

  if (!center || !zoom || !size) {
    return new NextResponse(null, { status: 400 });
  }

  const [lat, lon] = center.split(",").map(Number);
  const [width, height] = size.split("x").map(Number);
  const zoomLevel = parseInt(zoom);

  if (isNaN(lat) || isNaN(lon) || isNaN(width) || isNaN(height) || isNaN(zoomLevel)) {
    return new NextResponse(null, { status: 400 });
  }

  const map = new StaticMaps({ width, height });

  // Cada marcador vira um círculo vermelho no mapa
  if (markersParam) {
    for (const marker of markersParam.split("|")) {
      const parts = marker.split(",");
      const mLat = parseFloat(parts[0]);
      const mLon = parseFloat(parts[1]);
      if (!isNaN(mLat) && !isNaN(mLon)) {
        map.addCircle({
          coord: [mLon, mLat], // staticmaps usa [lon, lat]
          radius: 120,         // metros
          fill: "#e11d48",
          color: "#ffffff",
          width: 3,
        });
      }
    }
  }

  try {
    await map.render([lon, lat], zoomLevel);
    const buffer = await map.image.buffer("image/png");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
