from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.mdm import (
    Fonte, Importacao, FonteRegistro, ImovelFonte,
    ConsolidacaoLog, RegraEnriquecimento, RegraAprovacao,
    MercadoSnapshot, CacheConsulta,
)
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, ImportacaoRepository, FonteRegistroRepository,
    ImovelFonteRepository, ConsolidacaoLogRepository,
    RegraEnriquecimentoRepository, RegraAprovacaoRepository,
    MercadoSnapshotRepository, CacheConsultaRepository,
)


# --- Helpers ---

def _to_fonte(row: dict) -> Fonte:
    return Fonte(**{k: v for k, v in row.items() if k in {
        "id", "nome", "tipo", "prioridade", "ativo", "config", "schema_map",
        "baseline_registros", "baseline_preenchimento", "created_at", "updated_at",
    }})


def _to_importacao(row: dict) -> Importacao:
    return Importacao(**{k: v for k, v in row.items() if k in {
        "id", "fonte_id", "status", "arquivo_nome",
        "registros_total", "registros_importados", "registros_erro",
        "erros", "stats", "alertas", "cards_gerados",
        "started_at", "finished_at", "created_at",
    }})


def _to_fonte_registro(row: dict) -> FonteRegistro:
    return FonteRegistro(**{k: v for k, v in row.items() if k in {
        "id", "fonte_id", "importacao_id", "dados_brutos",
        "dados_normalizados", "hash_dedup", "valid_from", "created_at",
    }})


def _to_imovel_fonte(row: dict) -> ImovelFonte:
    return ImovelFonte(**{k: v for k, v in row.items() if k in {
        "id", "imovel_id", "fonte_registro_id", "recomendacao_id",
        "campos_usados", "tipo_match", "score_match", "created_at",
    }})


def _to_consolidacao_log(row: dict) -> ConsolidacaoLog:
    return ConsolidacaoLog(**{k: v for k, v in row.items() if k in {
        "id", "status", "fontes_processadas", "registros_entrada",
        "cards_criar", "cards_atualizar", "cards_mesclar", "cards_total",
        "started_at", "finished_at",
    }})


def _to_regra_enriq(row: dict) -> RegraEnriquecimento:
    return RegraEnriquecimento(**{k: v for k, v in row.items() if k in {
        "id", "nome", "condicao", "acao", "config", "ativo", "ordem", "created_at",
    }})


def _to_regra_aprov(row: dict) -> RegraAprovacao:
    return RegraAprovacao(**{k: v for k, v in row.items() if k in {
        "id", "nome", "condicao", "ativo", "ordem", "aprovacoes_total", "created_at",
    }})


def _to_mercado(row: dict) -> MercadoSnapshot:
    return MercadoSnapshot(**{k: v for k, v in row.items() if k in {
        "id", "fonte", "data_coleta", "endereco", "bairro", "cidade",
        "area", "valor_venda", "valor_locacao", "url_anuncio", "dados_raw", "created_at",
    }})


def _to_cache(row: dict) -> CacheConsulta:
    return CacheConsulta(**{k: v for k, v in row.items() if k in {
        "id", "tipo", "chave", "dados", "created_at", "expires_at",
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


class SupabaseImportacaoRepo(ImportacaoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> Importacao:
        res = self._sb.table("importacoes").insert(data).execute()
        return _to_importacao(res.data[0])

    async def update(self, imp_id: UUID, data: dict[str, Any]) -> Importacao:
        res = self._sb.table("importacoes").update(data).eq("id", str(imp_id)).execute()
        return _to_importacao(res.data[0])

    async def get_by_fonte(self, fonte_id: UUID) -> list[Importacao]:
        res = self._sb.table("importacoes").select("*").eq("fonte_id", str(fonte_id)).order("created_at", desc=True).execute()
        return [_to_importacao(r) for r in (res.data or [])]

    async def get_by_id(self, imp_id: UUID) -> Importacao | None:
        res = self._sb.table("importacoes").select("*").eq("id", str(imp_id)).maybe_single().execute()
        return _to_importacao(res.data) if res.data else None


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


class SupabaseConsolidacaoLogRepo(ConsolidacaoLogRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> ConsolidacaoLog:
        res = self._sb.table("consolidacao_log").insert(data).execute()
        return _to_consolidacao_log(res.data[0])

    async def update(self, log_id: UUID, data: dict[str, Any]) -> ConsolidacaoLog:
        res = self._sb.table("consolidacao_log").update(data).eq("id", str(log_id)).execute()
        return _to_consolidacao_log(res.data[0])

    async def list_all(self) -> list[ConsolidacaoLog]:
        res = self._sb.table("consolidacao_log").select("*").order("started_at", desc=True).execute()
        return [_to_consolidacao_log(r) for r in (res.data or [])]


class SupabaseRegraEnriquecimentoRepo(RegraEnriquecimentoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[RegraEnriquecimento]:
        res = self._sb.table("regras_enriquecimento").select("*").order("ordem").execute()
        return [_to_regra_enriq(r) for r in (res.data or [])]

    async def create(self, data: dict[str, Any]) -> RegraEnriquecimento:
        res = self._sb.table("regras_enriquecimento").insert(data).execute()
        return _to_regra_enriq(res.data[0])

    async def update(self, regra_id: UUID, data: dict[str, Any]) -> RegraEnriquecimento:
        res = self._sb.table("regras_enriquecimento").update(data).eq("id", str(regra_id)).execute()
        return _to_regra_enriq(res.data[0])


class SupabaseRegraAprovacaoRepo(RegraAprovacaoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[RegraAprovacao]:
        res = self._sb.table("regras_aprovacao").select("*").order("ordem").execute()
        return [_to_regra_aprov(r) for r in (res.data or [])]

    async def create(self, data: dict[str, Any]) -> RegraAprovacao:
        res = self._sb.table("regras_aprovacao").insert(data).execute()
        return _to_regra_aprov(res.data[0])


class SupabaseMercadoSnapshotRepo(MercadoSnapshotRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> MercadoSnapshot:
        res = self._sb.table("mercado_snapshots").insert(data).execute()
        return _to_mercado(res.data[0])

    async def list_all(self, limit: int = 100) -> list[MercadoSnapshot]:
        res = self._sb.table("mercado_snapshots").select("*").order("data_coleta", desc=True).limit(limit).execute()
        return [_to_mercado(r) for r in (res.data or [])]


class SupabaseCacheConsultaRepo(CacheConsultaRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def get(self, tipo: str, chave: str) -> CacheConsulta | None:
        res = (
            self._sb.table("cache_consultas")
            .select("*")
            .eq("tipo", tipo)
            .eq("chave", chave)
            .maybe_single()
            .execute()
        )
        return _to_cache(res.data) if res.data else None

    async def set(self, tipo: str, chave: str, dados: dict, expires_at: str) -> CacheConsulta:
        res = (
            self._sb.table("cache_consultas")
            .upsert({"tipo": tipo, "chave": chave, "dados": dados, "expires_at": expires_at})
            .execute()
        )
        return _to_cache(res.data[0])
