"""Read-only service for scraping observability and monitoring."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from petrus.domain.entities.scraping import (
    FonteHealth,
    RunSummary,
    ScrapingOverview,
)
from petrus.domain.repositories.mdm_repo import (
    FonteRepository,
    ScrapingRunRepository,
)
from petrus.domain.repositories.scraping_repo import RequestLogRepository

_STALE_DAYS = 14


class ScrapingMonitorService:
    """Aggregates scraping data for the monitoring dashboard.

    All methods are read-only queries — no side effects.
    """

    def __init__(
        self,
        fonte_repo: FonteRepository,
        scraping_repo: ScrapingRunRepository,
        request_log_repo: RequestLogRepository,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._scraping_repo = scraping_repo
        self._log_repo = request_log_repo

    async def get_overview(self) -> ScrapingOverview:
        fontes = await self._fonte_repo.list_all()
        scraping_fontes = [
            f for f in fontes
            if f.ativo and f.submission_type == "url"
        ]

        healths = []
        for f in scraping_fontes:
            h = await self._compute_fonte_health(f)
            healths.append(h)

        recent_runs = await self._scraping_repo.get_recent(limit=100)
        cutoff = (datetime.now(UTC) - timedelta(days=7)).isoformat()
        runs_7d = [r for r in recent_runs if (r.created_at or "") >= cutoff]
        novos_7d = sum(r.registros_novos or 0 for r in runs_7d)

        return ScrapingOverview(
            total_fontes=len(scraping_fontes),
            fontes_ok=sum(1 for h in healths if h.status == "ok"),
            fontes_warning=sum(1 for h in healths if h.status == "warning"),
            fontes_error=sum(1 for h in healths if h.status == "error"),
            fontes_stale=sum(1 for h in healths if h.status == "stale"),
            fontes_never=sum(1 for h in healths if h.status == "never"),
            runs_last_7d=len(runs_7d),
            novos_last_7d=novos_7d,
        )

    async def get_all_fontes_health(self) -> list[FonteHealth]:
        fontes = await self._fonte_repo.list_all()
        scraping_fontes = [
            f for f in fontes
            if f.ativo and f.submission_type == "url"
        ]
        results = []
        for f in scraping_fontes:
            h = await self._compute_fonte_health(f)
            results.append(h)
        return results

    async def get_fonte_health(self, fonte_id: UUID) -> FonteHealth:
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError(f"Fonte {fonte_id} nao encontrada")
        return await self._compute_fonte_health(fonte)

    async def get_run_detail(self, run_id: UUID) -> RunSummary:
        run = await self._scraping_repo.get_by_id(run_id)
        if not run:
            raise ValueError(f"Run {run_id} nao encontrado")

        fonte = await self._fonte_repo.get_by_id(run.fonte_id)
        fonte_nome = fonte.nome if fonte else "Desconhecida"

        req_counts = await self._log_repo.count_by_run(run_id)

        duration_ms = None
        if run.started_at and run.finished_at:
            try:
                start = datetime.fromisoformat(run.started_at)
                end = datetime.fromisoformat(run.finished_at)
                duration_ms = int((end - start).total_seconds() * 1000)
            except (ValueError, TypeError):
                pass

        return RunSummary(
            run_id=run.id,
            fonte_id=run.fonte_id,
            fonte_nome=fonte_nome,
            status=run.status,
            started_at=run.started_at,
            finished_at=run.finished_at,
            duration_ms=duration_ms,
            registros_scraped=run.registros_scraped or 0,
            registros_novos=run.registros_novos or 0,
            registros_duplicados=run.registros_duplicados or 0,
            erro_mensagem=run.erro_mensagem,
            total_requests=req_counts.get("total", 0),
            successful_requests=req_counts.get("successful", 0),
            failed_requests=req_counts.get("failed", 0),
            cached_requests=req_counts.get("cached", 0),
        )

    async def get_run_requests(self, run_id: UUID) -> list[dict[str, Any]]:
        logs = await self._log_repo.get_by_run(run_id)
        return [
            {
                "id": str(log.id),
                "url": log.url,
                "domain": log.domain,
                "method": log.method,
                "status_code": log.status_code,
                "response_time_ms": log.response_time_ms,
                "cached": log.cached,
                "error": log.error,
                "created_at": log.created_at,
            }
            for log in logs
        ]

    async def get_run_live(self, run_id: UUID) -> dict[str, Any]:
        run = await self._scraping_repo.get_by_id(run_id)
        if not run:
            raise ValueError(f"Run {run_id} nao encontrado")

        elapsed_seconds = None
        if run.started_at and run.status == "processando":
            try:
                start = datetime.fromisoformat(run.started_at)
                elapsed_seconds = int(
                    (datetime.now(UTC) - start).total_seconds()
                )
            except (ValueError, TypeError):
                pass

        return {
            "run_id": str(run.id),
            "status": run.status,
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "elapsed_seconds": elapsed_seconds,
            "registros_scraped": run.registros_scraped or 0,
            "registros_novos": run.registros_novos or 0,
        }

    async def _compute_fonte_health(self, fonte: Any) -> FonteHealth:
        runs = await self._scraping_repo.get_by_fonte_recent(fonte.id, limit=5)

        recent_runs_data = [
            {
                "id": str(r.id),
                "status": r.status,
                "registros_scraped": r.registros_scraped or 0,
                "registros_novos": r.registros_novos or 0,
                "registros_duplicados": r.registros_duplicados or 0,
                "erro_mensagem": r.erro_mensagem,
                "started_at": r.started_at,
                "finished_at": r.finished_at,
                "created_at": r.created_at,
            }
            for r in runs
        ]

        if not runs:
            return FonteHealth(
                fonte_id=fonte.id,
                nome=fonte.nome,
                platform=fonte.config.get("platform", fonte.tipo or ""),
                status="never",
                last_run_at=None,
                last_success_at=None,
                success_rate_last_5=0.0,
                avg_novos_last_5=0.0,
                avg_duration_ms=0.0,
                recent_runs=recent_runs_data,
            )

        concluded = [r for r in runs if r.status in ("concluido", "erro")]
        successes = [r for r in concluded if r.status == "concluido"]
        success_rate = len(successes) / len(concluded) if concluded else 0.0

        avg_novos = (
            sum(r.registros_novos or 0 for r in successes) / len(successes)
            if successes else 0.0
        )

        durations = []
        for r in successes:
            if r.started_at and r.finished_at:
                try:
                    s = datetime.fromisoformat(r.started_at)
                    e = datetime.fromisoformat(r.finished_at)
                    durations.append((e - s).total_seconds() * 1000)
                except (ValueError, TypeError):
                    pass
        avg_duration = sum(durations) / len(durations) if durations else 0.0

        last_run = runs[0]
        last_success = next((r for r in runs if r.status == "concluido"), None)

        # Determine status
        if last_run.status == "erro":
            status = "error"
        elif last_run.status == "concluido" and (last_run.registros_novos or 0) == 0:
            status = "warning"
        elif last_success:
            cutoff = (
                datetime.now(UTC) - timedelta(days=_STALE_DAYS)
            ).isoformat()
            if (last_success.finished_at or "") < cutoff:
                status = "stale"
            else:
                status = "ok"
        else:
            status = "error"

        return FonteHealth(
            fonte_id=fonte.id,
            nome=fonte.nome,
            platform=fonte.config.get("platform", fonte.tipo or ""),
            status=status,
            last_run_at=last_run.created_at,
            last_success_at=last_success.finished_at if last_success else None,
            success_rate_last_5=round(success_rate, 2),
            avg_novos_last_5=round(avg_novos, 1),
            avg_duration_ms=round(avg_duration),
            recent_runs=recent_runs_data,
        )
