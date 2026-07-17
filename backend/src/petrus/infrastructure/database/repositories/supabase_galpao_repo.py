from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.contato import ContatoResumido
from petrus.domain.entities.galpao import Galpao, GalpaoImagem, GalpaoResumido
from petrus.domain.repositories.galpao_repo import GalpaoRepository

GALPAO_SELECT = """id, titulo, tipo, categoria, uso_terreno, valor, cidade, bairro, endereco,
logradouro, numero, complemento, uf, cep, geojson, publicado,
area_construida_m2, area_total_m2, area_piso_m2, pe_direito_m, numero_docas,
acesso_carreta, sprinklers, sprinkler_tipo, guarita, potencia_eletrica_kva,
capacidade_piso_ton_m2, area_escritorio_m2, truck_court_m,
avcb_numero, avcb_validade, acessos_viarios, video_url, planta_baixa_url,
vagas_estacionamento, condominio, valor_condominio, descricao, observacoes,
campos_visibilidade, latitude, longitude, proprietario_id, created_at,
proprietario:contatos!galpoes_proprietario_id_fkey(id, nome, empresa, tipo_principal),
galpao_imagens(id, storage_path, ordem, visivel_site, is_capa)"""

_GALPAO_FIELDS = {f.name for f in dc_fields(Galpao)}


def _to_galpao(row: dict) -> Galpao:
    row = dict(row)
    imagens_data = row.pop("galpao_imagens", []) or []
    prop_data = row.pop("proprietario", None)

    imagens = [GalpaoImagem(**img) for img in imagens_data]
    proprietario = ContatoResumido(**prop_data) if prop_data else None

    known = {k: v for k, v in row.items() if k in _GALPAO_FIELDS}
    return Galpao(**known, galpao_imagens=imagens, proprietario=proprietario)


def _to_galpao_from_insert(row: dict) -> Galpao:
    known = {k: v for k, v in row.items() if k in _GALPAO_FIELDS}
    return Galpao(**known)


class SupabaseGalpaoRepo(GalpaoRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Galpao]:
        res = self._sb.table("galpoes").select(GALPAO_SELECT).order("created_at", desc=True).execute()
        return [_to_galpao(row) for row in (res.data or [])]

    async def list_published(self) -> list[Galpao]:
        res = (
            self._sb.table("galpoes")
            .select(GALPAO_SELECT)
            .eq("publicado", True)
            .order("created_at", desc=True)
            .execute()
        )
        return [_to_galpao(row) for row in (res.data or [])]

    async def get_by_id(self, galpao_id: UUID) -> Galpao | None:
        res = (
            self._sb.table("galpoes")
            .select(GALPAO_SELECT)
            .eq("id", str(galpao_id))
            .maybe_single()
            .execute()
        )
        return _to_galpao(res.data) if res.data else None

    async def create(self, data: dict[str, Any]) -> Galpao:
        res = self._sb.table("galpoes").insert(data).execute()
        return _to_galpao_from_insert(res.data[0])

    async def update(self, galpao_id: UUID, data: dict[str, Any]) -> Galpao:
        res = (
            self._sb.table("galpoes")
            .update(data)
            .eq("id", str(galpao_id))
            .execute()
        )
        return _to_galpao_from_insert(res.data[0])

    async def delete(self, galpao_id: UUID) -> None:
        self._sb.table("galpoes").delete().eq("id", str(galpao_id)).execute()

    async def toggle_published(self, galpao_id: UUID, current: bool) -> None:
        self._sb.table("galpoes").update({"publicado": not current}).eq(
            "id", str(galpao_id)
        ).execute()

    async def update_coords(self, galpao_id: UUID, lat: float, lng: float) -> None:
        self._sb.table("galpoes").update({"latitude": lat, "longitude": lng}).eq(
            "id", str(galpao_id)
        ).execute()

    async def create_image(
        self, galpao_id: UUID, storage_path: str, ordem: int
    ) -> GalpaoImagem:
        res = (
            self._sb.table("galpao_imagens")
            .insert(
                {
                    "galpao_id": str(galpao_id),
                    "storage_path": storage_path,
                    "ordem": ordem,
                    "visivel_site": True,
                    "is_capa": False,
                }
            )
            .execute()
        )
        return GalpaoImagem(**{k: v for k, v in res.data[0].items() if k in {f.name for f in dc_fields(GalpaoImagem)}})

    async def delete_image_record(self, image_id: UUID) -> None:
        self._sb.table("galpao_imagens").delete().eq("id", str(image_id)).execute()

    async def reorder_images(self, images: list[dict[str, Any]]) -> None:
        for img in images:
            self._sb.table("galpao_imagens").update(
                {"ordem": img["ordem"], "is_capa": img.get("is_capa", False), "visivel_site": img.get("visivel_site", True)}
            ).eq("id", img["id"]).execute()

    async def search(self, query: str, limit: int = 8) -> list[GalpaoResumido]:
        res = (
            self._sb.table("galpoes")
            .select("id, titulo, tipo, area_total_m2")
            .ilike("titulo", f"%{query}%")
            .limit(limit)
            .execute()
        )
        return [GalpaoResumido(**row) for row in (res.data or [])]
