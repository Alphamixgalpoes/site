from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from petrus.api.middleware.auth import get_current_user
from petrus.api.schemas.processo import (
    ProcessoCreate,
    ProcessoUpdate,
    ItemCreate,
    ItemUpdate,
    LinkContact,
    LinkImovel,
)
from petrus.api.deps import get_processo_service, get_processo_file_service
from petrus.application.processo_service import ProcessoAppService
from petrus.application.processo_file_service import ProcessoFileService

router = APIRouter(prefix="/api/v1/processos", tags=["processos"])


# --- Processos CRUD ---


@router.get("")
async def list_processos(
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    return await svc.list_all()


@router.post("")
async def create_processo(
    body: ProcessoCreate,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    data = body.model_dump(exclude_none=True)
    tipo_slug = data.get("tipo", "")
    return await svc.create_with_template(data, tipo_slug)


@router.get("/{processo_id}")
async def get_processo(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    p = await svc.get(UUID(processo_id))
    if not p:
        raise HTTPException(status_code=404, detail="Process not found")
    return p


@router.put("/{processo_id}")
async def update_processo(
    processo_id: str,
    body: ProcessoUpdate,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    data = body.model_dump(exclude_none=True)
    return await svc.update(UUID(processo_id), data)


@router.delete("/{processo_id}")
async def delete_processo(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.delete(UUID(processo_id))
    return {"ok": True}


# --- Items ---


@router.get("/{processo_id}/itens")
async def list_items(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    return await svc.list_items(UUID(processo_id))


@router.post("/{processo_id}/itens")
async def create_item(
    processo_id: str,
    body: ItemCreate,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    data = body.model_dump()
    return await svc.create_item(UUID(processo_id), data)


@router.put("/{processo_id}/itens/reorder")
async def reorder_items(
    processo_id: str,
    items: list[dict],
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.reorder_items(items)
    return {"ok": True}


@router.put("/{processo_id}/itens/{item_id}")
async def update_item(
    processo_id: str,
    item_id: str,
    body: ItemUpdate,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    data = body.model_dump(exclude_none=True)
    return await svc.update_item(UUID(item_id), data)


@router.delete("/{processo_id}/itens/{item_id}")
async def delete_item(
    processo_id: str,
    item_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.delete_item(UUID(item_id))
    return {"ok": True}


@router.post("/{processo_id}/itens/{item_id}/upload")
async def upload_item_file(
    processo_id: str,
    item_id: str,
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    file_svc: ProcessoFileService = Depends(get_processo_file_service),
):
    file_bytes = await file.read()
    filename = file.filename or "document"
    return await file_svc.upload(
        UUID(processo_id),
        UUID(item_id),
        file_bytes,
        filename,
        file.content_type or "application/octet-stream",
    )


@router.get("/{processo_id}/signed-urls")
async def get_signed_urls(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    file_svc: ProcessoFileService = Depends(get_processo_file_service),
):
    return await file_svc.get_signed_urls(UUID(processo_id))


@router.delete("/{processo_id}/itens/{item_id}/file")
async def remove_item_file(
    processo_id: str,
    item_id: str,
    _user: dict = Depends(get_current_user),
    file_svc: ProcessoFileService = Depends(get_processo_file_service),
):
    await file_svc.remove(UUID(processo_id), UUID(item_id))
    return {"ok": True}


# --- Categories ---


@router.get("/{processo_id}/categorias")
async def list_categories(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    return await svc.list_categories(UUID(processo_id))


@router.put("/{processo_id}/categorias/reorder")
async def reorder_categories(
    processo_id: str,
    categories: list[dict],
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.reorder_categories(categories)
    return {"ok": True}


# --- Contacts ---


@router.get("/{processo_id}/contatos")
async def list_processo_contacts(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    return await svc.list_contacts(UUID(processo_id))


@router.post("/{processo_id}/contatos")
async def link_contact(
    processo_id: str,
    body: LinkContact,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    return await svc.link_contact(UUID(processo_id), UUID(body.contato_id), body.papel)


@router.delete("/{processo_id}/contatos/{link_id}")
async def unlink_contact(
    processo_id: str,
    link_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.unlink_contact(UUID(link_id))
    return {"ok": True}


# --- Imovel link ---


@router.put("/{processo_id}/imovel")
async def link_imovel(
    processo_id: str,
    body: LinkImovel,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.link_imovel(UUID(processo_id), UUID(body.imovel_id))
    return {"ok": True}


@router.delete("/{processo_id}/imovel")
async def unlink_imovel(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    svc: ProcessoAppService = Depends(get_processo_service),
):
    await svc.unlink_imovel(UUID(processo_id))
    return {"ok": True}
