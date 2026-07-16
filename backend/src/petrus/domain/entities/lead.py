from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass
class Lead:
    id: UUID
    nome: str
    telefone: str
    contactado: bool = False

    empresa: str | None = None
    galpao_id: UUID | None = None
    galpao_titulo: str | None = None
    created_at: str | None = None
