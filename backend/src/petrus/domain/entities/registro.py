from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class RegistroArquivo:
    id: UUID
    registro_id: UUID
    tipo: str = "foto"
    storage_path: str = ""
    nome: str | None = None
    content_type: str | None = None
    ordem: int = 0
    created_at: str | None = None


@dataclass
class Registro:
    id: UUID
    texto: str | None = None
    status: str = "novo"
    metadata: dict = field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None
    arquivos: list[RegistroArquivo] = field(default_factory=list)
