from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_enrichment_service
from petrus.api.schemas.enrichment import (
    GenerateRequest,
    CreateEventRequest,
    UndoRequest,
    FinalizeRequest,
)
from petrus.application.enrichment_service import EnrichmentService

router = APIRouter(prefix="/api/v1/mdm/enrichment", tags=["enrichment"])


@router.post("/generate")
async def generate_cards(
    body: GenerateRequest,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Generate (or regenerate) enrichment cards for a fonte."""
    return await svc.generate_cards(UUID(body.fonte_id))


@router.get("/cards")
async def list_cards(
    status: str = Query("pendente"),
    cidade: str | None = Query(None),
    fonte_id: str | None = Query(None),
    score_min: float | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    filters: dict = {}
    if cidade:
        filters["cidade"] = cidade
    if fonte_id:
        filters["fonte_id"] = fonte_id
    if score_min is not None:
        filters["score_min"] = score_min

    cards = await svc.list_cards(status, filters or None, limit, offset)
    counts = await svc.count_cards()
    return {
        "cards": [_card_summary(c) for c in cards],
        "total": counts,
    }


@router.get("/cards/{card_id}")
async def get_card(
    card_id: str,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Get full card state with events applied (for workspace)."""
    try:
        return await svc.get_card_state(UUID(card_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cards/{card_id}/events")
async def create_event(
    card_id: str,
    body: CreateEventRequest,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Record a drag or edit event."""
    try:
        event = await svc.create_event(UUID(card_id), body.model_dump())
        return {"id": str(event.id), "created_at": event.created_at}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cards/{card_id}/undo")
async def undo_event(
    card_id: str,
    body: UndoRequest,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Undo a specific event."""
    await svc.undo_event(UUID(card_id), UUID(body.event_id))
    return {"ok": True}


@router.post("/cards/{card_id}/finalize")
async def finalize_card(
    card_id: str,
    body: FinalizeRequest,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Apply all events and create/update imoveis."""
    try:
        return await svc.finalize(UUID(card_id), body.criar_imovel)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cards/{card_id}/discard")
async def discard_card(
    card_id: str,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Discard a card (events kept for audit)."""
    await svc.discard(UUID(card_id))
    return {"ok": True}


@router.get("/cards/{card_id}/history")
async def card_history(
    card_id: str,
    _user: dict = Depends(get_current_user),
    svc: EnrichmentService = Depends(get_enrichment_service),
):
    """Full event history for audit."""
    state = await svc.get_card_state(UUID(card_id))
    return {"events": state["events"], "stats": state["stats"]}


def _card_summary(card) -> dict:
    return {
        "id": str(card.id),
        "fonte_id": str(card.fonte_id),
        "status": card.status,
        "cidade": card.cidade,
        "bairro": card.bairro,
        "logradouro": card.logradouro,
        "area": card.area,
        "score_max": card.score_max,
        "registro_snapshot": card.registro_snapshot,
        "similares": card.similares,
        "created_at": card.created_at,
    }
