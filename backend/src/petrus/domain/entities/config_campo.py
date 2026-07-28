from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ConfigCampo:
    campo_chave: str
    label: str
    confidencial: bool = False
    visivel_card: bool = True
    visivel_ficha: bool = True
