from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from petrus.api.middleware.auth import get_current_user, optional_user
from petrus.api.deps import get_galpao_service, get_galpao_image_service
from petrus.application.galpao_service import GalpaoService
from petrus.application.galpao_image_service import GalpaoImageService

router = APIRouter(prefix="/api/v1/galpoes", tags=["galpoes"])


@router.get("/search")
async def search_galpoes(
    q: str = "",
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    if len(q) < 2:
        return []
    return await svc.search(q)


@router.get("")
async def list_galpoes(
    user: dict | None = Depends(optional_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    if user:
        return await svc.list_for_admin()
    return await svc.list_for_public()


@router.post("")
async def create_galpao(
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    return await svc.create(data)


@router.get("/{galpao_id}")
async def get_galpao(
    galpao_id: str,
    user: dict | None = Depends(optional_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    if user:
        g = await svc.get_admin(UUID(galpao_id))
    else:
        g = await svc.get_public(UUID(galpao_id))
    if not g:
        raise HTTPException(status_code=404, detail="Galpao not found")
    return g


@router.put("/{galpao_id}")
async def update_galpao(
    galpao_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    return await svc.update(UUID(galpao_id), data)


@router.delete("/{galpao_id}")
async def delete_galpao(
    galpao_id: str,
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    await svc.delete(UUID(galpao_id))
    return {"ok": True}


@router.patch("/{galpao_id}/toggle-published")
async def toggle_published(
    galpao_id: str,
    current: bool,
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    await svc.toggle_published(UUID(galpao_id), current)
    return {"ok": True}


@router.patch("/{galpao_id}/coords")
async def update_coords(
    galpao_id: str,
    lat: float,
    lng: float,
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    await svc.update_coords(UUID(galpao_id), lat, lng)
    return {"ok": True}


@router.post("/{galpao_id}/images")
async def upload_image(
    galpao_id: str,
    file: UploadFile = File(...),
    ordem: int = Form(0),
    _user: dict = Depends(get_current_user),
    image_svc: GalpaoImageService = Depends(get_galpao_image_service),
):
    file_bytes = await file.read()
    return await image_svc.upload(UUID(galpao_id), file_bytes, file.filename or "image.jpg", ordem)


@router.delete("/{galpao_id}/images/{image_id}")
async def delete_image(
    galpao_id: str,
    image_id: str,
    storage_path: str,
    _user: dict = Depends(get_current_user),
    image_svc: GalpaoImageService = Depends(get_galpao_image_service),
):
    await image_svc.delete(UUID(image_id), storage_path)
    return {"ok": True}


@router.put("/{galpao_id}/images/reorder")
async def reorder_images(
    galpao_id: str,
    images: list[dict],
    _user: dict = Depends(get_current_user),
    svc: GalpaoService = Depends(get_galpao_service),
):
    await svc.reorder_images(images)
    return {"ok": True}
