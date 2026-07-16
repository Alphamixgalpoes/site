from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from petrus.api.schemas.lead import LeadCreate
from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_lead_repo, get_email_service
from petrus.application.lead_service import LeadAppService
from petrus.domain.repositories.lead_repo import LeadRepository
from petrus.domain.services.email_service import EmailService

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


@router.post("")
async def submit_lead(
    body: LeadCreate,
    repo: LeadRepository = Depends(get_lead_repo),
    email: EmailService = Depends(get_email_service),
):
    svc = LeadAppService(repo, email)
    result = await svc.submit_lead(
        nome=body.nome,
        telefone=body.telefone,
        empresa=body.empresa,
        galpao_id=body.galpao_id,
        galpao_titulo=body.galpao_titulo,
    )
    return result


@router.get("")
async def list_leads(
    _user: dict = Depends(get_current_user),
    repo: LeadRepository = Depends(get_lead_repo),
):
    return await repo.list_all()


@router.patch("/{lead_id}/toggle-contactado")
async def toggle_contactado(
    lead_id: str,
    current: bool,
    _user: dict = Depends(get_current_user),
    repo: LeadRepository = Depends(get_lead_repo),
):
    from uuid import UUID

    await repo.toggle_contactado(UUID(lead_id), current)
    return {"ok": True}
