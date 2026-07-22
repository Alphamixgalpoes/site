from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from petrus.api.schemas.lead import LeadCreate
from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_lead_service
from petrus.application.lead_service import LeadAppService

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


@router.post("")
async def submit_lead(
    body: LeadCreate,
    svc: LeadAppService = Depends(get_lead_service),
):
    return await svc.submit_lead(
        nome=body.nome,
        telefone=body.telefone,
        empresa=body.empresa,
        imovel_id=body.imovel_id,
        imovel_titulo=body.imovel_titulo,
    )


@router.get("")
async def list_leads(
    _user: dict = Depends(get_current_user),
    svc: LeadAppService = Depends(get_lead_service),
):
    return await svc.list_all()


@router.patch("/{lead_id}/toggle-contactado")
async def toggle_contactado(
    lead_id: str,
    current: bool,
    _user: dict = Depends(get_current_user),
    svc: LeadAppService = Depends(get_lead_service),
):
    await svc.toggle_contactado(UUID(lead_id), current)
    return {"ok": True}
