"""Scraping control endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from petrus.api.deps import get_scraping_service
from petrus.api.middleware.auth import get_current_user
from petrus.application.scraping_service import ScrapingService

router = APIRouter(
    prefix="/api/v1/scraping",
    tags=["scraping"],
    dependencies=[Depends(get_current_user)],
)


class PreviewRequest(BaseModel):
    max_items: int = 5


# === Execution ===


@router.post("/executar/{run_id}")
async def execute_scraping_run(
    run_id: UUID,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Execute a single pending ScrapingRun."""
    try:
        return await service.execute_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/executar-todos")
async def execute_all_pending(
    service: ScrapingService = Depends(get_scraping_service),
):
    """Execute all pending ScrapingRuns sequentially."""
    return await service.execute_all_pending()


@router.post("/preview/{fonte_id}")
async def preview_scraping(
    fonte_id: UUID,
    body: PreviewRequest | None = None,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Execute partial crawl for testing (without saving)."""
    max_items = body.max_items if body else 5
    try:
        return await service.preview(fonte_id, max_items=max_items)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# === Full pipeline ===


@router.post("/pipeline/{fonte_id}")
async def execute_full_pipeline(
    fonte_id: UUID,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Execute full pipeline: scraping -> clean -> enrichment.

    Orchestrates all three steps for a fonte with pending scraping.
    """
    from petrus.api.deps import (
        get_enrichment_service,
        get_mdm_processing_service,
    )

    # Step 1: Find and execute pending runs for this fonte
    runs = await service._scraping_repo.get_by_fonte(fonte_id)
    pending = [r for r in runs if r.status == "pendente"]
    scraping_results = []
    for run in pending:
        result = await service.execute_run(run.id)
        scraping_results.append(result)

    # Step 2: Process raw -> clean
    processing_service = get_mdm_processing_service()
    try:
        processing_result = await processing_service.process_raw_to_clean(fonte_id)
    except ValueError as exc:
        processing_result = {"error": str(exc)}

    # Step 3: Generate enrichment cards
    enrichment_service = get_enrichment_service()
    try:
        enrichment_result = await enrichment_service.generate_cards(fonte_id)
    except ValueError as exc:
        enrichment_result = {"error": str(exc)}

    return {
        "scraping": scraping_results,
        "processing": processing_result,
        "enrichment": enrichment_result,
    }


# === Query ===


@router.get("/plataformas")
async def list_platforms(
    service: ScrapingService = Depends(get_scraping_service),
):
    """List available scraping platforms."""
    return service.list_platforms()


@router.get("/stats")
async def scraping_stats(
    service: ScrapingService = Depends(get_scraping_service),
):
    """Scraping overview statistics."""
    pending = await service._scraping_repo.list_pending()
    return {
        "plataformas_disponiveis": len(service.list_platforms()),
        "runs_pendentes": len(pending),
    }
