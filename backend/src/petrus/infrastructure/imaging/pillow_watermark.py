from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

from petrus.domain.services.image_service import ImageService
from petrus.domain.services.storage_service import StorageService

_logo_cache: Image.Image | None = None
LOGO_PATH = Path(__file__).resolve().parents[4] / "assets" / "icon.png"


def _get_logo() -> Image.Image:
    global _logo_cache
    if _logo_cache is None:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo = logo.resize((120, 120), Image.LANCZOS)
        # Reduce alpha to 25%
        r, g, b, a = logo.split()
        a = a.point(lambda x: int(x * 0.25))
        _logo_cache = Image.merge("RGBA", (r, g, b, a))
    return _logo_cache


class PillowImageService(ImageService):
    def __init__(self, storage: StorageService) -> None:
        self._storage = storage

    async def get_watermarked(self, storage_path: str) -> bytes | None:
        # Validate path
        if not storage_path or ".." in storage_path or "//" in storage_path:
            return None
        if storage_path.startswith("/"):
            return None
        if any(c in storage_path for c in "<>|&;`$"):
            return None

        raw = await self._storage.download("galpoes", storage_path)
        if raw is None:
            return None

        img = Image.open(io.BytesIO(raw)).convert("RGBA")
        logo = _get_logo()

        # Center the logo
        x = (img.width - logo.width) // 2
        y = (img.height - logo.height) // 2
        img.paste(logo, (x, y), logo)

        output = io.BytesIO()
        img.convert("RGB").save(output, format="JPEG", quality=85)
        return output.getvalue()
