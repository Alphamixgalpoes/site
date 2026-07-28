from __future__ import annotations

import dataclasses
from typing import Any
from uuid import UUID, uuid4

from petrus.domain.entities.config_campo import ConfigCampo
from petrus.domain.entities.contato import Contato, ContatoResumido
from petrus.domain.entities.enrichment import EnrichmentCard, EnrichmentEvent
from petrus.domain.entities.imovel import Imovel, ImovelImagem, ImovelResumido
from petrus.domain.entities.lead import Lead
from petrus.domain.entities.mdm import Fonte, FonteRegistro, ImovelFonte, ScrapingRun
from petrus.domain.entities.processo import (
    Processo,
    ProcessoCategoria,
    ProcessoContato,
    ProcessoItem,
    ProcessoTipo,
    ProcessoTipoCategoria,
    ProcessoTipoItem,
)
from petrus.domain.entities.publicacao import ImovelPublicacao
from petrus.domain.repositories.config_repo import ConfigRepository
from petrus.domain.repositories.contato_repo import ContatoRepository
from petrus.domain.repositories.enrichment_repo import (
    EnrichmentCardRepository,
    EnrichmentEventRepository,
)
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.repositories.lead_repo import LeadRepository
from petrus.domain.repositories.mdm_repo import (
    FonteRegistroRepository,
    FonteRepository,
    ImovelFonteRepository,
    ScrapingRunRepository,
)
from petrus.domain.repositories.processo_repo import ProcessoRepository
from petrus.domain.repositories.publicacao_repo import PublicacaoRepository


def _safe_build(cls, **kwargs):
    """Build a dataclass instance, dropping unknown keys."""
    valid = {f.name for f in dataclasses.fields(cls)}
    return cls(**{k: v for k, v in kwargs.items() if k in valid})


class InMemoryLeadRepo(LeadRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Lead] = {}

    async def list_all(self) -> list[Lead]:
        return list(self._store.values())

    async def create(self, data: dict[str, Any]) -> Lead:
        lead = _safe_build(Lead, id=uuid4(), **data)
        self._store[lead.id] = lead
        return lead

    async def toggle_contactado(self, lead_id: UUID, current: bool) -> None:
        if lead_id in self._store:
            self._store[lead_id].contactado = not current


class InMemoryImovelRepo(ImovelRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Imovel] = {}
        self._images: dict[UUID, ImovelImagem] = {}

    async def list_all(self) -> list[Imovel]:
        return list(self._store.values())

    async def list_published(self) -> list[Imovel]:
        return [i for i in self._store.values() if i.publicado]

    async def get_by_id(self, imovel_id: UUID) -> Imovel | None:
        return self._store.get(imovel_id)

    async def create(self, data: dict[str, Any]) -> Imovel:
        iid = uuid4()
        merged = {"publicado": False, **data, "id": iid}
        imovel = _safe_build(Imovel, **merged)
        self._store[iid] = imovel
        return imovel

    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> Imovel:
        im = self._store[imovel_id]
        for k, v in data.items():
            if hasattr(im, k):
                setattr(im, k, v)
        return im

    async def delete(self, imovel_id: UUID) -> None:
        self._store.pop(imovel_id, None)

    async def get_published_by_id(self, imovel_id: UUID) -> Imovel | None:
        im = self._store.get(imovel_id)
        return im if im and im.publicado else None

    async def toggle_published(self, imovel_id: UUID, current: bool) -> None:
        if imovel_id in self._store:
            self._store[imovel_id].publicado = not current

    async def update_coords(self, imovel_id: UUID, lat: float, lng: float) -> None:
        if imovel_id in self._store:
            self._store[imovel_id].latitude = lat
            self._store[imovel_id].longitude = lng

    async def create_image(self, imovel_id: UUID, storage_path: str, ordem: int) -> ImovelImagem:
        img = ImovelImagem(
            id=uuid4(),
            storage_path=storage_path,
            ordem=ordem,
            visivel_site=True,
            is_capa=False,
            imovel_id=imovel_id,
        )
        self._images[img.id] = img
        return img

    async def delete_image_record(self, image_id: UUID) -> None:
        self._images.pop(image_id, None)

    async def reorder_images(self, images: list[dict[str, Any]]) -> None:
        for item in images:
            iid = UUID(item["id"]) if isinstance(item["id"], str) else item["id"]
            if iid in self._images:
                self._images[iid].ordem = item["ordem"]

    async def search(self, query: str, limit: int = 8) -> list[ImovelResumido]:
        q = query.lower()
        results = []
        for im in self._store.values():
            if q in im.titulo.lower():
                results.append(
                    ImovelResumido(
                        id=im.id, titulo=im.titulo, tipo=im.tipo, area_total_m2=im.area_total_m2
                    )
                )
        return results[:limit]


class InMemoryContatoRepo(ContatoRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Contato] = {}

    async def list_active(self) -> list[Contato]:
        return [c for c in self._store.values() if c.ativo]

    async def get_by_id(self, contato_id: UUID) -> Contato | None:
        return self._store.get(contato_id)

    async def search(self, term: str) -> list[ContatoResumido]:
        t = term.lower()
        return [
            ContatoResumido(
                id=c.id,
                nome=c.nome,
                empresa=c.empresa,
                tipo_principal=c.tipo_principal,
            )
            for c in self._store.values()
            if t in c.nome.lower() and c.ativo
        ]

    async def create(self, data: dict[str, Any]) -> Contato:
        c = _safe_build(Contato, id=uuid4(), **data)
        self._store[c.id] = c
        return c

    async def update(self, contato_id: UUID, data: dict[str, Any]) -> Contato:
        c = self._store[contato_id]
        for k, v in data.items():
            if hasattr(c, k):
                setattr(c, k, v)
        return c

    async def soft_delete(self, contato_id: UUID) -> None:
        if contato_id in self._store:
            self._store[contato_id].ativo = False

    async def get_relationships(self, contato_id: UUID) -> dict[str, Any]:
        return {"processos": [], "imoveis": []}


class InMemoryProcessoRepo(ProcessoRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Processo] = {}
        self._items: dict[UUID, ProcessoItem] = {}
        self._categories: dict[UUID, ProcessoCategoria] = {}
        self._contacts: dict[UUID, ProcessoContato] = {}
        self._types: dict[str, ProcessoTipo] = {}

    async def list_all(self) -> list[Processo]:
        return list(self._store.values())

    async def get_by_id(self, processo_id: UUID) -> Processo | None:
        return self._store.get(processo_id)

    async def create(self, data: dict[str, Any]) -> Processo:
        p = _safe_build(Processo, id=uuid4(), **data)
        self._store[p.id] = p
        return p

    async def update(self, processo_id: UUID, data: dict[str, Any]) -> Processo:
        p = self._store[processo_id]
        for k, v in data.items():
            if hasattr(p, k):
                setattr(p, k, v)
        return p

    async def delete(self, processo_id: UUID) -> None:
        self._store.pop(processo_id, None)

    async def list_items(self, processo_id: UUID) -> list[ProcessoItem]:
        return [i for i in self._items.values() if i.processo_id == processo_id]

    async def create_item(self, data: dict[str, Any]) -> ProcessoItem:
        item = _safe_build(ProcessoItem, id=uuid4(), **data)
        self._items[item.id] = item
        return item

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoItem:
        item = self._items[item_id]
        for k, v in data.items():
            if hasattr(item, k):
                setattr(item, k, v)
        return item

    async def delete_item(self, item_id: UUID) -> None:
        self._items.pop(item_id, None)

    async def reorder_items(self, items: list[dict[str, Any]]) -> None:
        for d in items:
            iid = UUID(d["id"]) if isinstance(d["id"], str) else d["id"]
            if iid in self._items:
                self._items[iid].ordem = d["ordem"]

    async def list_categories(self, processo_id: UUID) -> list[ProcessoCategoria]:
        return [c for c in self._categories.values() if c.processo_id == processo_id]

    async def create_categories(self, categories: list[dict[str, Any]]) -> None:
        for d in categories:
            cat = ProcessoCategoria(id=uuid4(), **d)
            self._categories[cat.id] = cat

    async def reorder_categories(self, categories: list[dict[str, Any]]) -> None:
        for d in categories:
            cid = UUID(d["id"]) if isinstance(d["id"], str) else d["id"]
            if cid in self._categories:
                self._categories[cid].ordem = d["ordem"]

    async def list_contacts(self, processo_id: UUID) -> list[ProcessoContato]:
        return [c for c in self._contacts.values() if c.processo_id == processo_id]

    async def link_contact(
        self,
        processo_id: UUID,
        contato_id: UUID,
        papel: str,
    ) -> ProcessoContato:
        pc = ProcessoContato(
            id=uuid4(),
            contato_id=contato_id,
            papel=papel,
            processo_id=processo_id,
        )
        self._contacts[pc.id] = pc
        return pc

    async def unlink_contact(self, link_id: UUID) -> None:
        self._contacts.pop(link_id, None)

    async def link_imovel(self, processo_id: UUID, imovel_id: UUID) -> None:
        if processo_id in self._store:
            self._store[processo_id].imovel_id = imovel_id

    async def unlink_imovel(self, processo_id: UUID) -> None:
        if processo_id in self._store:
            self._store[processo_id].imovel_id = None

    async def get_type_template(self, tipo_slug: str) -> ProcessoTipo | None:
        return self._types.get(tipo_slug)


class InMemoryConfigRepo(ConfigRepository):
    def __init__(self) -> None:
        self._campos: dict[UUID, ConfigCampo] = {}
        self._tipos: dict[UUID, ProcessoTipo] = {}
        self._categorias: dict[UUID, ProcessoTipoCategoria] = {}
        self._itens: dict[UUID, ProcessoTipoItem] = {}

    async def list_campos(self) -> list[ConfigCampo]:
        return list(self._campos.values())

    async def upsert_campos(self, campos: list[dict[str, Any]]) -> None:
        for d in campos:
            c = _safe_build(ConfigCampo, **d)
            self._campos[c.campo_chave] = c

    async def list_tipos(self) -> list[ProcessoTipo]:
        return list(self._tipos.values())

    async def list_tipos_full(self) -> list[ProcessoTipo]:
        return list(self._tipos.values())

    async def get_tipo_with_template(self, tipo_id: UUID) -> ProcessoTipo | None:
        return self._tipos.get(tipo_id)

    async def create_tipo(self, data: dict[str, Any]) -> ProcessoTipo:
        t = ProcessoTipo(id=uuid4(), **data)
        self._tipos[t.id] = t
        return t

    async def update_tipo(self, tipo_id: UUID, data: dict[str, Any]) -> ProcessoTipo:
        t = self._tipos[tipo_id]
        for k, v in data.items():
            if hasattr(t, k):
                setattr(t, k, v)
        return t

    async def delete_tipo(self, tipo_id: UUID) -> None:
        self._tipos.pop(tipo_id, None)

    async def create_categoria(self, data: dict[str, Any]) -> ProcessoTipoCategoria:
        c = ProcessoTipoCategoria(id=uuid4(), **data)
        self._categorias[c.id] = c
        return c

    async def update_categoria(self, cat_id: UUID, data: dict[str, Any]) -> ProcessoTipoCategoria:
        c = self._categorias[cat_id]
        for k, v in data.items():
            if hasattr(c, k):
                setattr(c, k, v)
        return c

    async def delete_categoria(self, cat_id: UUID) -> None:
        self._categorias.pop(cat_id, None)

    async def create_item(self, data: dict[str, Any]) -> ProcessoTipoItem:
        item = ProcessoTipoItem(id=uuid4(), **data)
        self._itens[item.id] = item
        return item

    async def update_item(self, item_id: UUID, data: dict[str, Any]) -> ProcessoTipoItem:
        item = self._itens[item_id]
        for k, v in data.items():
            if hasattr(item, k):
                setattr(item, k, v)
        return item

    async def delete_item(self, item_id: UUID) -> None:
        self._itens.pop(item_id, None)


class InMemoryPublicacaoRepo(PublicacaoRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, ImovelPublicacao] = {}

    async def create(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao:
        pub = _safe_build(ImovelPublicacao, imovel_id=imovel_id, **data)
        self._store[imovel_id] = pub
        return pub

    async def get_by_imovel(self, imovel_id: UUID) -> ImovelPublicacao | None:
        return self._store.get(imovel_id)

    async def update(self, imovel_id: UUID, data: dict[str, Any]) -> ImovelPublicacao:
        pub = self._store[imovel_id]
        for k, v in data.items():
            if hasattr(pub, k):
                setattr(pub, k, v)
        return pub

    async def delete(self, imovel_id: UUID) -> None:
        self._store.pop(imovel_id, None)

    async def list_ativos(self) -> list[ImovelPublicacao]:
        return [p for p in self._store.values() if p.ativo]

    async def get_by_slug(self, slug: str) -> ImovelPublicacao | None:
        for p in self._store.values():
            if p.slug == slug:
                return p
        return None


class InMemoryFonteRepo(FonteRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Fonte] = {}

    async def list_all(self) -> list[Fonte]:
        return list(self._store.values())

    async def get_by_id(self, fonte_id: UUID) -> Fonte | None:
        return self._store.get(fonte_id)

    async def create(self, data: dict[str, Any]) -> Fonte:
        f = _safe_build(Fonte, id=uuid4(), **data)
        self._store[f.id] = f
        return f

    async def update(self, fonte_id: UUID, data: dict[str, Any]) -> Fonte:
        f = self._store[fonte_id]
        for k, v in data.items():
            if hasattr(f, k):
                setattr(f, k, v)
        return f

    async def delete(self, fonte_id: UUID) -> None:
        self._store.pop(fonte_id, None)


class InMemoryFonteRegistroRepo(FonteRegistroRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, FonteRegistro] = {}

    async def create_batch(self, registros: list[dict[str, Any]]) -> int:
        for d in registros:
            rid = uuid4()
            r = _safe_build(FonteRegistro, id=rid, **d)
            self._store[rid] = r
        return len(registros)

    async def get_by_importacao(self, importacao_id: UUID) -> list[FonteRegistro]:
        return [r for r in self._store.values() if r.importacao_id == importacao_id]

    async def get_by_fonte(self, fonte_id: UUID) -> list[FonteRegistro]:
        return [r for r in self._store.values() if r.fonte_id == fonte_id]

    async def get_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> list[FonteRegistro]:
        return [r for r in self._store.values() if r.fonte_id == fonte_id and r.stage == stage]

    async def delete_by_fonte_and_stage(self, fonte_id: UUID, stage: str) -> int:
        to_del = [
            rid for rid, r in self._store.items() if r.fonte_id == fonte_id and r.stage == stage
        ]
        for rid in to_del:
            del self._store[rid]
        return len(to_del)

    async def get_by_hash(self, hash_dedup: str) -> FonteRegistro | None:
        for r in self._store.values():
            if r.hash_dedup == hash_dedup:
                return r
        return None


class InMemoryImovelFonteRepo(ImovelFonteRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, ImovelFonte] = {}

    async def create(self, data: dict[str, Any]) -> ImovelFonte:
        ifonte = _safe_build(ImovelFonte, id=uuid4(), **data)
        self._store[ifonte.id] = ifonte
        return ifonte

    async def get_by_imovel(self, imovel_id: UUID) -> list[ImovelFonte]:
        sid = str(imovel_id)
        return [i for i in self._store.values() if str(i.imovel_id) == sid]


class InMemoryScrapingRunRepo(ScrapingRunRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, ScrapingRun] = {}

    async def create(self, data: dict[str, Any]) -> ScrapingRun:
        sr = _safe_build(ScrapingRun, id=uuid4(), **data)
        self._store[sr.id] = sr
        return sr

    async def update(self, run_id: UUID, data: dict[str, Any]) -> ScrapingRun:
        sr = self._store[run_id]
        for k, v in data.items():
            if hasattr(sr, k):
                setattr(sr, k, v)
        return sr

    async def get_by_fonte(self, fonte_id: UUID) -> list[ScrapingRun]:
        return [sr for sr in self._store.values() if sr.fonte_id == fonte_id]

    async def list_pending(self) -> list[ScrapingRun]:
        return [sr for sr in self._store.values() if sr.status == "pendente"]


class InMemoryEnrichmentCardRepo(EnrichmentCardRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, EnrichmentCard] = {}

    async def create_batch(self, cards: list[dict[str, Any]]) -> int:
        for d in cards:
            cid = uuid4()
            card = _safe_build(EnrichmentCard, id=cid, **d)
            self._store[cid] = card
        return len(cards)

    async def delete_by_fonte(self, fonte_id: UUID) -> int:
        to_del = [
            cid for cid, c in self._store.items()
            if c.fonte_id == fonte_id and c.status in ("pendente", "em_andamento")
        ]
        for cid in to_del:
            del self._store[cid]
        return len(to_del)

    async def get_by_id(self, card_id: UUID) -> EnrichmentCard | None:
        return self._store.get(card_id)

    async def list_by_status(
        self, status: str = "pendente", filters: dict | None = None,
        limit: int = 50, offset: int = 0,
    ) -> list[EnrichmentCard]:
        results = [c for c in self._store.values() if c.status == status]
        return results[offset:offset + limit]

    async def count_by_status(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for c in self._store.values():
            counts[c.status] = counts.get(c.status, 0) + 1
        return counts

    async def update_status(self, card_id: UUID, status: str) -> EnrichmentCard:
        card = self._store[card_id]
        card.status = status
        return card


class InMemoryEnrichmentEventRepo(EnrichmentEventRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, EnrichmentEvent] = {}

    async def create(self, data: dict[str, Any]) -> EnrichmentEvent:
        eid = uuid4()
        event = _safe_build(EnrichmentEvent, id=eid, **data)
        self._store[eid] = event
        return event

    async def get_by_card(self, card_id: UUID) -> list[EnrichmentEvent]:
        return [e for e in self._store.values() if e.card_id == card_id]

    async def mark_undone(self, event_id: UUID) -> None:
        if event_id in self._store:
            self._store[event_id].undone = True

    async def delete_by_card(self, card_id: UUID) -> int:
        to_del = [eid for eid, e in self._store.items() if e.card_id == card_id]
        for eid in to_del:
            del self._store[eid]
        return len(to_del)
