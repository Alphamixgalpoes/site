from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_contato_repo
from petrus.domain.repositories.contato_repo import ContatoRepository

router = APIRouter(prefix="/api/v1/contatos", tags=["contatos"])


@router.get("")
async def list_contatos(
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    return await repo.list_active()


@router.post("")
async def create_contato(
    data: dict,
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    return await repo.create(data)


@router.get("/search")
async def search_contatos(
    q: str = "",
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    if not q:
        return []
    return await repo.search(q)


@router.get("/{contato_id}")
async def get_contato(
    contato_id: str,
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    c = await repo.get_by_id(UUID(contato_id))
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    return c


@router.put("/{contato_id}")
async def update_contato(
    contato_id: str,
    data: dict,
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    return await repo.update(UUID(contato_id), data)


@router.delete("/{contato_id}")
async def soft_delete_contato(
    contato_id: str,
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    await repo.soft_delete(UUID(contato_id))
    return {"ok": True}


@router.get("/{contato_id}/relationships")
async def get_relationships(
    contato_id: str,
    _user: dict = Depends(get_current_user),
    repo: ContatoRepository = Depends(get_contato_repo),
):
    return await repo.get_relationships(UUID(contato_id))
