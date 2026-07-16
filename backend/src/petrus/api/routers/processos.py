from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from petrus.api.middleware.auth import get_current_user
from petrus.api.schemas.processo import (
    ProcessoCreate,
    ProcessoUpdate,
    ItemCreate,
    ItemUpdate,
    LinkContact,
    LinkGalpao,
)
from petrus.api.deps import get_processo_repo, get_storage_service
from petrus.application.processo_service import ProcessoAppService
from petrus.domain.repositories.processo_repo import ProcessoRepository
from petrus.domain.services.storage_service import StorageService

router = APIRouter(prefix="/api/v1/processos", tags=["processos"])


# --- Processos CRUD ---


@router.get("")
async def list_processos(
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    return await repo.list_all()


@router.post("")
async def create_processo(
    body: ProcessoCreate,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    svc = ProcessoAppService(repo)
    data = body.model_dump(exclude_none=True)
    tipo_slug = data.get("tipo", "")
    return await svc.create_with_template(data, tipo_slug)


@router.get("/{processo_id}")
async def get_processo(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    p = await repo.get_by_id(UUID(processo_id))
    if not p:
        raise HTTPException(status_code=404, detail="Process not found")
    return p


@router.put("/{processo_id}")
async def update_processo(
    processo_id: str,
    body: ProcessoUpdate,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    data = body.model_dump(exclude_none=True)
    return await repo.update(UUID(processo_id), data)


@router.delete("/{processo_id}")
async def delete_processo(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.delete(UUID(processo_id))
    return {"ok": True}


# --- Items ---


@router.get("/{processo_id}/itens")
async def list_items(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    return await repo.list_items(UUID(processo_id))


@router.post("/{processo_id}/itens")
async def create_item(
    processo_id: str,
    body: ItemCreate,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    data = body.model_dump()
    data["processo_id"] = processo_id
    return await repo.create_item(data)


@router.put("/{processo_id}/itens/{item_id}")
async def update_item(
    processo_id: str,
    item_id: str,
    body: ItemUpdate,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    data = body.model_dump(exclude_none=True)
    return await repo.update_item(UUID(item_id), data)


@router.delete("/{processo_id}/itens/{item_id}")
async def delete_item(
    processo_id: str,
    item_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.delete_item(UUID(item_id))
    return {"ok": True}


@router.put("/{processo_id}/itens/reorder")
async def reorder_items(
    processo_id: str,
    items: list[dict],
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.reorder_items(items)
    return {"ok": True}


@router.post("/{processo_id}/itens/{item_id}/upload")
async def upload_item_file(
    processo_id: str,
    item_id: str,
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
    storage: StorageService = Depends(get_storage_service),
):
    # Remove old file if exists
    items = await repo.list_items(UUID(processo_id))
    old_item = next((i for i in items if i["id"] == item_id), None)
    if old_item and old_item.get("arquivo_path"):
        try:
            await storage.remove("processos", [old_item["arquivo_path"]])
        except Exception:
            pass
    file_bytes = await file.read()
    filename = file.filename or "document"
    path = f"{processo_id}/{item_id}/{filename}"
    await storage.upload("processos", path, file_bytes, file.content_type or "application/octet-stream")
    tipo = "pdf" if filename.lower().endswith(".pdf") else "imagem"
    await repo.update_item(
        UUID(item_id),
        {
            "arquivo_path": path,
            "arquivo_nome": filename,
            "arquivo_tipo": tipo,
            "feito": True,
        },
    )
    signed_url = await storage.create_signed_url("processos", path, 3600)
    return {"path": path, "nome": filename, "tipo": tipo, "signed_url": signed_url}


@router.get("/{processo_id}/signed-urls")
async def get_signed_urls(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
    storage: StorageService = Depends(get_storage_service),
):
    items = await repo.list_items(UUID(processo_id))
    urls: dict[str, str] = {}
    for item in items:
        if item.get("arquivo_path"):
            try:
                url = await storage.create_signed_url("processos", item["arquivo_path"], 3600)
                urls[item["id"]] = url
            except Exception:
                pass
    return urls


@router.delete("/{processo_id}/itens/{item_id}/file")
async def remove_item_file(
    processo_id: str,
    item_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
    storage: StorageService = Depends(get_storage_service),
):
    items = await repo.list_items(UUID(processo_id))
    item = next((i for i in items if i["id"] == item_id), None)
    if item and item.get("arquivo_path"):
        await storage.remove("processos", [item["arquivo_path"]])
    await repo.update_item(
        UUID(item_id),
        {"arquivo_path": None, "arquivo_nome": None, "arquivo_tipo": None},
    )
    return {"ok": True}


# --- Categories ---


@router.get("/{processo_id}/categorias")
async def list_categories(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    return await repo.list_categories(UUID(processo_id))


@router.put("/{processo_id}/categorias/reorder")
async def reorder_categories(
    processo_id: str,
    categories: list[dict],
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.reorder_categories(categories)
    return {"ok": True}


# --- Contacts ---


@router.get("/{processo_id}/contatos")
async def list_processo_contacts(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    return await repo.list_contacts(UUID(processo_id))


@router.post("/{processo_id}/contatos")
async def link_contact(
    processo_id: str,
    body: LinkContact,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    return await repo.link_contact(UUID(processo_id), UUID(body.contato_id), body.papel)


@router.delete("/{processo_id}/contatos/{link_id}")
async def unlink_contact(
    processo_id: str,
    link_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.unlink_contact(UUID(link_id))
    return {"ok": True}


# --- Galpao link ---


@router.put("/{processo_id}/galpao")
async def link_galpao(
    processo_id: str,
    body: LinkGalpao,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.link_galpao(UUID(processo_id), UUID(body.galpao_id))
    return {"ok": True}


@router.delete("/{processo_id}/galpao")
async def unlink_galpao(
    processo_id: str,
    _user: dict = Depends(get_current_user),
    repo: ProcessoRepository = Depends(get_processo_repo),
):
    await repo.unlink_galpao(UUID(processo_id))
    return {"ok": True}
