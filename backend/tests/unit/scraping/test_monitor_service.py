"""Unit tests for ScrapingMonitorService."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from petrus.application.scraping_monitor_service import ScrapingMonitorService
from petrus.domain.entities.mdm import Fonte, ScrapingRun
from tests.fakes.repositories import (
    InMemoryFonteRepo,
    InMemoryRequestLogRepo,
    InMemoryScrapingRunRepo,
)


def _make_fonte(**overrides) -> Fonte:
    defaults = {
        "id": uuid4(),
        "nome": "Test Fonte",
        "tipo": "url",
        "ativo": True,
        "submission_type": "url",
        "config": {"platform": "static_html"},
    }
    defaults.update(overrides)
    return Fonte(**defaults)


def _make_run(fonte_id, **overrides) -> ScrapingRun:
    defaults = {
        "id": uuid4(),
        "fonte_id": fonte_id,
        "url": "https://example.com",
        "status": "concluido",
        "registros_scraped": 10,
        "registros_novos": 5,
        "registros_duplicados": 5,
        "created_at": datetime.now(UTC).isoformat(),
        "started_at": (datetime.now(UTC) - timedelta(seconds=30)).isoformat(),
        "finished_at": datetime.now(UTC).isoformat(),
    }
    defaults.update(overrides)
    return ScrapingRun(**defaults)


def _build_service():
    fonte_repo = InMemoryFonteRepo()
    scraping_repo = InMemoryScrapingRunRepo()
    log_repo = InMemoryRequestLogRepo()
    service = ScrapingMonitorService(fonte_repo, scraping_repo, log_repo)
    return service, fonte_repo, scraping_repo, log_repo


@pytest.mark.unit
class TestOverview:
    @pytest.mark.asyncio
    async def test_empty_overview(self):
        svc, _, _, _ = _build_service()
        overview = await svc.get_overview()
        assert overview.total_fontes == 0
        assert overview.fontes_ok == 0
        assert overview.runs_last_7d == 0

    @pytest.mark.asyncio
    async def test_overview_counts_scraping_fontes_only(self):
        svc, fonte_repo, _, _ = _build_service()
        # URL fonte (counted)
        fonte_repo._store[uuid4()] = _make_fonte(submission_type="url")
        # Spreadsheet fonte (not counted)
        fonte_repo._store[uuid4()] = _make_fonte(submission_type="spreadsheet")

        overview = await svc.get_overview()
        assert overview.total_fontes == 1


@pytest.mark.unit
class TestFonteHealth:
    @pytest.mark.asyncio
    async def test_never_status_when_no_runs(self):
        svc, fonte_repo, _, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        health = await svc.get_fonte_health(fonte.id)
        assert health.status == "never"
        assert health.success_rate_last_5 == 0.0

    @pytest.mark.asyncio
    async def test_ok_status_with_successful_runs(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        run = _make_run(fonte.id, status="concluido", registros_novos=5)
        scraping_repo._store[run.id] = run

        health = await svc.get_fonte_health(fonte.id)
        assert health.status == "ok"
        assert health.success_rate_last_5 == 1.0

    @pytest.mark.asyncio
    async def test_error_status_when_last_run_failed(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        run = _make_run(fonte.id, status="erro")
        scraping_repo._store[run.id] = run

        health = await svc.get_fonte_health(fonte.id)
        assert health.status == "error"

    @pytest.mark.asyncio
    async def test_warning_when_zero_novos(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        run = _make_run(
            fonte.id, status="concluido",
            registros_novos=0, registros_scraped=10,
        )
        scraping_repo._store[run.id] = run

        health = await svc.get_fonte_health(fonte.id)
        assert health.status == "warning"

    @pytest.mark.asyncio
    async def test_stale_when_old_success(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        old_time = (datetime.now(UTC) - timedelta(days=30)).isoformat()
        run = _make_run(
            fonte.id, status="concluido",
            registros_novos=5,
            started_at=old_time,
            finished_at=old_time,
            created_at=old_time,
        )
        scraping_repo._store[run.id] = run

        health = await svc.get_fonte_health(fonte.id)
        assert health.status == "stale"

    @pytest.mark.asyncio
    async def test_fonte_not_found_raises(self):
        svc, _, _, _ = _build_service()
        with pytest.raises(ValueError, match="nao encontrada"):
            await svc.get_fonte_health(uuid4())


@pytest.mark.unit
class TestRunDetail:
    @pytest.mark.asyncio
    async def test_run_not_found_raises(self):
        svc, _, _, _ = _build_service()
        with pytest.raises(ValueError, match="nao encontrado"):
            await svc.get_run_detail(uuid4())

    @pytest.mark.asyncio
    async def test_run_detail_computes_duration(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        start = datetime.now(UTC) - timedelta(seconds=5)
        end = datetime.now(UTC)
        run = _make_run(
            fonte.id,
            started_at=start.isoformat(),
            finished_at=end.isoformat(),
        )
        scraping_repo._store[run.id] = run

        detail = await svc.get_run_detail(run.id)
        assert detail.duration_ms is not None
        assert detail.duration_ms >= 4000

    @pytest.mark.asyncio
    async def test_run_live(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte

        run = _make_run(
            fonte.id, status="processando",
            started_at=datetime.now(UTC).isoformat(),
            finished_at=None,
        )
        scraping_repo._store[run.id] = run

        live = await svc.get_run_live(run.id)
        assert live["status"] == "processando"
        assert live["elapsed_seconds"] is not None


@pytest.mark.unit
class TestRunRequests:
    @pytest.mark.asyncio
    async def test_empty_requests(self):
        svc, fonte_repo, scraping_repo, _ = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte
        run = _make_run(fonte.id)
        scraping_repo._store[run.id] = run

        reqs = await svc.get_run_requests(run.id)
        assert reqs == []

    @pytest.mark.asyncio
    async def test_requests_with_logs(self):
        svc, fonte_repo, scraping_repo, log_repo = _build_service()
        fonte = _make_fonte()
        fonte_repo._store[fonte.id] = fonte
        run = _make_run(fonte.id)
        scraping_repo._store[run.id] = run

        await log_repo.create_batch([
            {"run_id": str(run.id), "url": "https://a.com", "domain": "a.com",
             "method": "GET", "status_code": 200, "response_time_ms": 100,
             "cached": False, "error": None},
            {"run_id": str(run.id), "url": "https://b.com", "domain": "b.com",
             "method": "GET", "status_code": 404, "response_time_ms": 50,
             "cached": False, "error": "Not Found"},
        ])

        reqs = await svc.get_run_requests(run.id)
        assert len(reqs) == 2
