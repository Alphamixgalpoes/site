from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID


@dataclass
class EnrichmentCard:
    id: UUID
    fonte_id: UUID
    fonte_registro_id: UUID
    registro_snapshot: dict
    similares: list[dict] = field(default_factory=list)
    status: str = "pendente"
    cidade: str | None = None
    bairro: str | None = None
    logradouro: str | None = None
    area: float | None = None
    score_max: float | None = None
    finalizado_em: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class EnrichmentEvent:
    id: UUID
    card_id: UUID
    tipo: str  # 'transferir' | 'editar'
    campo: str
    valor_novo: Any
    valor_anterior: Any | None = None
    origem_tipo: str = "manual"  # 'registro' | 'imovel' | 'manual'
    origem_id: str | None = None
    destino_tipo: str = "registro"  # 'registro' | 'imovel'
    destino_id: str = ""
    undone: bool = False
    created_at: str | None = None
