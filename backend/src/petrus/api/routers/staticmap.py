from __future__ import annotations

from fastapi import APIRouter, Response, HTTPException

from petrus.infrastructure.imaging.staticmap_generator import generate_static_map

router = APIRouter(prefix="/api/v1/maps", tags=["maps"])


@router.get("/static")
async def static_map(size: str, markers: str):
    """Generate static map image.

    Query params:
        size: "WIDTHxHEIGHT" (e.g. "800x380")
        markers: pipe-separated "lat,lon,num|lat,lon,num|..."
    """
    # Parse size
    try:
        parts = size.split("x")
        width = min(int(parts[0]), 1200)
        height = min(int(parts[1]), 800)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid size format. Use WIDTHxHEIGHT")

    # Parse markers
    parsed: list[tuple[float, float, int]] = []
    try:
        for segment in markers.split("|"):
            vals = segment.split(",")
            lat = float(vals[0])
            lng = float(vals[1])
            num = int(vals[2]) if len(vals) > 2 else 0
            parsed.append((lat, lng, num))
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid markers format")

    if not parsed:
        raise HTTPException(status_code=400, detail="No markers provided")

    try:
        image_bytes = generate_static_map(parsed, width=width, height=height)
    except Exception:
        raise HTTPException(status_code=502, detail="Map render failed")

    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
