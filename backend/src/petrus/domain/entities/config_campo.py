from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass
class ConfigCampo:
    id: UUID
    campo_chave: str
    label: str
    confidencial: bool = False
    visivel_card: bool = True
    visivel_ficha: bool = True
