"""Scraping control + monitoring endpoints.

Execution endpoints use BackgroundTasks (worker pattern):
- POST returns immediately with run_id + status
- Client polls GET /monitor/runs/{id}/live for progress
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from petrus.api.deps import get_scraping_monitor_service, get_scraping_service
from petrus.api.middleware.auth import get_current_user
from petrus.application.scraping_monitor_service import ScrapingMonitorService
from petrus.application.scraping_service import ScrapingService

router = APIRouter(
    prefix="/api/v1/scraping",
    tags=["scraping"],
    dependencies=[Depends(get_current_user)],
)


class PreviewRequest(BaseModel):
    max_items: int = 5


# === Execution (worker pattern) ===


@router.post("/executar/{run_id}")
async def execute_scraping_run(
    run_id: UUID,
    background_tasks: BackgroundTasks,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Start a scraping run in background. Returns immediately."""
    try:
        result = await service.start_run(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    background_tasks.add_task(service.execute_run, run_id)
    return result


@router.post("/executar-todos")
async def execute_all_pending(
    background_tasks: BackgroundTasks,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Start all pending runs in background. Returns run count."""
    runs = await service._scraping_repo.list_pending()
    for run in runs:
        try:
            await service.start_run(run.id)
        except ValueError:
            continue
        bg_service = get_scraping_service()
        background_tasks.add_task(bg_service.execute_run, run.id)

    return {"started": len(runs)}


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
    background_tasks: BackgroundTasks,
    service: ScrapingService = Depends(get_scraping_service),
):
    """Execute full pipeline: scraping -> clean -> enrichment.

    Scraping runs in background. Returns immediately.
    """
    from petrus.api.deps import (
        get_enrichment_service,
        get_mdm_processing_service,
    )

    runs = await service._scraping_repo.get_by_fonte(fonte_id)
    pending = [r for r in runs if r.status == "pendente"]

    async def _run_pipeline():
        svc = get_scraping_service()
        for run in pending:
            await svc.execute_run(run.id)

        processing_service = get_mdm_processing_service()
        try:
            await processing_service.process_raw_to_clean(fonte_id)
        except ValueError:
            pass

        enrichment_service = get_enrichment_service()
        try:
            await enrichment_service.generate_cards(fonte_id)
        except ValueError:
            pass

    for run in pending:
        try:
            await service.start_run(run.id)
        except ValueError:
            continue

    background_tasks.add_task(_run_pipeline)

    return {
        "started": len(pending),
        "fonte_id": str(fonte_id),
        "status": "processando",
    }


# === Monitoring ===


@router.get("/monitor/overview")
async def get_overview(
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """Dashboard overview: counts by health status, 7-day stats."""
    overview = await monitor.get_overview()
    return {
        "total_fontes": overview.total_fontes,
        "fontes_ok": overview.fontes_ok,
        "fontes_warning": overview.fontes_warning,
        "fontes_error": overview.fontes_error,
        "fontes_stale": overview.fontes_stale,
        "fontes_never": overview.fontes_never,
        "runs_last_7d": overview.runs_last_7d,
        "novos_last_7d": overview.novos_last_7d,
    }


@router.get("/monitor/fontes")
async def get_fontes_health(
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """Health status for all scraping fontes."""
    healths = await monitor.get_all_fontes_health()
    return [
        {
            "fonte_id": str(h.fonte_id),
            "nome": h.nome,
            "platform": h.platform,
            "status": h.status,
            "last_run_at": h.last_run_at,
            "last_success_at": h.last_success_at,
            "success_rate_last_5": h.success_rate_last_5,
            "avg_novos_last_5": h.avg_novos_last_5,
            "avg_duration_ms": h.avg_duration_ms,
            "recent_runs": h.recent_runs,
        }
        for h in healths
    ]


@router.get("/monitor/fontes/{fonte_id}")
async def get_fonte_health(
    fonte_id: UUID,
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """Health detail for a single fonte."""
    try:
        h = await monitor.get_fonte_health(fonte_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "fonte_id": str(h.fonte_id),
        "nome": h.nome,
        "platform": h.platform,
        "status": h.status,
        "last_run_at": h.last_run_at,
        "last_success_at": h.last_success_at,
        "success_rate_last_5": h.success_rate_last_5,
        "avg_novos_last_5": h.avg_novos_last_5,
        "avg_duration_ms": h.avg_duration_ms,
        "recent_runs": h.recent_runs,
    }


@router.get("/monitor/runs/{run_id}")
async def get_run_detail(
    run_id: UUID,
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """Full detail for a completed run (RED metrics)."""
    try:
        summary = await monitor.get_run_detail(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "run_id": str(summary.run_id),
        "fonte_id": str(summary.fonte_id),
        "fonte_nome": summary.fonte_nome,
        "status": summary.status,
        "started_at": summary.started_at,
        "finished_at": summary.finished_at,
        "duration_ms": summary.duration_ms,
        "registros_scraped": summary.registros_scraped,
        "registros_novos": summary.registros_novos,
        "registros_duplicados": summary.registros_duplicados,
        "erro_mensagem": summary.erro_mensagem,
        "total_requests": summary.total_requests,
        "successful_requests": summary.successful_requests,
        "failed_requests": summary.failed_requests,
        "cached_requests": summary.cached_requests,
    }


@router.get("/monitor/runs/{run_id}/live")
async def get_run_live(
    run_id: UUID,
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """Live status for an active run (poll every 3s)."""
    try:
        return await monitor.get_run_live(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/monitor/runs/{run_id}/requests")
async def get_run_requests(
    run_id: UUID,
    monitor: ScrapingMonitorService = Depends(get_scraping_monitor_service),
):
    """HTTP request log for a run."""
    return await monitor.get_run_requests(run_id)


# === Query ===


@router.get("/plataformas")
async def list_platforms(
    service: ScrapingService = Depends(get_scraping_service),
):
    """List available scraping platforms."""
    return service.list_platforms()
