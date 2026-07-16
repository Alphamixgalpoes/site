from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.repositories.contato_repo import ContatoRepository


class SupabaseContatoRepo(ContatoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_active(self) -> list[dict[str, Any]]:
        res = self._sb.table("contatos").select("*").eq("ativo", True).order("nome").execute()
        return res.data or []

    async def get_by_id(self, contato_id: UUID) -> dict[str, Any] | None:
        res = (
            self._sb.table("contatos")
            .select("*")
            .eq("id", str(contato_id))
            .maybe_single()
            .execute()
        )
        return res.data

    async def search(self, term: str) -> list[dict[str, Any]]:
        res = (
            self._sb.table("contatos")
            .select("id, nome, tipo_principal, empresa")
            .eq("ativo", True)
            .ilike("nome", f"%{term}%")
            .limit(20)
            .execute()
        )
        return res.data or []

    async def create(self, data: dict[str, Any]) -> dict[str, Any]:
        res = self._sb.table("contatos").insert(data).execute()
        return res.data[0]

    async def update(self, contato_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        res = (
            self._sb.table("contatos")
            .update(data)
            .eq("id", str(contato_id))
            .execute()
        )
        return res.data[0]

    async def soft_delete(self, contato_id: UUID) -> None:
        self._sb.table("contatos").update({"ativo": False}).eq("id", str(contato_id)).execute()

    async def get_relationships(self, contato_id: UUID) -> dict[str, Any]:
        cid = str(contato_id)
        pc = self._sb.table("processo_contatos").select("id, processo_id, papel, processos(id, titulo, tipo, status)").eq("contato_id", cid).execute()
        prop_galpoes = self._sb.table("galpoes").select("id, titulo, tipo, categoria, cidade, publicado, area_construida_m2").eq("proprietario_id", cid).execute()
        prop_procs = self._sb.table("processos").select("id, titulo, tipo, status, valor").eq("proprietario_id", cid).execute()
        cli_procs = self._sb.table("processos").select("id, titulo, tipo, status, valor").eq("cliente_id", cid).execute()
        return {
            "processo_contatos": pc.data or [],
            "imoveis_proprietario": prop_galpoes.data or [],
            "processos_proprietario": prop_procs.data or [],
            "processos_cliente": cli_procs.data or [],
        }
