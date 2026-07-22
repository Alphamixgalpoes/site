from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from petrus.api.middleware.auth import get_current_user, optional_user
from petrus.api.deps import get_imovel_service, get_imovel_image_service
from petrus.application.imovel_service import ImovelService
from petrus.application.imovel_image_service import ImovelImageService

router = APIRouter(prefix="/api/v1/imoveis", tags=["imoveis"])


@router.get("/search")
async def search_imoveis(
    q: str = "",
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    if len(q) < 2:
        return []
    return await svc.search(q)


@router.get("")
async def list_imoveis(
    user: dict | None = Depends(optional_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    if user:
        return await svc.list_for_admin()
    return await svc.list_for_public()


@router.post("")
async def create_imovel(
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    return await svc.create(data)


@router.get("/{imovel_id}")
async def get_imovel(
    imovel_id: str,
    user: dict | None = Depends(optional_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    if user:
        g = await svc.get_admin(UUID(imovel_id))
    else:
        g = await svc.get_public(UUID(imovel_id))
    if not g:
        raise HTTPException(status_code=404, detail="Imovel not found")
    return g


@router.put("/{imovel_id}")
async def update_imovel(
    imovel_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    return await svc.update(UUID(imovel_id), data)


@router.delete("/{imovel_id}")
async def delete_imovel(
    imovel_id: str,
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    await svc.delete(UUID(imovel_id))
    return {"ok": True}


@router.patch("/{imovel_id}/toggle-published")
async def toggle_published(
    imovel_id: str,
    current: bool,
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    await svc.toggle_published(UUID(imovel_id), current)
    return {"ok": True}


@router.patch("/{imovel_id}/coords")
async def update_coords(
    imovel_id: str,
    lat: float,
    lng: float,
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    await svc.update_coords(UUID(imovel_id), lat, lng)
    return {"ok": True}


@router.post("/{imovel_id}/images")
async def upload_image(
    imovel_id: str,
    file: UploadFile = File(...),
    ordem: int = Form(0),
    _user: dict = Depends(get_current_user),
    image_svc: ImovelImageService = Depends(get_imovel_image_service),
):
    file_bytes = await file.read()
    return await image_svc.upload(UUID(imovel_id), file_bytes, file.filename or "image.jpg", ordem)


@router.delete("/{imovel_id}/images/{image_id}")
async def delete_image(
    imovel_id: str,
    image_id: str,
    storage_path: str,
    _user: dict = Depends(get_current_user),
    image_svc: ImovelImageService = Depends(get_imovel_image_service),
):
    await image_svc.delete(UUID(image_id), storage_path)
    return {"ok": True}


@router.put("/{imovel_id}/images/reorder")
async def reorder_images(
    imovel_id: str,
    images: list[dict],
    _user: dict = Depends(get_current_user),
    svc: ImovelService = Depends(get_imovel_service),
):
    await svc.reorder_images(images)
    return {"ok": True}
