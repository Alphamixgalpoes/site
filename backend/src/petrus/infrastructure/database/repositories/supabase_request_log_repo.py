"""Supabase implementation of RequestLogRepository."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.scraping import RequestLog
from petrus.domain.repositories.scraping_repo import RequestLogRepository


class SupabaseRequestLogRepo(RequestLogRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create_batch(self, logs: list[dict[str, Any]]) -> int:
        if not logs:
            return 0
        res = self._sb.table("scraping_request_log").insert(logs).execute()
        return len(res.data) if res.data else 0

    async def get_by_run(self, run_id: UUID) -> list[RequestLog]:
        res = (
            self._sb.table("scraping_request_log")
            .select("*")
            .eq("run_id", str(run_id))
            .order("created_at")
            .execute()
        )
        return [_to_request_log(r) for r in (res.data or [])]

    async def count_by_run(self, run_id: UUID) -> dict[str, int]:
        rows = (
            self._sb.table("scraping_request_log")
            .select("status_code,cached")
            .eq("run_id", str(run_id))
            .execute()
        )
        data = rows.data or []
        total = len(data)
        cached = sum(1 for r in data if r.get("cached"))
        failed = sum(1 for r in data if not r.get("status_code") or r["status_code"] >= 400)
        successful = total - failed
        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "cached": cached,
        }


def _to_request_log(row: dict) -> RequestLog:
    return RequestLog(
        id=UUID(row["id"]),
        run_id=UUID(row["run_id"]) if row.get("run_id") else None,
        url=row.get("url", ""),
        domain=row.get("domain", ""),
        method=row.get("method", "GET"),
        status_code=row.get("status_code"),
        response_time_ms=row.get("response_time_ms"),
        cached=row.get("cached", False),
        error=row.get("error"),
        created_at=row.get("created_at"),
    )
