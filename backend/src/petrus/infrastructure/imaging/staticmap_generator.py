from __future__ import annotations

import io

from staticmap import StaticMap, CircleMarker


def _fit_zoom(markers: list[tuple[float, float]], width: int, height: int) -> int:
    """Calculate zoom level to fit all markers with padding."""
    if len(markers) <= 1:
        return 14

    lats = [m[0] for m in markers]
    lngs = [m[1] for m in markers]
    lat_span = max(lats) - min(lats)
    lng_span = max(lngs) - min(lngs)

    if lat_span == 0 and lng_span == 0:
        return 14

    for z in range(16, 9, -1):
        lat_px = lat_span * 256 * (2**z) / 180
        lng_px = lng_span * 256 * (2**z) / 360
        if lat_px < (height - 120) and lng_px < (width - 120):
            return z

    return 10


def generate_static_map(
    markers: list[tuple[float, float, int]],
    width: int = 800,
    height: int = 380,
) -> bytes:
    """Generate static map with circle markers.

    Args:
        markers: List of (lat, lng, number) tuples.
        width: Image width in pixels.
        height: Image height in pixels.
    """
    m = StaticMap(
        width,
        height,
        url_template="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    )

    coords = [(lat, lng) for lat, lng, _ in markers]
    zoom = _fit_zoom(coords, width, height)

    for lat, lng, _ in markers:
        m.add_marker(CircleMarker((lng, lat), "#dc2626", 15))

    image = m.render(zoom=zoom)

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()
