"""Enrichment Service — generate, interact, finalize enrichment cards.

Designed for:
- Frequent recalculation (delete + batch insert)
- Stateless ranking (can be offloaded to cloud worker)
- Event sourcing for full lineage reconstruction
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.enrichment import EnrichmentCard, EnrichmentEvent
from petrus.domain.repositories.enrichment_repo import (
    EnrichmentCardRepository,
    EnrichmentEventRepository,
)
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, FonteRegistroRepository, ImovelFonteRepository,
)
from petrus.infrastructure.mdm.ranker import SimilarityRanker


class EnrichmentService:
    def __init__(
        self,
        card_repo: EnrichmentCardRepository,
        event_repo: EnrichmentEventRepository,
        imovel_repo: ImovelRepository,
        imovel_fonte_repo: ImovelFonteRepository,
        registro_repo: FonteRegistroRepository,
        fonte_repo: FonteRepository,
    ) -> None:
        self._card_repo = card_repo
        self._event_repo = event_repo
        self._imovel_repo = imovel_repo
        self._imovel_fonte_repo = imovel_fonte_repo
        self._reg_repo = registro_repo
        self._fonte_repo = fonte_repo
        self._ranker = SimilarityRanker(top_n=5)

    # ------------------------------------------------------------------
    # Generation (recalculable)
    # ------------------------------------------------------------------

    async def generate_cards(self, fonte_id: UUID) -> dict[str, Any]:
        """Generate enrichment cards for all clean registros of a fonte.

        Always recalculates: deletes existing pending/in-progress cards
        for this fonte, then generates fresh ones via batch insert.
        """
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError("Fonte nao encontrada")

        # Load inputs
        cleans = await self._reg_repo.get_by_fonte_and_stage(fonte_id, "clean")
        if not cleans:
            raise ValueError("Nenhum registro clean encontrado")

        golden = await self._imovel_repo.list_all()

        # Delete previous pending/in-progress cards (CASCADE deletes events)
        deleted = await self._card_repo.delete_by_fonte(fonte_id)

        # Rank all registros against golden (CPU-only, no I/O)
        registros = []
        reg_ids = []
        for reg in cleans:
            if reg.dados_normalizados:
                registros.append(reg.dados_normalizados)
                reg_ids.append(str(reg.id))

        rankings = self._ranker.rank_batch(registros, golden)

        # Build batch of cards
        batch: list[dict[str, Any]] = []
        for reg_data, reg_id, similares in zip(registros, reg_ids, rankings):
            card = {
                "fonte_id": str(fonte_id),
                "fonte_registro_id": reg_id,
                "registro_snapshot": reg_data,
                "similares": similares,
                "cidade": reg_data.get("cidade"),
                "bairro": reg_data.get("bairro"),
                "logradouro": reg_data.get("logradouro"),
                "area": reg_data.get("area_construida_m2") or reg_data.get("area_total_m2"),
                "score_max": similares[0]["score"] if similares else 0.0,
                "status": "pendente",
            }
            batch.append(card)

        # Batch insert
        inserted = await self._card_repo.create_batch(batch)

        await self._fonte_repo.update(fonte_id, {
            "processing_status": "enrichment_gerado",
        })

        return {
            "deleted_previous": deleted,
            "cards_gerados": inserted,
            "total_registros": len(registros),
            "com_similares": sum(1 for r in rankings if r),
            "sem_similares": sum(1 for r in rankings if not r),
        }

    # ------------------------------------------------------------------
    # Card state (read)
    # ------------------------------------------------------------------

    async def get_card_state(self, card_id: UUID) -> dict[str, Any]:
        """Get full card state with events applied (for workspace UI).

        Returns registro + similares with original and current values,
        plus the list of active changes per entity.
        """
        card = await self._card_repo.get_by_id(card_id)
        if not card:
            raise ValueError("Card nao encontrado")

        events = await self._event_repo.get_by_card(card_id)
        active_events = [e for e in events if not e.undone]

        # Compute current state of registro
        reg_original = dict(card.registro_snapshot)
        reg_id = str(card.fonte_registro_id)
        reg_current, reg_changes = _apply_events(
            reg_original, active_events, "registro", reg_id,
        )

        # Compute current state of each similar
        similares_state = []
        for sim in card.similares:
            sim_original = dict(sim.get("snapshot", {}))
            sim_id = sim["imovel_id"]
            sim_current, sim_changes = _apply_events(
                sim_original, active_events, "imovel", sim_id,
            )
            # Load images for this imovel
            images = await self._load_imovel_images(sim_id)
            similares_state.append({
                "imovel_id": sim_id,
                "score": sim["score"],
                "rank": sim["rank"],
                "original": sim_original,
                "atual": sim_current,
                "changes": sim_changes,
                "imagens": images,
            })

        return {
            "card": {
                "id": str(card.id),
                "fonte_id": str(card.fonte_id),
                "status": card.status,
                "score_max": card.score_max,
                "created_at": card.created_at,
            },
            "registro": {
                "id": reg_id,
                "original": reg_original,
                "atual": reg_current,
                "changes": reg_changes,
            },
            "similares": similares_state,
            "events": [_event_to_dict(e) for e in events],
            "stats": {
                "total_events": len(events),
                "active_events": len(active_events),
                "pending_changes": sum(
                    len(c) for c in [reg_changes] + [s["changes"] for s in similares_state]
                ),
            },
        }

    async def _load_imovel_images(self, imovel_id: str) -> list[dict]:
        """Load images for an imovel. Returns list of {storage_path, ordem}."""
        try:
            imovel = await self._imovel_repo.get_by_id(imovel_id)
            if imovel and imovel.imovel_imagens:
                return [
                    {"storage_path": img.storage_path, "ordem": img.ordem}
                    for img in sorted(imovel.imovel_imagens, key=lambda i: i.ordem)
                ]
        except Exception:
            pass
        return []

    # ------------------------------------------------------------------
    # Events (write)
    # ------------------------------------------------------------------

    async def create_event(
        self, card_id: UUID, data: dict[str, Any],
    ) -> EnrichmentEvent:
        """Record an enrichment event. Does NOT apply to real data."""
        card = await self._card_repo.get_by_id(card_id)
        if not card:
            raise ValueError("Card nao encontrado")
        if card.status == "concluido":
            raise ValueError("Card ja finalizado")
        if card.status == "descartado":
            raise ValueError("Card descartado")

        # Set card to em_andamento on first event
        if card.status == "pendente":
            await self._card_repo.update_status(card_id, "em_andamento")

        event_data = {
            "card_id": str(card_id),
            "tipo": data["tipo"],
            "campo": data["campo"],
            "valor_anterior": data.get("valor_anterior"),
            "valor_novo": data["valor_novo"],
            "origem_tipo": data.get("origem_tipo", "manual"),
            "origem_id": data.get("origem_id"),
            "destino_tipo": data["destino_tipo"],
            "destino_id": data["destino_id"],
        }
        return await self._event_repo.create(event_data)

    async def undo_event(self, card_id: UUID, event_id: UUID) -> None:
        """Mark an event as undone."""
        await self._event_repo.mark_undone(event_id)

    # ------------------------------------------------------------------
    # Finalize / Discard
    # ------------------------------------------------------------------

    async def finalize(
        self, card_id: UUID, criar_imovel: bool = True,
    ) -> dict[str, Any]:
        """Apply all pending events to real data.

        1. Compute final state of registro and similares
        2. If criar_imovel: INSERT new galpao
        3. For each similar with changes: UPDATE galpao
        4. Create lineage in imovel_fontes
        5. Mark card as concluido
        """
        card = await self._card_repo.get_by_id(card_id)
        if not card:
            raise ValueError("Card nao encontrado")

        events = await self._event_repo.get_by_card(card_id)
        active_events = [e for e in events if not e.undone]

        result: dict[str, Any] = {
            "imovel_criado": None,
            "imoveis_atualizados": [],
            "lineage_records": 0,
        }

        reg_id = str(card.fonte_registro_id)

        # 1. Create new imovel from registro if requested
        if criar_imovel:
            reg_original = dict(card.registro_snapshot)
            reg_final, _ = _apply_events(
                reg_original, active_events, "registro", reg_id,
            )
            imovel_data = _to_imovel_dict(reg_final)
            imovel_data["origem"] = "enrichment"
            imovel = await self._imovel_repo.create(imovel_data)
            result["imovel_criado"] = str(imovel.id)

            # Lineage
            await self._imovel_fonte_repo.create({
                "imovel_id": str(imovel.id),
                "fonte_registro_id": reg_id,
                "campos_usados": list(reg_final.keys()),
                "tipo_match": "enrichment_criar",
            })
            result["lineage_records"] += 1

        # 2. Apply changes to existing imoveis
        for sim in card.similares:
            sim_id = sim["imovel_id"]
            sim_original = dict(sim.get("snapshot", {}))
            _, sim_changes = _apply_events(
                sim_original, active_events, "imovel", sim_id,
            )
            if not sim_changes:
                continue

            # Build update dict (only changed fields)
            update_data = {campo: info["to"] for campo, info in sim_changes.items()}
            # Filter to imovel-safe fields
            safe_update = _filter_imovel_fields(update_data)
            if safe_update:
                await self._imovel_repo.update(sim_id, safe_update)
                result["imoveis_atualizados"].append(sim_id)

                # Lineage
                await self._imovel_fonte_repo.create({
                    "imovel_id": sim_id,
                    "fonte_registro_id": reg_id,
                    "campos_usados": list(safe_update.keys()),
                    "tipo_match": "enrichment_atualizar",
                })
                result["lineage_records"] += 1

        # 3. Mark card as done
        await self._card_repo.update_status(card_id, "concluido")

        return result

    async def discard(self, card_id: UUID) -> None:
        """Discard a card. Events remain for audit."""
        await self._card_repo.update_status(card_id, "descartado")

    # ------------------------------------------------------------------
    # List / Count
    # ------------------------------------------------------------------

    async def list_cards(
        self, status: str = "pendente", filters: dict | None = None,
        limit: int = 50, offset: int = 0,
    ) -> list[EnrichmentCard]:
        return await self._card_repo.list_by_status(status, filters, limit, offset)

    async def count_cards(self) -> dict[str, int]:
        return await self._card_repo.count_by_status()


# ======================================================================
# Pure helpers (no I/O — can run anywhere)
# ======================================================================

def _apply_events(
    original: dict, events: list[EnrichmentEvent],
    destino_tipo: str, destino_id: str,
) -> tuple[dict, dict]:
    """Apply events to an original snapshot, return (current_state, changes).

    changes = {campo: {from, to, source, event_id}}
    """
    current = dict(original)
    changes: dict[str, dict] = {}

    for event in events:
        if event.destino_tipo != destino_tipo or event.destino_id != destino_id:
            continue
        campo = event.campo
        old_val = current.get(campo)
        current[campo] = event.valor_novo
        changes[campo] = {
            "from": old_val,
            "to": event.valor_novo,
            "source": f"{event.origem_tipo}:{event.origem_id}" if event.origem_id else "manual",
            "event_id": str(event.id),
        }

    return current, changes


def _event_to_dict(event: EnrichmentEvent) -> dict:
    return {
        "id": str(event.id),
        "card_id": str(event.card_id),
        "tipo": event.tipo,
        "campo": event.campo,
        "valor_anterior": event.valor_anterior,
        "valor_novo": event.valor_novo,
        "origem_tipo": event.origem_tipo,
        "origem_id": event.origem_id,
        "destino_tipo": event.destino_tipo,
        "destino_id": event.destino_id,
        "undone": event.undone,
        "created_at": event.created_at,
    }


# Fields that map directly to the galpoes table
_IMOVEL_DIRECT_FIELDS = {
    "titulo", "tipo", "categoria", "cidade", "bairro", "endereco",
    "logradouro", "numero", "complemento", "uf", "cep",
    "latitude", "longitude",
    "area_total_m2", "area_construida_m2", "area_piso_m2",
    "area_escritorio_m2", "pe_direito_m",
    "numero_docas", "vagas_estacionamento", "potencia_eletrica_kva",
    "valor_condominio", "observacoes", "status", "descricao",
    "dados_extras",
}

# Fields that go into dados_extras JSONB
_IMOVEL_EXTRAS_FIELDS = {
    "unidade", "area_mezanino_m2", "elevador", "gerador",
    "ponte_rolante", "zoneamento", "tipo_operacao",
    "valor_locacao", "valor_venda", "iptu_valor", "inquilino",
}


def _to_imovel_dict(data: dict) -> dict:
    """Convert enriched registro data to galpoes-compatible dict."""
    result: dict = {}
    extras: dict = {}

    for k, v in data.items():
        if v is None:
            continue
        if k in _IMOVEL_DIRECT_FIELDS:
            result[k] = v
        elif k in _IMOVEL_EXTRAS_FIELDS:
            extras[k] = v
        # Skip contact fields (proprietario_*) — handled separately

    if extras:
        result["dados_extras"] = {**result.get("dados_extras", {}), **extras}

    # Defaults
    result.setdefault("tipo", "galpao")
    result.setdefault("categoria", "Galpão")
    result.setdefault("publicado", False)

    return result


def _filter_imovel_fields(data: dict) -> dict:
    """Filter update dict to only contain galpoes-safe fields."""
    return {k: v for k, v in data.items() if k in _IMOVEL_DIRECT_FIELDS}
