"""Scraping domain entities for observability and monitoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class RequestLog:
    """A single HTTP request made during a scraping run."""

    id: UUID
    run_id: UUID | None
    url: str
    domain: str
    method: str
    status_code: int | None
    response_time_ms: int | None
    cached: bool
    error: str | None
    created_at: str | None = None


@dataclass(frozen=True)
class RunSummary:
    """Aggregated view of a scraping run with request metrics."""

    run_id: UUID
    fonte_id: UUID
    fonte_nome: str
    status: str
    started_at: str | None
    finished_at: str | None
    duration_ms: int | None
    registros_scraped: int
    registros_novos: int
    registros_duplicados: int
    erro_mensagem: str | None
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    cached_requests: int = 0


@dataclass(frozen=True)
class FonteHealth:
    """Health status of a fonte's scraping pipeline."""

    fonte_id: UUID
    nome: str
    platform: str
    status: str  # ok | warning | error | stale | never
    last_run_at: str | None
    last_success_at: str | None
    success_rate_last_5: float
    avg_novos_last_5: float
    avg_duration_ms: float
    recent_runs: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class ScrapingOverview:
    """Global scraping health summary."""

    total_fontes: int
    fontes_ok: int
    fontes_warning: int
    fontes_error: int
    fontes_stale: int
    fontes_never: int
    runs_last_7d: int
    novos_last_7d: int
