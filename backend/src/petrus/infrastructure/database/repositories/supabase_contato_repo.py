from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.contato import Contato, ContatoResumido
from petrus.domain.repositories.contato_repo import ContatoRepository

_CONTATO_FIELDS = {f.name for f in dc_fields(Contato)}


def _to_contato(row: dict) -> Contato:
    known = {k: v for k, v in row.items() if k in _CONTATO_FIELDS}
    return Contato(**known)


class SupabaseContatoRepo(ContatoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_active(self) -> list[Contato]:
        res = self._sb.table("contatos").select("*").eq("ativo", True).order("nome").execute()
        return [_to_contato(row) for row in (res.data or [])]

    async def get_by_id(self, contato_id: UUID) -> Contato | None:
        res = (
            self._sb.table("contatos")
            .select("*")
            .eq("id", str(contato_id))
            .maybe_single()
            .execute()
        )
        return _to_contato(res.data) if res.data else None

    async def search(self, term: str) -> list[ContatoResumido]:
        res = (
            self._sb.table("contatos")
            .select("id, nome, tipo_principal, empresa")
            .eq("ativo", True)
            .ilike("nome", f"%{term}%")
            .limit(20)
            .execute()
        )
        return [ContatoResumido(**row) for row in (res.data or [])]

    async def create(self, data: dict[str, Any]) -> Contato:
        res = self._sb.table("contatos").insert(data).execute()
        return _to_contato(res.data[0])

    async def update(self, contato_id: UUID, data: dict[str, Any]) -> Contato:
        res = (
            self._sb.table("contatos")
            .update(data)
            .eq("id", str(contato_id))
            .execute()
        )
        return _to_contato(res.data[0])

    async def soft_delete(self, contato_id: UUID) -> None:
        self._sb.table("contatos").update({"ativo": False}).eq("id", str(contato_id)).execute()

    async def get_relationships(self, contato_id: UUID) -> dict[str, Any]:
        cid = str(contato_id)
        pc = self._sb.table("processo_contatos").select("id, processo_id, papel, processos(id, titulo, tipo, status)").eq("contato_id", cid).execute()
        prop_galpoes = self._sb.table("galpoes").select("id, titulo, tipo, categoria, cidade, publicado, area_construida_m2").eq("proprietario_id", cid).order("created_at", desc=True).execute()
        prop_procs = self._sb.table("processos").select("id, titulo, tipo, status, valor").eq("proprietario_id", cid).order("created_at", desc=True).execute()
        cli_procs = self._sb.table("processos").select("id, titulo, tipo, status, valor").eq("cliente_id", cid).order("created_at", desc=True).execute()
        return {
            "processo_contatos": pc.data or [],
            "imoveis_proprietario": prop_galpoes.data or [],
            "processos_proprietario": prop_procs.data or [],
            "processos_cliente": cli_procs.data or [],
        }
