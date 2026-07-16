from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, HTTPException

from petrus.api.middleware.security import is_blocked_user_agent, is_allowed_referer
from petrus.api.deps import get_image_service
from petrus.domain.services.image_service import ImageService

router = APIRouter(prefix="/api/v1/images", tags=["images"])


@router.get("/proxy")
async def proxy_image(
    p: str,
    request: Request,
    img_svc: ImageService = Depends(get_image_service),
):
    ua = request.headers.get("user-agent")
    referer = request.headers.get("referer")

    if is_blocked_user_agent(ua) or not is_allowed_referer(referer):
        raise HTTPException(status_code=403, detail="Forbidden")

    if not p:
        raise HTTPException(status_code=400, detail="Missing path")

    image_bytes = await img_svc.get_watermarked(p)
    if image_bytes is None:
        raise HTTPException(status_code=404, detail="Image not found")

    return Response(
        content=image_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )
