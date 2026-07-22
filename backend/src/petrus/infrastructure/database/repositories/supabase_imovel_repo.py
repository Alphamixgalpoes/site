from __future__ import annotations

from dataclasses import fields as dc_fields
from typing import Any
from uuid import UUID

from supabase import Client

from petrus.domain.entities.contato import ContatoResumido
from petrus.domain.entities.imovel import Imovel, ImovelImagem, ImovelResumido
from petrus.domain.repositories.imovel_repo import ImovelRepository

IMOVEL_SELECT = """id, titulo, tipo, categoria, uso_terreno, valor, cidade, bairro, endereco,
logradouro, numero, complemento, uf, cep, geojson, publicado,
area_construida_m2, area_total_m2, area_piso_m2, pe_direito_m, numero_docas,
acesso_carreta, sprinklers, sprinkler_tipo, guarita, potencia_eletrica_kva,
capacidade_piso_ton_m2, area_escritorio_m2, truck_court_m,
avcb_numero, avcb_validade, acessos_viarios, video_url, planta_baixa_url,
vagas_estacionamento, condominio, valor_condominio, descricao, observacoes,
campos_visibilidade, latitude, longitude, proprietario_id, created_at, updated_at,
dados_extras, status, qualidade_campos, qualidade_score,
notas, visitado, ultima_revisao, motivo_arquivo, origem, enriquecido_em,
proprietario:contatos!imoveis_proprietario_id_fkey(id, nome, empresa, tipo_principal),
imovel_imagens(id, storage_path, ordem, visivel_site, is_capa)"""

_IMOVEL_FIELDS = {f.name for f in dc_fields(Imovel)}


def _to_imovel(row: dict) -> Imovel:
    row = dict(row)
    imagens_data = row.pop("imovel_imagens", []) or []
    prop_data = row.pop("proprietario", None)

    imagens = [ImovelImagem(**img) for img in imagens_data]
    proprietario = ContatoResumido(**prop_data) if prop_data else None

    known = {k: v for k, v in row.items() if k in _IMOVEL_FIELDS}
    return Imovel(**known, imovel_imagens=imagens, proprietario=proprietario)


def _to_imovel_from_insert(row: dict) -> Imovel:
    known = {k: v for k, v in row.items() if k in _IMOVEL_FIELDS}
    return Imovel(**known)


class SupabaseImovelRepo(ImovelRepository):
    def __init__(self, client: Client) -> None:
        self._sb = client

    async def list_all(self) -> list[Imovel]:
        res = self._sb.table("imoveis").select(IMOVEL_SELECT).order("created_at", desc=True).execute()
        return [_to_imovel(row) for row in (res.data or [])]

    async def list_published(self) -> list[Imovel]:
        res = (
            self._sb.table("imovel_publicacao")
            .select(f"imovel_id, imoveis({IMOVEL_SELECT})")
            .eq("ativo", True)
            .order("published_at", desc=True)
            .execute()
        )
        return [
            _to_imovel(row["imoveis"])
            for row in (res.data or [])
            if row.get("imoveis")
        ]

    async def get_published_by_id(self, imovel_id: UUID) -> Imovel | None:
        res = (
            self._sb.table("imovel_publicacao")
            .select(f"imovel_id, imoveis({IMOVEL_SELECT})")
            .eq("imovel_id", str(imovel_id))
            .eq("ativo", True)
            .maybe_single()
            .execute()
        )
        if res.data and res.data.get("imoveis"):
            return _to_imovel(res.data["imoveis"])
        return None

    async def get_by_id(self, imovel_id: UUID) -> Imovel | None:
        res = (
            self._sb.table("imoveis")
            .select(IMOVEL_SELECT)
            .eq("id", str(imovel_id))
            .maybe_single()
            .execute()
        )
        return _to_imovel(res.data) if res.data else None

    async def create(self, data: dict[str, Any]) -> Imovel:
        res = self._sb.table("imoveis").insert(data).execute()
        return _to_imovel_from_insert(res.data[0])

    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> Imovel:
        res = (
            self._sb.table("imoveis")
            .update(data)
            .eq("id", str(imovel_id))
            .execute()
        )
        return _to_imovel_from_insert(res.data[0])

    async def delete(self, imovel_id: UUID) -> None:
        self._sb.table("imoveis").delete().eq("id", str(imovel_id)).execute()

    async def toggle_published(self, imovel_id: UUID, current: bool) -> None:
        self._sb.table("imoveis").update({"publicado": not current}).eq(
            "id", str(imovel_id)
        ).execute()

    async def update_coords(self, imovel_id: UUID, lat: float, lng: float) -> None:
        self._sb.table("imoveis").update({"latitude": lat, "longitude": lng}).eq(
            "id", str(imovel_id)
        ).execute()

    async def create_image(
        self, imovel_id: UUID, storage_path: str, ordem: int
    ) -> ImovelImagem:
        res = (
            self._sb.table("imovel_imagens")
            .insert(
                {
                    "imovel_id": str(imovel_id),
                    "storage_path": storage_path,
                    "ordem": ordem,
                    "visivel_site": True,
                    "is_capa": False,
                }
            )
            .execute()
        )
        return ImovelImagem(**{k: v for k, v in res.data[0].items() if k in {f.name for f in dc_fields(ImovelImagem)}})

    async def delete_image_record(self, image_id: UUID) -> None:
        self._sb.table("imovel_imagens").delete().eq("id", str(image_id)).execute()

    async def reorder_images(self, images: list[dict[str, Any]]) -> None:
        for img in images:
            self._sb.table("imovel_imagens").update(
                {"ordem": img["ordem"], "is_capa": img.get("is_capa", False), "visivel_site": img.get("visivel_site", True)}
            ).eq("id", img["id"]).execute()

    async def search(self, query: str, limit: int = 8) -> list[ImovelResumido]:
        res = (
            self._sb.table("imoveis")
            .select("id, titulo, tipo, area_total_m2")
            .ilike("titulo", f"%{query}%")
            .limit(limit)
            .execute()
        )
        return [ImovelResumido(**row) for row in (res.data or [])]
