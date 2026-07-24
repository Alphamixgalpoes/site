from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.mdm import (
    Fonte, FonteRegistro, ImovelFonte, ScrapingRun,
)
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, FonteRegistroRepository,
    ImovelFonteRepository, ScrapingRunRepository,
)


# --- Helpers ---

def _to_fonte(row: dict) -> Fonte:
    return Fonte(**{k: v for k, v in row.items() if k in {
        "id", "nome", "tipo", "prioridade", "ativo", "config", "schema_map",
        "baseline_registros", "baseline_preenchimento",
        "submission_type", "url", "scraping_status", "processing_status",
        "storage_path", "last_processed_at", "last_scraped_at", "notas",
        "created_at", "updated_at",
    }})


def _to_fonte_registro(row: dict) -> FonteRegistro:
    return FonteRegistro(**{k: v for k, v in row.items() if k in {
        "id", "fonte_id", "importacao_id", "dados_brutos",
        "dados_normalizados", "hash_dedup", "valid_from",
        "stage", "raw_registro_id", "created_at",
    }})


def _to_imovel_fonte(row: dict) -> ImovelFonte:
    return ImovelFonte(**{k: v for k, v in row.items() if k in {
        "id", "imovel_id", "fonte_registro_id", "recomendacao_id",
        "campos_usados", "tipo_match", "score_match", "created_at",
    }})


def _to_scraping_run(row: dict) -> ScrapingRun:
    return ScrapingRun(**{k: v for k, v in row.items() if k in {
        "id", "fonte_id", "url", "status",
        "registros_scraped", "registros_novos", "registros_duplicados",
        "erro_mensagem", "notas_dev",
        "started_at", "finished_at", "created_at",
    }})


# --- Repos ---


class SupabaseFonteRepo(FonteRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Fonte]:
        res = self._sb.table("fontes").select("*").order("prioridade", desc=True).execute()
        return [_to_fonte(r) for r in (res.data or [])]

    async def get_by_id(self, fonte_id: UUID) -> Fonte | None:
        res = self._sb.table("fontes").select("*").eq("id", str(fonte_id)).maybe_single().execute()
        return _to_fonte(res.data) if res.data else None

    async def create(self, data: dict[str, Any]) -> Fonte:
        res = self._sb.table("fontes").insert(data).execute()
        return _to_fonte(res.data[0])

    async def update(self, fonte_id: UUID, data: dict[str, Any]) -> Fonte:
        res = self._sb.table("fontes").update(data).eq("id", str(fonte_id)).execute()
        return _to_fonte(res.data[0])

    async def delete(self, fonte_id: UUID) -> None:
        self._sb.table("fontes").delete().eq("id", str(fonte_id)).execute()


class SupabaseFonteRegistroRepo(FonteRegistroRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create_batch(self, registros: list[dict[str, Any]]) -> int:
        if not registros:
            return 0
        res = self._sb.table("fonte_registros").insert(registros).execute()
        return len(res.data or [])

    async def get_by_importacao(self, importacao_id: UUID) -> list[FonteRegistro]:
        res = self._sb.table("fonte_registros").select("*").eq("importacao_id", str(importacao_id)).execute()
        return [_to_fonte_registro(r) for r in (res.data or [])]

    async def get_by_fonte(self, fonte_id: UUID) -> list[FonteRegistro]:
        res = self._sb.table("fonte_registros").select("*").eq("fonte_id", str(fonte_id)).execute()
        return [_to_fonte_registro(r) for r in (res.data or [])]

    async def get_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> list[FonteRegistro]:
        res = (
            self._sb.table("fonte_registros")
            .select("*")
            .eq("fonte_id", str(fonte_id))
            .eq("stage", stage)
            .execute()
        )
        return [_to_fonte_registro(r) for r in (res.data or [])]

    async def delete_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> int:
        res = (
            self._sb.table("fonte_registros")
            .delete()
            .eq("fonte_id", str(fonte_id))
            .eq("stage", stage)
            .execute()
        )
        return len(res.data or [])

    async def get_by_hash(self, hash_dedup: str) -> FonteRegistro | None:
        res = self._sb.table("fonte_registros").select("*").eq("hash_dedup", hash_dedup).maybe_single().execute()
        return _to_fonte_registro(res.data) if res.data else None


class SupabaseImovelFonteRepo(ImovelFonteRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> ImovelFonte:
        res = self._sb.table("imovel_fontes").insert(data).execute()
        return _to_imovel_fonte(res.data[0])

    async def get_by_imovel(self, imovel_id: UUID) -> list[ImovelFonte]:
        res = self._sb.table("imovel_fontes").select("*").eq("imovel_id", str(imovel_id)).order("created_at", desc=True).execute()
        return [_to_imovel_fonte(r) for r in (res.data or [])]


class SupabaseScrapingRunRepo(ScrapingRunRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> ScrapingRun:
        res = self._sb.table("scraping_queue").insert(data).execute()
        return _to_scraping_run(res.data[0])

    async def update(self, run_id: UUID, data: dict[str, Any]) -> ScrapingRun:
        res = self._sb.table("scraping_queue").update(data).eq("id", str(run_id)).execute()
        return _to_scraping_run(res.data[0])

    async def get_by_fonte(self, fonte_id: UUID) -> list[ScrapingRun]:
        res = (
            self._sb.table("scraping_queue")
            .select("*")
            .eq("fonte_id", str(fonte_id))
            .order("created_at", desc=True)
            .execute()
        )
        return [_to_scraping_run(r) for r in (res.data or [])]

    async def list_pending(self) -> list[ScrapingRun]:
        res = (
            self._sb.table("scraping_queue")
            .select("*")
            .eq("status", "pendente")
            .order("created_at")
            .execute()
        )
        return [_to_scraping_run(r) for r in (res.data or [])]
