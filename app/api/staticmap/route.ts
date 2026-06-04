import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StaticMaps = require("staticmaps");

// CartoDB Light @2x — mapa limpo, ideal para PDF
const CARTO_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png";

const TILE_SIZE = 512;
const ZOOM_MIN = 10;
const ZOOM_MAX = 16;
const PADDING_X = 60;
const PADDING_Y = 60;
const TARGET_RADIUS_PX = 15; // raio fixo em pixels para qualquer zoom

// Replicam a lógica interna do staticmaps para cálculo de zoom
function lonToX(lon: number, z: number) {
  return ((lon + 180) / 360) * Math.pow(2, z);
}
function latToY(lat: number, z: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, z);
}

function calcAutoZoom(lons: number[], lats: number[], w: number, h: number): number {
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  // ponto único ou todos sobrepostos → zoom razoável para imóvel individual
  if (maxLon - minLon < 0.001 && maxLat - minLat < 0.001) return 14;
  for (let z = ZOOM_MAX; z >= ZOOM_MIN; z--) {
    const fw = (lonToX(maxLon, z) - lonToX(minLon, z)) * TILE_SIZE;
    if (fw > w - PADDING_X * 2) continue;
    const fh = (latToY(minLat, z) - latToY(maxLat, z)) * TILE_SIZE;
    if (fh > h - PADDING_Y * 2) continue;
    return z;
  }
  return ZOOM_MIN;
}

// Converte pixels → metros considerando tileSize=512 (2x)
// staticmaps.meterToPixel usa 2^(zoom+8)=2^zoom*256 internamente;
// com tileSize=512 cada pixel representa metade da área → divisor = 2^(zoom+9)
function pixelsToMeters(px: number, zoom: number, lat: number): number {
  const E = 40075016.686;
  return px * (E * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 9);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const size = searchParams.get("size");
  const markersParam = searchParams.get("markers");

  if (!size || !markersParam) {
    return new NextResponse(null, { status: 400 });
  }

  const [width, height] = size.split("x").map(Number);
  if (isNaN(width) || isNaN(height)) {
    return new NextResponse(null, { status: 400 });
  }

  // Formato: "lat,lon,N" separados por "|"
  const markers: { lat: number; lon: number; num: number }[] = [];
  for (const m of markersParam.split("|")) {
    const parts = m.split(",");
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    const num = parseInt(parts[2] ?? "1");
    if (!isNaN(lat) && !isNaN(lon)) {
      markers.push({ lat, lon, num: isNaN(num) ? 1 : num });
    }
  }

  if (markers.length === 0) {
    return new NextResponse(null, { status: 400 });
  }

  const lats = markers.map((m) => m.lat);
  const lons = markers.map((m) => m.lon);

  // Pré-calcular zoom para depois derivar o raio em metros
  const zoom = calcAutoZoom(lons, lats, width, height);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

  // Raio fixo de TARGET_RADIUS_PX independente do nível de zoom
  const radiusMeters = pixelsToMeters(TARGET_RADIUS_PX, zoom, centerLat);

  const map = new StaticMaps({
    width,
    height,
    tileUrl: CARTO_LIGHT,
    tileSubdomains: ["a", "b", "c"],
    tileSize: TILE_SIZE,
    zoomRange: { min: ZOOM_MIN, max: ZOOM_MAX },
    paddingX: PADDING_X,
    paddingY: PADDING_Y,
  });

  for (const { lat, lon, num } of markers) {
    map.addCircle({
      coord: [lon, lat],
      radius: radiusMeters,
      fill: "#dc2626",
      color: "#ffffff",
      width: 3,
    });
    map.addText({
      coord: [lon, lat],
      text: String(num),
      size: 11,
      font: "sans-serif",
      color: "#ffffff",
      fill: "#ffffff",
      anchor: "middle",
      offsetX: 0,
      offsetY: 4,
    });
  }

  try {
    await map.render([centerLon, centerLat], zoom);
    const buffer = await map.image.buffer("image/png");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("staticmap render error:", err);
    return new NextResponse(null, { status: 502 });
  }
}
