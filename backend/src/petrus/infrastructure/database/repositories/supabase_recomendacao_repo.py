from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.recomendacao import Recomendacao
from petrus.domain.entities.mdm_types import CardResumo
from petrus.domain.repositories.recomendacao_repo import RecomendacaoRepository


def _to_rec(row: dict) -> Recomendacao:
    return Recomendacao(**{k: v for k, v in row.items() if k in {
        "id", "tipo", "status", "imovel_id", "imovel_secundario_id",
        "dados_propostos", "dados_atuais", "campos_alterados", "mensagem",
        "fonte_id", "fonte_registro_id", "importacao_id",
        "confianca", "score_match", "cidade", "bairro", "area", "valor",
        "dados_aprovados", "resolvido_em", "notas_resolucao", "regra_auto_id",
        "created_at",
    }})


class SupabaseRecomendacaoRepo(RecomendacaoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def create(self, data: dict[str, Any]) -> Recomendacao:
        res = self._sb.table("recomendacoes").insert(data).execute()
        return _to_rec(res.data[0])

    async def get_by_id(self, rec_id: UUID) -> Recomendacao | None:
        res = (
            self._sb.table("recomendacoes")
            .select("*")
            .eq("id", str(rec_id))
            .maybe_single()
            .execute()
        )
        return _to_rec(res.data) if res.data else None

    async def update_status(
        self, rec_id: UUID, status: str, dados_aprovados: dict | None = None, notas: str | None = None
    ) -> Recomendacao:
        update: dict[str, Any] = {"status": status, "resolvido_em": "now()"}
        if dados_aprovados is not None:
            update["dados_aprovados"] = dados_aprovados
        if notas is not None:
            update["notas_resolucao"] = notas
        res = (
            self._sb.table("recomendacoes")
            .update(update)
            .eq("id", str(rec_id))
            .execute()
        )
        return _to_rec(res.data[0])

    async def list_pendentes(self, filtros: dict[str, Any] | None = None) -> list[Recomendacao]:
        q = self._sb.table("recomendacoes").select("*").eq("status", "pendente")
        if filtros:
            if filtros.get("tipo"):
                q = q.eq("tipo", filtros["tipo"])
            if filtros.get("cidade"):
                q = q.eq("cidade", filtros["cidade"])
            if filtros.get("area_min"):
                q = q.gte("area", filtros["area_min"])
            if filtros.get("area_max"):
                q = q.lte("area", filtros["area_max"])
            if filtros.get("valor_min"):
                q = q.gte("valor", filtros["valor_min"])
            if filtros.get("valor_max"):
                q = q.lte("valor", filtros["valor_max"])
            if filtros.get("confianca_min"):
                q = q.gte("confianca", filtros["confianca_min"])
            if filtros.get("fonte_id"):
                q = q.eq("fonte_id", filtros["fonte_id"])
            if filtros.get("importacao_id"):
                q = q.eq("importacao_id", filtros["importacao_id"])
        q = q.order("created_at", desc=True)
        res = q.execute()
        return [_to_rec(row) for row in (res.data or [])]

    async def count_by_tipo(self) -> CardResumo:
        res = (
            self._sb.table("recomendacoes")
            .select("tipo")
            .eq("status", "pendente")
            .execute()
        )
        resumo = CardResumo()
        for row in (res.data or []):
            t = row["tipo"]
            if t == "criar":
                resumo.criar += 1
            elif t == "atualizar":
                resumo.atualizar += 1
            elif t == "mesclar":
                resumo.mesclar += 1
            elif t == "enriquecer":
                resumo.enriquecer += 1
            elif t == "alertar":
                resumo.alertar += 1
        resumo.total = resumo.criar + resumo.atualizar + resumo.mesclar + resumo.enriquecer + resumo.alertar
        return resumo

    async def get_by_importacao(self, importacao_id: UUID) -> list[Recomendacao]:
        res = (
            self._sb.table("recomendacoes")
            .select("*")
            .eq("importacao_id", str(importacao_id))
            .order("created_at", desc=True)
            .execute()
        )
        return [_to_rec(row) for row in (res.data or [])]

    async def get_by_imovel(self, imovel_id: UUID) -> list[Recomendacao]:
        res = (
            self._sb.table("recomendacoes")
            .select("*")
            .eq("imovel_id", str(imovel_id))
            .order("created_at", desc=True)
            .execute()
        )
        return [_to_rec(row) for row in (res.data or [])]

    async def batch_update_status(self, ids: list[UUID], status: str, notas: str | None = None) -> int:
        update: dict[str, Any] = {"status": status, "resolvido_em": "now()"}
        if notas:
            update["notas_resolucao"] = notas
        str_ids = [str(i) for i in ids]
        res = (
            self._sb.table("recomendacoes")
            .update(update)
            .in_("id", str_ids)
            .execute()
        )
        return len(res.data or [])
