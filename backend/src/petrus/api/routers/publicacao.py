from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_publicacao_service
from petrus.api.schemas.publicacao import PublicacaoCreate, PublicacaoUpdate
from petrus.application.publicacao_service import PublicacaoService

router = APIRouter(prefix="/api/v1/publicacao", tags=["publicacao"])


@router.post("/{imovel_id}")
async def publicar(
    imovel_id: str,
    body: PublicacaoCreate | None = None,
    _user: dict = Depends(get_current_user),
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    data = body.model_dump(exclude_none=True) if body else {}
    return await svc.publicar(UUID(imovel_id), data)


@router.get("")
async def list_publicados(
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    return await svc.list_publicados()


@router.get("/slug/{slug}")
async def get_by_slug(
    slug: str,
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    pub = await svc.get_by_slug(slug)
    if not pub:
        raise HTTPException(status_code=404, detail="Publicacao not found")
    return pub


@router.get("/{imovel_id}")
async def get_publicacao(
    imovel_id: str,
    _user: dict = Depends(get_current_user),
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    pub = await svc.get(UUID(imovel_id))
    if not pub:
        raise HTTPException(status_code=404, detail="Publicacao not found")
    return pub


@router.patch("/{imovel_id}")
async def update_publicacao(
    imovel_id: str,
    body: PublicacaoUpdate,
    _user: dict = Depends(get_current_user),
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    data = body.model_dump(exclude_none=True)
    return await svc.atualizar(UUID(imovel_id), data)


@router.delete("/{imovel_id}")
async def despublicar(
    imovel_id: str,
    _user: dict = Depends(get_current_user),
    svc: PublicacaoService = Depends(get_publicacao_service),
):
    await svc.despublicar(UUID(imovel_id))
    return {"ok": True}
