from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.registro import Registro, RegistroArquivo
from petrus.domain.repositories.registro_repo import RegistroRepository

_REG_FIELDS = {f.name for f in dc_fields(Registro)} - {"arquivos"}
_ARQ_FIELDS = {f.name for f in dc_fields(RegistroArquivo)}


def _to_registro(row: dict) -> Registro:
    known = {k: v for k, v in row.items() if k in _REG_FIELDS}
    arquivos_raw = row.get("registro_arquivos", [])
    arquivos = [_to_arquivo(a) for a in (arquivos_raw or [])]
    return Registro(**known, arquivos=arquivos)


def _to_arquivo(row: dict) -> RegistroArquivo:
    known = {k: v for k, v in row.items() if k in _ARQ_FIELDS}
    return RegistroArquivo(**known)


class SupabaseRegistroRepo(RegistroRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Registro]:
        res = (
            self._sb.table("registros")
            .select("*, registro_arquivos(*)")
            .order("created_at", desc=True)
            .execute()
        )
        return [_to_registro(row) for row in (res.data or [])]

    async def get_by_id(self, registro_id: UUID) -> Registro | None:
        res = (
            self._sb.table("registros")
            .select("*, registro_arquivos(*)")
            .eq("id", str(registro_id))
            .maybe_single()
            .execute()
        )
        if not res or not res.data:
            return None
        return _to_registro(res.data)

    async def create(self, data: dict[str, Any]) -> Registro:
        res = self._sb.table("registros").insert(data).execute()
        row = res.data[0]
        return Registro(**{k: v for k, v in row.items() if k in _REG_FIELDS})

    async def create_arquivo(self, data: dict[str, Any]) -> dict:
        res = self._sb.table("registro_arquivos").insert(data).execute()
        return res.data[0]

    async def update(self, registro_id: UUID, data: dict[str, Any]) -> None:
        self._sb.table("registros").update(data).eq("id", str(registro_id)).execute()

    async def delete(self, registro_id: UUID) -> None:
        self._sb.table("registros").delete().eq("id", str(registro_id)).execute()

    async def list_arquivos(self, registro_id: UUID) -> list[dict]:
        res = (
            self._sb.table("registro_arquivos")
            .select("*")
            .eq("registro_id", str(registro_id))
            .order("ordem")
            .execute()
        )
        return res.data or []
