from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_config_service
from petrus.application.config_service import ConfigService

router = APIRouter(prefix="/api/v1/config", tags=["config"])


# --- Campos ---


@router.get("/campos")
async def list_campos(
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.list_campos()


@router.put("/campos")
async def upsert_campos(
    campos: list[dict],
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    await svc.upsert_campos(campos)
    return {"ok": True}


# --- Tipos de Processo ---


@router.get("/processo-tipos")
async def list_tipos(
    full: bool = False,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.list_tipos(full=full)


@router.get("/processo-tipos/{tipo_id}")
async def get_tipo(
    tipo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    t = await svc.get_tipo(UUID(tipo_id))
    if not t:
        raise HTTPException(status_code=404, detail="Type not found")
    return t


@router.post("/processo-tipos")
async def create_tipo(
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.create_tipo(data)


@router.put("/processo-tipos/{tipo_id}")
async def update_tipo(
    tipo_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.update_tipo(UUID(tipo_id), data)


@router.delete("/processo-tipos/{tipo_id}")
async def delete_tipo(
    tipo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    await svc.delete_tipo(UUID(tipo_id))
    return {"ok": True}


# --- Categorias ---


@router.post("/processo-tipos/{tipo_id}/categorias")
async def create_categoria(
    tipo_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.create_categoria(UUID(tipo_id), data)


@router.put("/categorias/{cat_id}")
async def update_categoria(
    cat_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.update_categoria(UUID(cat_id), data)


@router.delete("/categorias/{cat_id}")
async def delete_categoria(
    cat_id: str,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    await svc.delete_categoria(UUID(cat_id))
    return {"ok": True}


# --- Itens de Template ---


@router.post("/categorias/{cat_id}/itens")
async def create_item(
    cat_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.create_item(UUID(cat_id), data)


@router.put("/itens/{item_id}")
async def update_item(
    item_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    return await svc.update_item(UUID(item_id), data)


@router.delete("/itens/{item_id}")
async def delete_item(
    item_id: str,
    _user: dict = Depends(get_current_user),
    svc: ConfigService = Depends(get_config_service),
):
    await svc.delete_item(UUID(item_id))
    return {"ok": True}
