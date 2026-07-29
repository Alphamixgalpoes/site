"""Orchestrates the scraping lifecycle.

Resolves the correct scraper, executes crawl, saves results
as raw FonteRegistros, and updates ScrapingRun status.
Supports incremental scraping via source_id dedup and content hashing.
Flushes request logs after each run for observability.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

# Importing scrapers triggers auto-registration in ScraperRegistry
import petrus.infrastructure.scraping.scrapers  # noqa: F401
from petrus.domain.repositories.mdm_repo import (
    FonteRegistroRepository,
    FonteRepository,
    ScrapingRunRepository,
)
from petrus.domain.repositories.scraping_repo import RequestLogRepository
from petrus.domain.services.scraper import ScrapingConfig
from petrus.infrastructure.scraping.cache.page_cache import PageCache
from petrus.infrastructure.scraping.http.fetcher import PageFetcher
from petrus.infrastructure.scraping.http.rate_limiter import RateLimiter
from petrus.infrastructure.scraping.http.robots import RobotsTxtChecker
from petrus.infrastructure.scraping.registry import ScraperRegistry

logger = logging.getLogger(__name__)


def _content_hash(raw_data: dict[str, Any]) -> str:
    """Compute deterministic hash of raw data for change detection."""
    stable = json.dumps(raw_data, sort_keys=True, default=str)
    return hashlib.sha256(stable.encode()).hexdigest()[:16]


class ScrapingService:
    """Orchestrates scraping jobs from queue to raw registros.

    Flow:
    1. Resolve scraper via ScraperRegistry + fonte.config["platform"]
    2. Execute crawl
    3. Flush request logs to DB
    4. Save results as FonteRegistro(stage="raw")
    5. Update ScrapingRun with status/metrics
    """

    def __init__(
        self,
        fonte_repo: FonteRepository,
        registro_repo: FonteRegistroRepository,
        scraping_repo: ScrapingRunRepository,
        request_log_repo: RequestLogRepository | None = None,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._reg_repo = registro_repo
        self._scraping_repo = scraping_repo
        self._log_repo = request_log_repo
        self._fetcher: PageFetcher | None = None

    def _get_fetcher(self) -> PageFetcher:
        if self._fetcher is None:
            self._fetcher = PageFetcher(
                rate_limiter=RateLimiter(default_interval=1.5),
                robots_checker=RobotsTxtChecker(),
                cache=PageCache(),
            )
        return self._fetcher

    async def start_run(self, run_id: UUID) -> dict[str, Any]:
        """Validate and mark a run as processing. Returns immediately."""
        run = await self._scraping_repo.get_by_id(run_id)
        if not run:
            runs = await self._scraping_repo.list_pending()
            run = next((r for r in runs if r.id == run_id), None)

        if not run:
            raise ValueError(f"ScrapingRun {run_id} nao encontrado")

        await self._scraping_repo.update(run.id, {
            "status": "processando",
            "started_at": datetime.now(UTC).isoformat(),
        })

        return {"run_id": str(run.id), "status": "processando"}

    async def execute_run(self, run_id: UUID) -> dict[str, Any]:
        """Execute a single ScrapingRun (full lifecycle).

        Returns: {scraped, novos, duplicados, atualizados, erros}
        """
        run = await self._scraping_repo.get_by_id(run_id)
        if not run:
            runs = await self._scraping_repo.list_pending()
            run = next((r for r in runs if r.id == run_id), None)

        if not run:
            raise ValueError(f"ScrapingRun {run_id} nao encontrado")

        fonte = await self._fonte_repo.get_by_id(run.fonte_id)
        if not fonte:
            raise ValueError(f"Fonte {run.fonte_id} nao encontrada")

        # Mark as processing (if not already by start_run)
        if run.status != "processando":
            await self._scraping_repo.update(run.id, {
                "status": "processando",
                "started_at": datetime.now(UTC).isoformat(),
            })

        try:
            # Resolve scraper
            platform = fonte.config.get("platform", fonte.tipo)
            scraper_cls = ScraperRegistry.get(platform)
            fetcher = self._get_fetcher()
            scraper = scraper_cls(fetcher)

            # Build config
            config = ScrapingConfig.from_fonte_config({
                **fonte.config,
                "platform": platform,
                "base_url": fonte.url or fonte.config.get("base_url", ""),
            })

            # Execute crawl
            logger.info(
                "Starting crawl for fonte %s (platform=%s)",
                fonte.nome, platform,
            )
            crawl_results = await scraper.crawl(config)
            logger.info(
                "Crawled %d results from %s",
                len(crawl_results), fonte.nome,
            )

            # Flush request logs
            await self._flush_request_logs(run.id, fetcher)

            # Build index of existing registros for dedup
            existing = await self._reg_repo.get_by_fonte_and_stage(
                fonte.id, "raw",
            )
            existing_by_source: dict[str, Any] = {}
            for reg in existing:
                sid = reg.dados_brutos.get("_source_id")
                if sid:
                    existing_by_source[sid] = reg

            # Save as raw registros (incremental)
            novos = 0
            duplicados = 0
            atualizados = 0
            batch: list[dict[str, Any]] = []
            now_iso = datetime.now(UTC).isoformat()

            for result in crawl_results:
                raw_data = dict(result.raw_data)
                if result.images:
                    raw_data["_images"] = result.images
                source_id = result.source_id or ""
                if source_id:
                    raw_data["_source_id"] = source_id

                content_hash = _content_hash(raw_data)
                prev = existing_by_source.get(source_id) if source_id else None

                if prev is not None:
                    old_hash = prev.dados_brutos.get("_hash", "")
                    if old_hash == content_hash:
                        duplicados += 1
                    else:
                        raw_data["_hash"] = content_hash
                        await self._reg_repo.update(prev.id, {
                            "dados_brutos": raw_data,
                            "last_seen_at": now_iso,
                            "seen_count": (prev.seen_count or 1) + 1,
                        })
                        atualizados += 1
                else:
                    raw_data["_hash"] = content_hash
                    batch.append({
                        "fonte_id": str(fonte.id),
                        "dados_brutos": raw_data,
                        "stage": "raw",
                        "source_id": source_id or None,
                        "hash_conteudo": content_hash,
                        "scraping_run_id": str(run.id),
                        "first_seen_at": now_iso,
                        "last_seen_at": now_iso,
                        "seen_count": 1,
                    })
                    novos += 1

            if batch:
                await self._reg_repo.create_batch(batch)

            # Update run status
            await self._scraping_repo.update(run.id, {
                "status": "concluido",
                "registros_scraped": len(crawl_results),
                "registros_novos": novos,
                "registros_duplicados": duplicados,
                "finished_at": datetime.now(UTC).isoformat(),
            })

            # Update fonte status
            await self._fonte_repo.update(fonte.id, {
                "scraping_status": "concluido",
                "processing_status": "tem_raw",
                "last_scraped_at": datetime.now(UTC).isoformat(),
            })

            result_dict = {
                "run_id": str(run.id),
                "fonte_id": str(fonte.id),
                "scraped": len(crawl_results),
                "novos": novos,
                "atualizados": atualizados,
                "duplicados": duplicados,
                "erros": 0,
            }
            logger.info("Scraping completed: %s", result_dict)
            return result_dict

        except Exception as exc:
            error_msg = str(exc)[:500]
            logger.exception(
                "Scraping failed for run %s: %s", run.id, error_msg,
            )

            # Still flush logs on error
            if self._fetcher:
                await self._flush_request_logs(run.id, self._fetcher)

            await self._scraping_repo.update(run.id, {
                "status": "erro",
                "erro_mensagem": error_msg,
                "finished_at": datetime.now(UTC).isoformat(),
            })

            await self._fonte_repo.update(fonte.id, {
                "scraping_status": "erro",
            })

            return {
                "run_id": str(run.id),
                "fonte_id": str(fonte.id),
                "scraped": 0,
                "novos": 0,
                "duplicados": 0,
                "erros": 1,
                "erro_mensagem": error_msg,
            }
        finally:
            if self._fetcher:
                await self._fetcher.close()
                self._fetcher = None

    async def _flush_request_logs(
        self, run_id: UUID, fetcher: PageFetcher,
    ) -> None:
        """Drain request logs from fetcher and persist them."""
        if not self._log_repo:
            return
        logs = fetcher.drain_logs()
        if logs:
            for log in logs:
                log["run_id"] = str(run_id)
            await self._log_repo.create_batch(logs)
            logger.debug("Flushed %d request logs for run %s", len(logs), run_id)

    async def execute_all_pending(self) -> list[dict[str, Any]]:
        """Execute all pending ScrapingRuns sequentially."""
        runs = await self._scraping_repo.list_pending()
        results: list[dict[str, Any]] = []

        for run in runs:
            result = await self.execute_run(run.id)
            results.append(result)

        return results

    async def preview(
        self, fonte_id: UUID, max_items: int = 5,
    ) -> list[dict[str, Any]]:
        """Execute partial crawl for preview (without saving to DB)."""
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError(f"Fonte {fonte_id} nao encontrada")

        platform = fonte.config.get("platform", fonte.tipo)
        scraper_cls = ScraperRegistry.get(platform)
        fetcher = self._get_fetcher()
        scraper = scraper_cls(fetcher)

        config = ScrapingConfig.from_fonte_config({
            **fonte.config,
            "platform": platform,
            "base_url": fonte.url or fonte.config.get("base_url", ""),
            "max_pages": 1,
        })

        try:
            results = await scraper.crawl(config)
            return [
                {
                    "url": r.url,
                    "source_id": r.source_id,
                    "raw_data": r.raw_data,
                    "images_count": len(r.images),
                }
                for r in results[:max_items]
            ]
        finally:
            await fetcher.close()

    def list_platforms(self) -> list[dict[str, str]]:
        """List available scraping platforms."""
        platforms = []
        for key in ScraperRegistry.available():
            platforms.append({"key": key})
        return platforms
